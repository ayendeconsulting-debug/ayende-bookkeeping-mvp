import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThanOrEqual } from 'typeorm';
import { Job } from 'bullmq';
import { Invoice, InvoiceStatus } from '../entities/invoice.entity';
import { InvoiceLineItem } from '../entities/invoice-line-item.entity';
import { EmailService } from '../email/email.service';
import { BusinessesService } from '../businesses/businesses.service';
import { ExpoPushService } from '../notifications/expo-push.service';

export const INVOICE_REMINDER_QUEUE = 'invoice-reminder';

@Processor(INVOICE_REMINDER_QUEUE)
export class InvoiceReminderProcessor extends WorkerHost {
  private readonly logger = new Logger(InvoiceReminderProcessor.name);

  constructor(
    @InjectRepository(Invoice)
    private readonly invoiceRepo: Repository<Invoice>,
    @InjectRepository(InvoiceLineItem)
    private readonly lineItemRepo: Repository<InvoiceLineItem>,
    private readonly emailService: EmailService,
    private readonly businessesService: BusinessesService,
    private readonly expoPushService: ExpoPushService,
  ) { super(); }

  async process(_job: Job): Promise<void> {
    this.logger.log('Invoice reminder CRON starting');
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    await Promise.all([
      this.generateRecurringInvoices(today),
      this.sendPaymentReminders(today),
    ]);

    this.logger.log('Invoice reminder CRON complete');
  }

  // -- Generate recurring invoices ----------------------------------------

  private async generateRecurringInvoices(today: Date): Promise<void> {
    const due = await this.invoiceRepo.find({
      where: {
        is_recurring: true,
        recurring_next_date: LessThanOrEqual(today),
      },
      relations: ['lineItems'],
    });

    this.logger.log(`Recurring invoices due: ${due.length}`);

    for (const template of due) {
      try {
        await this.generateFromTemplate(template, today);
      } catch (err) {
        this.logger.error(`Failed to generate recurring invoice from ${template.id}: ${(err as Error).message}`);
      }
    }
  }

  private async generateFromTemplate(template: Invoice, today: Date): Promise<void> {
    // Generate next invoice number
    const year = today.getFullYear();
    const prefix = `INV-${year}-`;
    const latest = await this.invoiceRepo
      .createQueryBuilder('inv')
      .where('inv.business_id = :bId', { bId: template.business_id })
      .andWhere('inv.invoice_number LIKE :prefix', { prefix: `${prefix}%` })
      .orderBy('inv.invoice_number', 'DESC')
      .getOne();

    const seq = latest
      ? parseInt(latest.invoice_number.replace(prefix, ''), 10) + 1
      : 1;
    const invoiceNumber = `${prefix}${String(seq).padStart(3, '0')}`;

    // Calculate issue/due dates
    const issueDate = new Date(today);
    const dueDate   = new Date(today);
    dueDate.setDate(dueDate.getDate() + 30);

    // Create new invoice (not recurring itself -- it's an instance)
    const newInvoice = this.invoiceRepo.create({
      business_id:        template.business_id,
      invoice_number:     invoiceNumber,
      client_name:        template.client_name,
      client_email:       template.client_email,
      issue_date:         issueDate,
      due_date:           dueDate,
      status:             template.auto_send ? InvoiceStatus.SENT : InvoiceStatus.DRAFT,
      subtotal:           template.subtotal,
      tax_amount:         template.tax_amount,
      total:              template.total,
      amount_paid:        0,
      balance_due:        template.total,
      notes:              template.notes,
      is_recurring:       false,
      auto_send:          false,
      stripe_payment_link: template.stripe_payment_link,
    });

    const saved = await this.invoiceRepo.save(newInvoice);

    // Copy line items
    if (template.lineItems?.length) {
      const items = template.lineItems.map((li) =>
        this.lineItemRepo.create({
          invoice_id:  saved.id,
          description: li.description,
          quantity:    li.quantity,
          unit_price:  li.unit_price,
          line_total:  li.line_total,
          sort_order:  li.sort_order,
        }),
      );
      await this.lineItemRepo.save(items);
    }

    // Advance the template's next_date
    const next = this.advanceDate(new Date(template.recurring_next_date!), template.recurring_frequency!);
    await this.invoiceRepo.update(template.id, { recurring_next_date: next });

    this.logger.log(`Generated recurring invoice ${invoiceNumber} for business ${template.business_id}`);

    // Auto-send if enabled
    if (template.auto_send && template.client_email) {
      await this.sendInvoiceEmail(saved, template.lineItems ?? [], false);
    }
  }

  // -- Send payment reminders ---------------------------------------------

