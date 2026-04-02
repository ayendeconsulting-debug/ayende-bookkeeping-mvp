import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, ILike } from 'typeorm';
import { Invoice, InvoiceStatus } from '../entities/invoice.entity';
import { InvoiceLineItem } from '../entities/invoice-line-item.entity';
import { Account } from '../entities/account.entity';
import { TaxCode } from '../entities/tax-code.entity';
import { JournalEntry, JournalEntryStatus } from '../entities/journal-entry.entity';
import { JournalLine } from '../entities/journal-line.entity';
import {
  CreateInvoiceDto,
  UpdateInvoiceDto,
  RecordPaymentDto,
} from './dto/invoice.dto';

@Injectable()
export class InvoiceService {
  constructor(
    @InjectRepository(Invoice)
    private readonly invoiceRepo: Repository<Invoice>,
    @InjectRepository(InvoiceLineItem)
    private readonly lineItemRepo: Repository<InvoiceLineItem>,
    @InjectRepository(Account)
    private readonly accountRepo: Repository<Account>,
    @InjectRepository(TaxCode)
    private readonly taxCodeRepo: Repository<TaxCode>,
    @InjectRepository(JournalEntry)
    private readonly journalEntryRepo: Repository<JournalEntry>,
    @InjectRepository(JournalLine)
    private readonly journalLineRepo: Repository<JournalLine>,
    private readonly dataSource: DataSource,
  ) {}

  // ── Create ────────────────────────────────────────────────────────────────

  async create(businessId: string, userId: string, dto: CreateInvoiceDto): Promise<Invoice> {
    const invoiceNumber = dto.invoice_number || await this.generateInvoiceNumber(businessId);

    // Calculate totals from line items
    const { subtotal, taxAmount, total, lineItemData } = await this.calculateTotals(
      businessId,
      dto.line_items,
    );

    return this.dataSource.transaction(async (manager) => {
      const invoice = manager.create(Invoice, {
        business_id: businessId,
        invoice_number: invoiceNumber,
        client_name: dto.client_name,
        client_email: dto.client_email,
        issue_date: new Date(dto.issue_date),
        due_date: new Date(dto.due_date),
        status: InvoiceStatus.DRAFT,
        subtotal,
        tax_amount: taxAmount,
        total,
        amount_paid: 0,
        balance_due: total,
        notes: dto.notes,
      });

      const saved = await manager.save(Invoice, invoice) as Invoice;

      // Save line items
      const lines = lineItemData.map((item, idx) =>
        manager.create(InvoiceLineItem, {
          invoice_id: saved.id,
          description: item.description,
          quantity: item.quantity,
          unit_price: item.unit_price,
          tax_code_id: item.tax_code_id ?? null,
          line_total: item.line_total,
          sort_order: item.sort_order ?? idx,
        }),
      );
      await manager.save(InvoiceLineItem, lines);

      return this.findOne(businessId, saved.id);
    });
  }

  // ── List ──────────────────────────────────────────────────────────────────

  async findAll(
    businessId: string,
    filters: { status?: string; search?: string; limit?: number; offset?: number },
  ): Promise<{ data: Invoice[]; total: number }> {
    const { status, search, limit = 20, offset = 0 } = filters;
    const where: any = { business_id: businessId };

    if (status && status !== 'all') {
      where.status = status as InvoiceStatus;
    }
    if (search) {
      where.client_name = ILike(`%${search}%`);
    }

    const [data, total] = await this.invoiceRepo.findAndCount({
      where,
      relations: ['lineItems'],
      order: { created_at: 'DESC' },
      take: Math.min(limit, 100),
      skip: offset,
    });

    return { data, total };
  }

  // ── Get One ───────────────────────────────────────────────────────────────

  async findOne(businessId: string, id: string): Promise<Invoice> {
    const invoice = await this.invoiceRepo.findOne({
      where: { id, business_id: businessId },
      relations: ['lineItems', 'lineItems.taxCode'],
    });
    if (!invoice) throw new NotFoundException(`Invoice ${id} not found`);
    return invoice;
  }

  // ── Update (draft only) ───────────────────────────────────────────────────

