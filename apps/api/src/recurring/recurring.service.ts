import {
  Injectable,
  NotFoundException,
  BadRequestException,
  OnModuleInit,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { Repository, DataSource, LessThanOrEqual } from 'typeorm';
import {
  RecurringTransaction,
  RecurringFrequency,
  RecurringStatus,
} from '../entities/recurring-transaction.entity';
import { JournalEntry, JournalEntryStatus } from '../entities/journal-entry.entity';
import { JournalLine } from '../entities/journal-line.entity';
import { CreateRecurringDto, UpdateRecurringDto } from './dto/recurring.dto';

@Injectable()
export class RecurringService implements OnModuleInit {
  private readonly logger = new Logger(RecurringService.name);

  constructor(
    @InjectRepository(RecurringTransaction)
    private readonly recurringRepo: Repository<RecurringTransaction>,
    @InjectRepository(JournalEntry)
    private readonly journalEntryRepo: Repository<JournalEntry>,
    @InjectRepository(JournalLine)
    private readonly journalLineRepo: Repository<JournalLine>,
    @InjectQueue('recurring-transactions')
    private readonly recurringQueue: Queue,
    private readonly dataSource: DataSource,
  ) {}

  // ── Schedule daily job on startup ─────────────────────────────────────────

  async onModuleInit() {
    try {
      // Remove any existing repeatable jobs to avoid duplicates on restart
      const repeatables = await this.recurringQueue.getRepeatableJobs();
      for (const job of repeatables) {
        await this.recurringQueue.removeRepeatableByKey(job.key);
      }

      // Schedule daily midnight check
      await this.recurringQueue.add(
        'process-due',
        {},
        {
          repeat: { pattern: '0 0 * * *' }, // daily at midnight
          removeOnComplete: 10,
          removeOnFail: 20,
        },
      );

      this.logger.log('Recurring transactions daily job scheduled');
    } catch (err) {
      this.logger.warn('Could not schedule recurring job (Redis may be unavailable):', err.message);
    }
  }

  // ── CRUD ──────────────────────────────────────────────────────────────────

  async create(businessId: string, dto: CreateRecurringDto): Promise<RecurringTransaction> {
    const startDate = new Date(dto.start_date);
    const nextRunDate = this.calculateNextRunDate(startDate, dto.frequency as RecurringFrequency, true);

    const template = this.recurringRepo.create({
      business_id: businessId,
      description: dto.description,
      amount: dto.amount,
      currency_code: dto.currency_code ?? 'CAD',
      debit_account_id: dto.debit_account_id,
      credit_account_id: dto.credit_account_id,
      frequency: dto.frequency as RecurringFrequency,
      start_date: startDate,
      end_date: dto.end_date ? new Date(dto.end_date) : null,
      next_run_date: nextRunDate,
      status: RecurringStatus.ACTIVE,
      is_personal: dto.is_personal ?? false,
      notes: dto.notes ?? null,
    });

    return this.recurringRepo.save(template);
  }

  async findAll(businessId: string): Promise<RecurringTransaction[]> {
    return this.recurringRepo.find({
      where: { business_id: businessId },
      order: { created_at: 'DESC' },
    });
  }

  async findOne(businessId: string, id: string): Promise<RecurringTransaction> {
    const template = await this.recurringRepo.findOne({
      where: { id, business_id: businessId },
    });
    if (!template) throw new NotFoundException(`Recurring template ${id} not found`);
    return template;
  }

  async update(businessId: string, id: string, dto: UpdateRecurringDto): Promise<RecurringTransaction> {
    const template = await this.findOne(businessId, id);

    if (dto.description !== undefined) template.description = dto.description;
    if (dto.amount !== undefined) template.amount = dto.amount;
    if (dto.end_date !== undefined) template.end_date = dto.end_date ? new Date(dto.end_date) : null;
    if (dto.is_personal !== undefined) template.is_personal = dto.is_personal;
    if (dto.notes !== undefined) template.notes = dto.notes ?? null;

    return this.recurringRepo.save(template);
  }

  async pause(businessId: string, id: string): Promise<RecurringTransaction> {
    const template = await this.findOne(businessId, id);
    if (template.status !== RecurringStatus.ACTIVE) {
      throw new BadRequestException('Only active templates can be paused.');
    }
    template.status = RecurringStatus.PAUSED;
    return this.recurringRepo.save(template);
  }

  async resume(businessId: string, id: string): Promise<RecurringTransaction> {
    const template = await this.findOne(businessId, id);
    if (template.status !== RecurringStatus.PAUSED) {
      throw new BadRequestException('Only paused templates can be resumed.');
    }
    template.status = RecurringStatus.ACTIVE;
    return this.recurringRepo.save(template);
  }

  async cancel(businessId: string, id: string): Promise<RecurringTransaction> {
    const template = await this.findOne(businessId, id);
    if (template.status === RecurringStatus.CANCELLED) {
      throw new BadRequestException('Template is already cancelled.');
    }
    template.status = RecurringStatus.CANCELLED;
    return this.recurringRepo.save(template);
  }

  // ── Process Due Templates (called by BullMQ processor) ───────────────────

  async processDueTemplates(): Promise<{ processed: number; failed: number }> {
    const today = new Date();
    today.setHours(23, 59, 59, 999);

    const dueTemplates = await this.recurringRepo.find({
      where: {
        status: RecurringStatus.ACTIVE,
        next_run_date: LessThanOrEqual(today),
      },
    });

    let processed = 0;
    let failed = 0;

    for (const template of dueTemplates) {
      try {
        await this.postRecurringEntry(template);
        processed++;
      } catch (err) {
        this.logger.error(`Failed to post recurring ${template.id}: ${err.message}`);
        failed++;
      }
    }

    this.logger.log(`Recurring processing complete: ${processed} posted, ${failed} failed`);
    return { processed, failed };
  }

  // ── Post a single recurring entry ─────────────────────────────────────────

  private async postRecurringEntry(template: RecurringTransaction): Promise<void> {
    await this.dataSource.transaction(async (manager) => {
      const entryDate = new Date(template.next_run_date!);

      const entry = manager.create(JournalEntry, {
        business_id: template.business_id,
        entry_date: entryDate,
        description: template.description,
        reference_type: 'recurring_transaction',
        reference_id: template.id,
        status: JournalEntryStatus.POSTED,
        created_by: 'system',
        posted_by: 'system',
        posted_at: new Date(),
        notes: `Auto-posted by recurring template — ${template.frequency}`,
      });
      const savedEntry = await manager.save(JournalEntry, entry) as JournalEntry;

      await manager.save(JournalLine, [
        manager.create(JournalLine, {
          business_id: template.business_id,
          journal_entry_id: savedEntry.id,
          line_number: 1,
          account_id: template.debit_account_id,
          debit_amount: Number(template.amount),
          credit_amount: 0,
          description: template.description,
          is_tax_line: false,
        }),
        manager.create(JournalLine, {
          business_id: template.business_id,
          journal_entry_id: savedEntry.id,
          line_number: 2,
          account_id: template.credit_account_id,
          debit_amount: 0,
          credit_amount: Number(template.amount),
          description: template.description,
          is_tax_line: false,
        }),
      ]);

      // Advance next_run_date
      const nextRun = this.calculateNextRunDate(
        new Date(template.next_run_date!),
        template.frequency,
      );

      // Check if we've passed the end_date
      const isExpired =
        template.end_date !== null &&
        nextRun > new Date(template.end_date);

      await manager.update(RecurringTransaction, template.id, {
        next_run_date: isExpired ? null : nextRun,
        last_posted_at: new Date(),
        status: isExpired ? RecurringStatus.COMPLETED : RecurringStatus.ACTIVE,
      });
    });
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  private calculateNextRunDate(
    from: Date,
    frequency: RecurringFrequency,
    isFirstRun = false,
  ): Date {
    // On first run, if start_date is today or in the past, use it as next_run_date
    if (isFirstRun) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const startDay = new Date(from);
      startDay.setHours(0, 0, 0, 0);
      if (startDay >= today) return from;
    }

    const next = new Date(from);
    switch (frequency) {
      case RecurringFrequency.DAILY:
        next.setDate(next.getDate() + 1);
        break;
      case RecurringFrequency.WEEKLY:
        next.setDate(next.getDate() + 7);
        break;
      case RecurringFrequency.MONTHLY:
        next.setMonth(next.getMonth() + 1);
        break;
      case RecurringFrequency.QUARTERLY:
        next.setMonth(next.getMonth() + 3);
        break;
      case RecurringFrequency.ANNUALLY:
        next.setFullYear(next.getFullYear() + 1);
        break;
    }
    return next;
  }
}