  private async sendPaymentReminders(today: Date): Promise<void> {
    // 3 days before due
    const threeDaysOut = new Date(today);
    threeDaysOut.setDate(threeDaysOut.getDate() + 3);

    const upcoming = await this.invoiceRepo.find({
      where: {
        due_date: threeDaysOut as any,
        status: InvoiceStatus.SENT,
      },
      relations: ['lineItems'],
    });

    for (const invoice of upcoming) {
      if (!invoice.client_email) continue;
      try {
        await this.sendReminderEmail(invoice, invoice.lineItems ?? [], 3, false);
        this.logger.log(`Sent 3-day reminder for invoice ${invoice.invoice_number}`);
      } catch (err) {
        this.logger.error(`Reminder failed for ${invoice.id}: ${(err as Error).message}`);
      }
    }

    // Overdue (due_date < today and not paid)
    const overdue = await this.invoiceRepo
      .createQueryBuilder('inv')
      .where('inv.due_date < :today', { today })
      .andWhere('inv.status NOT IN (:...statuses)', {
        statuses: [InvoiceStatus.PAID, InvoiceStatus.VOID, InvoiceStatus.DRAFT],
      })
      .leftJoinAndSelect('inv.lineItems', 'li')
      .getMany();

    for (const invoice of overdue) {
      if (!invoice.client_email) continue;
      // Update status to overdue
      if (invoice.status !== InvoiceStatus.OVERDUE) {
        await this.invoiceRepo.update(invoice.id, { status: InvoiceStatus.OVERDUE });
      }
      try {
        await this.sendReminderEmail(invoice, invoice.lineItems ?? [], 0, true);
        this.logger.log(`Sent overdue notice for invoice ${invoice.invoice_number}`);

        // === Push: notify the business OWNER (not the customer) ============
        // The email above goes to invoice.client_email (the customer being
        // chased). The push below goes to business.expo_push_token (the
        // OWNER being informed their invoice is overdue). Two different
        // humans -- do not conflate in future changes.
        try {
          const business = await this.businessesService.findById(invoice.business_id);
          if (business.expo_push_token) {
            void this.expoPushService.send([{
              to: business.expo_push_token,
              title: 'Tempo Books',
              body: `Invoice ${invoice.invoice_number} is overdue.`,
              data: { type: 'invoice_overdue', invoiceId: invoice.id },
              sound: 'default',
              _businessId: business.id,
            }]);
          }
        } catch (pushErr: any) {
          this.logger.warn(
            `Push for overdue invoice ${invoice.id} skipped: ${pushErr?.message ?? pushErr}`,
          );
        }
        // =====================================================================
      } catch (err) {
        this.logger.error(`Overdue notice failed for ${invoice.id}: ${(err as Error).message}`);
      }
    }
  }

  // -- Email helpers -------------------------------------------------------

  private async sendInvoiceEmail(invoice: Invoice, lineItems: InvoiceLineItem[], isReminder: boolean): Promise<void> {
    if (!invoice.client_email) return;
    await this.emailService.sendInvoice(invoice.client_email, {
      clientName:        invoice.client_name,
      businessName:      'Tempo Books User',
      invoiceNumber:     invoice.invoice_number,
      issueDate:         new Date(invoice.issue_date).toLocaleDateString('en-CA'),
      dueDate:           new Date(invoice.due_date).toLocaleDateString('en-CA'),
      total:             `$${Number(invoice.total).toFixed(2)}`,
      lineItems:         lineItems.map((li) => ({
        description: li.description,
        quantity:    Number(li.quantity),
        unit_price:  Number(li.unit_price),
        line_total:  Number(li.line_total),
      })),
      notes:             invoice.notes,
      stripePaymentLink: invoice.stripe_payment_link,
      isReminder,
    });
  }

  private async sendReminderEmail(invoice: Invoice, lineItems: InvoiceLineItem[], daysUntilDue: number, isOverdue: boolean): Promise<void> {
    if (!invoice.client_email) return;
    await this.emailService.sendInvoice(invoice.client_email, {
      clientName:        invoice.client_name,
      businessName:      'Tempo Books User',
      invoiceNumber:     invoice.invoice_number,
      issueDate:         new Date(invoice.issue_date).toLocaleDateString('en-CA'),
      dueDate:           new Date(invoice.due_date).toLocaleDateString('en-CA'),
      total:             `$${Number(invoice.total).toFixed(2)}`,
      lineItems:         lineItems.map((li) => ({
        description: li.description,
        quantity:    Number(li.quantity),
        unit_price:  Number(li.unit_price),
        line_total:  Number(li.line_total),
      })),
      notes:             invoice.notes,
      stripePaymentLink: invoice.stripe_payment_link,
      isReminder:        !isOverdue,
      isOverdue,
      daysUntilDue,
    });
  }

  private advanceDate(date: Date, frequency: string): Date {
    const next = new Date(date);
    switch (frequency) {
      case 'weekly':    next.setDate(next.getDate() + 7); break;
      case 'monthly':   next.setMonth(next.getMonth() + 1); break;
      case 'quarterly': next.setMonth(next.getMonth() + 3); break;
    }
    return next;
  }
}