  async update(businessId: string, id: string, dto: UpdateInvoiceDto): Promise<Invoice> {
    const invoice = await this.findOne(businessId, id);

    if (invoice.status !== InvoiceStatus.DRAFT) {
      throw new BadRequestException('Only draft invoices can be edited.');
    }

    return this.dataSource.transaction(async (manager) => {
      // Update header fields
      if (dto.client_name) invoice.client_name = dto.client_name;
      if (dto.client_email !== undefined) invoice.client_email = dto.client_email ?? null;
      if (dto.issue_date) invoice.issue_date = new Date(dto.issue_date);
      if (dto.due_date) invoice.due_date = new Date(dto.due_date);
      if (dto.notes !== undefined) invoice.notes = dto.notes ?? null;

      // Recalculate if line items provided
      if (dto.line_items) {
        await manager.delete(InvoiceLineItem, { invoice_id: id });

        const { subtotal, taxAmount, total, lineItemData } = await this.calculateTotals(
          businessId,
          dto.line_items,
        );

        invoice.subtotal = subtotal;
        invoice.tax_amount = taxAmount;
        invoice.total = total;
        invoice.balance_due = total - Number(invoice.amount_paid);

        const lines = lineItemData.map((item, idx) =>
          manager.create(InvoiceLineItem, {
            invoice_id: id,
            description: item.description,
            quantity: item.quantity,
            unit_price: item.unit_price,
            tax_code_id: item.tax_code_id ?? null,
            line_total: item.line_total,
            sort_order: item.sort_order ?? idx,
          }),
        );
        await manager.save(InvoiceLineItem, lines);
      }

      await manager.save(Invoice, invoice);
      return this.findOne(businessId, id);
    });
  }

  // ── Send ──────────────────────────────────────────────────────────────────

  async markAsSent(businessId: string, id: string): Promise<Invoice> {
    const invoice = await this.findOne(businessId, id);

    if (invoice.status !== InvoiceStatus.DRAFT) {
      throw new BadRequestException('Only draft invoices can be sent.');
    }

    invoice.status = InvoiceStatus.SENT;
    await this.invoiceRepo.save(invoice);
    return invoice;
  }

  // ── Record Payment ────────────────────────────────────────────────────────

  async recordPayment(
    businessId: string,
    id: string,
    dto: RecordPaymentDto,
    userId: string,
  ): Promise<Invoice> {
    const invoice = await this.findOne(businessId, id);

    const payableStatuses: InvoiceStatus[] = [
      InvoiceStatus.SENT,
      InvoiceStatus.VIEWED,
      InvoiceStatus.PARTIALLY_PAID,
      InvoiceStatus.OVERDUE,
    ];

    if (!payableStatuses.includes(invoice.status)) {
      throw new BadRequestException(
        `Cannot record payment on a ${invoice.status} invoice.`,
      );
    }

    const currentBalanceDue = Number(invoice.balance_due);
    if (dto.amount > currentBalanceDue + 0.01) {
      throw new BadRequestException(
        `Payment amount $${dto.amount} exceeds balance due $${currentBalanceDue}.`,
      );
    }

    return this.dataSource.transaction(async (manager) => {
      // Create journal entry: Debit bank, Credit revenue
      const entry = manager.create(JournalEntry, {
        business_id: businessId,
        entry_date: new Date(dto.payment_date),
        description: `Payment received — ${invoice.invoice_number} (${invoice.client_name})`,
        reference_type: 'invoice_payment',
        reference_id: invoice.id,
        status: JournalEntryStatus.POSTED,
        created_by: userId,
        posted_by: userId,
        posted_at: new Date(),
        notes: dto.notes,
      });
      const savedEntry = await manager.save(JournalEntry, entry) as JournalEntry;

      await manager.save(JournalLine, [
        manager.create(JournalLine, {
          business_id: businessId,
          journal_entry_id: savedEntry.id,
          line_number: 1,
          account_id: dto.bank_account_id,
          debit_amount: dto.amount,
          credit_amount: 0,
          description: `${invoice.invoice_number} — ${invoice.client_name}`,
          is_tax_line: false,
        }),
        manager.create(JournalLine, {
          business_id: businessId,
          journal_entry_id: savedEntry.id,
          line_number: 2,
          account_id: dto.revenue_account_id,
          debit_amount: 0,
          credit_amount: dto.amount,
          description: `${invoice.invoice_number} — ${invoice.client_name}`,
          is_tax_line: false,
        }),
      ]);

      // Update invoice payment state
      const newAmountPaid = parseFloat((Number(invoice.amount_paid) + dto.amount).toFixed(2));
      const newBalanceDue = parseFloat((Number(invoice.total) - newAmountPaid).toFixed(2));

      invoice.amount_paid = newAmountPaid;
      invoice.balance_due = newBalanceDue;
      invoice.linked_journal_entry_id = savedEntry.id;
      invoice.status = newBalanceDue <= 0 ? InvoiceStatus.PAID : InvoiceStatus.PARTIALLY_PAID;

      await manager.save(Invoice, invoice);
      return invoice;
    });
  }

  // ── Void ──────────────────────────────────────────────────────────────────

  async voidInvoice(businessId: string, id: string): Promise<Invoice> {
    const invoice = await this.findOne(businessId, id);

    if (invoice.status === InvoiceStatus.PAID) {
      throw new BadRequestException('Cannot void a paid invoice.');
    }
    if (invoice.status === InvoiceStatus.VOID) {
      throw new BadRequestException('Invoice is already void.');
    }

    invoice.status = InvoiceStatus.VOID;
    await this.invoiceRepo.save(invoice);
    return invoice;
  }

  // ── PDF Generation ────────────────────────────────────────────────────────

  async generatePdf(businessId: string, id: string): Promise<Buffer> {
    const invoice = await this.findOne(businessId, id);

    const PDFDocument = require('pdfkit') as typeof import('pdfkit');
    const doc = new PDFDocument({ margin: 50, size: 'A4' });
    const chunks: Buffer[] = [];

    doc.on('data', (chunk: Buffer) => chunks.push(chunk));

    await new Promise<void>((resolve) => {
      doc.on('end', resolve);

      const teal = '#0F6E56';
      const gray = '#6B7280';
      const dark = '#111827';

      // ── Header ──
      doc.fontSize(24).fillColor(teal).text('INVOICE', 50, 50);
      doc
        .fontSize(10)
        .fillColor(gray)
        .text(`Invoice #: ${invoice.invoice_number}`, 50, 90)
        .text(
          `Issue Date: ${new Date(invoice.issue_date).toLocaleDateString('en-CA')}`,
          50,
          105,
        )
        .text(
          `Due Date: ${new Date(invoice.due_date).toLocaleDateString('en-CA')}`,
          50,
          120,
        );

      // Status badge
      const statusColor =
        invoice.status === InvoiceStatus.PAID
          ? teal
          : invoice.status === InvoiceStatus.OVERDUE
          ? '#DC2626'
          : gray;
      doc
        .fontSize(10)
        .fillColor(statusColor)
        .text(invoice.status.toUpperCase().replace('_', ' '), 400, 90);

      // ── Bill To ──
      doc
        .fontSize(10)
        .fillColor(gray)
        .text('BILL TO', 50, 155);
      doc
        .fontSize(11)
        .fillColor(dark)
        .text(invoice.client_name, 50, 170);
      if (invoice.client_email) {
        doc.fontSize(10).fillColor(gray).text(invoice.client_email, 50, 185);
      }

      // ── Line Items Table ──
      const tableTop = invoice.client_email ? 220 : 205;
      const col = { desc: 50, qty: 300, price: 370, total: 450 };

      // Table header
      doc
        .fontSize(9)
        .fillColor(gray)
        .text('DESCRIPTION', col.desc, tableTop)
        .text('QTY', col.qty, tableTop)
        .text('UNIT PRICE', col.price, tableTop)
        .text('TOTAL', col.total, tableTop);

      doc
        .moveTo(50, tableTop + 14)
        .lineTo(545, tableTop + 14)
        .strokeColor('#E5E7EB')
        .stroke();

      let y = tableTop + 22;
      const lineItems = invoice.lineItems ?? [];

      for (const item of lineItems) {
        doc
          .fontSize(10)
          .fillColor(dark)
          .text(item.description, col.desc, y, { width: 240 })
          .text(Number(item.quantity).toFixed(2), col.qty, y)
          .text(`$${Number(item.unit_price).toFixed(2)}`, col.price, y)
          .text(`$${Number(item.line_total).toFixed(2)}`, col.total, y);

        if (item.taxCode) {
          y += 14;
          doc
            .fontSize(8)
            .fillColor(gray)
            .text(`  Tax: ${item.taxCode.code} (${(Number(item.taxCode.rate) * 100).toFixed(0)}%)`, col.desc + 10, y);
        }

        y += 20;
        doc
          .moveTo(50, y - 4)
          .lineTo(545, y - 4)
          .strokeColor('#F3F4F6')
          .stroke();
      }

      // ── Totals ──
      const totalsY = y + 10;
      doc
        .fontSize(10)
        .fillColor(gray)
        .text('Subtotal', 380, totalsY)
        .fillColor(dark)
        .text(`$${Number(invoice.subtotal).toFixed(2)}`, col.total, totalsY);

      if (Number(invoice.tax_amount) > 0) {
        doc
          .fontSize(10)
          .fillColor(gray)
          .text('Tax', 380, totalsY + 16)
          .fillColor(dark)
          .text(`$${Number(invoice.tax_amount).toFixed(2)}`, col.total, totalsY + 16);
      }

      const totalY = totalsY + (Number(invoice.tax_amount) > 0 ? 36 : 20);
      doc
        .moveTo(380, totalY - 4)
        .lineTo(545, totalY - 4)
        .strokeColor('#E5E7EB')
        .stroke();
      doc
        .fontSize(12)
        .fillColor(teal)
        .text('TOTAL', 380, totalY)
        .fillColor(dark)
        .text(`$${Number(invoice.total).toFixed(2)}`, col.total, totalY);

      if (Number(invoice.amount_paid) > 0) {
        doc
          .fontSize(10)
          .fillColor(gray)
          .text('Amount Paid', 380, totalY + 20)
          .fillColor('#16A34A')
          .text(`-$${Number(invoice.amount_paid).toFixed(2)}`, col.total, totalY + 20);
        doc
          .fontSize(11)
          .fillColor(teal)
          .text('Balance Due', 380, totalY + 38)
          .fillColor(dark)
          .text(`$${Number(invoice.balance_due).toFixed(2)}`, col.total, totalY + 38);
      }

      // ── Notes ──
      if (invoice.notes) {
        doc
          .fontSize(9)
          .fillColor(gray)
          .text('NOTES', 50, totalY + 70)
          .fontSize(10)
          .fillColor(dark)
          .text(invoice.notes, 50, totalY + 84, { width: 400 });
      }

      doc.end();
    });

    return Buffer.concat(chunks);
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  private async generateInvoiceNumber(businessId: string): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = `INV-${year}-`;

    const latest = await this.invoiceRepo
      .createQueryBuilder('i')
      .where('i.business_id = :businessId', { businessId })
      .andWhere('i.invoice_number LIKE :prefix', { prefix: `${prefix}%` })
      .orderBy('i.invoice_number', 'DESC')
      .getOne();

    if (!latest) return `${prefix}001`;

    const lastSeq = parseInt(latest.invoice_number.split('-')[2] ?? '0', 10);
    const nextSeq = String(lastSeq + 1).padStart(3, '0');
    return `${prefix}${nextSeq}`;
  }

  private async calculateTotals(
    businessId: string,
    lineItems: Array<{
      description: string;
      quantity: number;
      unit_price: number;
      tax_code_id?: string;
      sort_order?: number;
    }>,
  ) {
    let subtotal = 0;
    let taxAmount = 0;

    const lineItemData = await Promise.all(
      lineItems.map(async (item) => {
        const lineTotal = parseFloat((item.quantity * item.unit_price).toFixed(2));
        subtotal += lineTotal;

        if (item.tax_code_id) {
          const taxCode = await this.taxCodeRepo.findOne({
            where: { id: item.tax_code_id, business_id: businessId },
          });
          if (taxCode) {
            taxAmount += parseFloat((lineTotal * Number(taxCode.rate)).toFixed(2));
          }
        }

        return { ...item, line_total: lineTotal };
      }),
    );

    subtotal = parseFloat(subtotal.toFixed(2));
    taxAmount = parseFloat(taxAmount.toFixed(2));
    const total = parseFloat((subtotal + taxAmount).toFixed(2));

    return { subtotal, taxAmount, total, lineItemData };
  }
}
