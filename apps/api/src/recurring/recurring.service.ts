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
import { Repository, DataSource, LessThanOrEqual, MoreThanOrEqual } from 'typeorm';
import {
  RecurringTransaction,
  RecurringFrequency,
  RecurringStatus,
} from '../entities/recurring-transaction.entity';
import { JournalEntry, JournalEntryStatus } from '../entities/journal-entry.entity';
import { JournalLine } from '../entities/journal-line.entity';
import { Account, AccountSubtype } from '../entities/account.entity';
import { RawTransaction, RawTransactionSource, RawTransactionStatus } from '../entities/raw-transaction.entity';
import { Business } from '../entities/business.entity';
import { CreateRecurringDto, UpdateRecurringDto } from './dto/recurring.dto';

// ── Phase 12: Detection types ──────────────────────────────────────────────────

export interface DetectionCandidate {
  key: string;
  description: string;
  averageAmount: number;
  frequency: 'weekly' | 'monthly' | 'quarterly' | 'annually';
  occurrences: number;
  nextEstimatedDate: string;
}

interface ConfirmDetectionDto {
  key: string;
  description: string;
  amount: number;
  frequency: 'weekly' | 'monthly' | 'quarterly' | 'annually';
  debitAccountId: string;
  creditAccountId: string;
  isPersonal?: boolean;
  businessRatio?: number;
}

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
    @InjectRepository(Account)
    private readonly accountRepo: Repository<Account>,
    @InjectRepository(RawTransaction)
    private readonly rawTxRepo: Repository<RawTransaction>,
    @InjectRepository(Business)
    private readonly businessRepo: Repository<Business>,
    @InjectQueue('recurring-transactions')
    private readonly recurringQueue: Queue,
    private readonly dataSource: DataSource,
  ) {}

  // ── Schedule daily job on startup ──────────────────────────────────────────

  async onModuleInit() {
    try {
      const repeatables = await this.recurringQueue.getRepeatableJobs();
      for (const job of repeatables) {
        await this.recurringQueue.removeRepeatableByKey(job.key);
      }
      await this.recurringQueue.add(
        'process-due',
        {},
        {
          repeat: { pattern: '0 0 * * *' },
          removeOnComplete: 10,
          removeOnFail: 20,
        },
      );
      this.logger.log('Recurring transactions daily job scheduled');
    } catch (err: any) {
      this.logger.warn('Could not schedule recurring job (Redis may be unavailable):', err.message);
    }
  }

  // ── CRUD ───────────────────────────────────────────────────────────────────

  async create(businessId: string, dto: CreateRecurringDto): Promise<RecurringTransaction> {
    const startDate = new Date(dto.start_date);
    const nextRunDate = this.calculateNextRunDate(startDate, dto.frequency as RecurringFrequency, true);

    const isPersonal = dto.is_personal ?? false;
    const businessRatio = dto.business_ratio ?? (isPersonal ? 0.0 : 1.0);

    const template = this.recurringRepo.create({
      business_id: businessId,
      description: dto.description,
      amount: dto.amount,
      currency_code: dto.currency_code ?? 'CAD',
      debit_account_id: isPersonal ? null : dto.debit_account_id,
      credit_account_id: isPersonal ? null : dto.credit_account_id,
      frequency: dto.frequency as RecurringFrequency,
      start_date: startDate,
      end_date: dto.end_date ? new Date(dto.end_date) : null,
      next_run_date: nextRunDate,
      status: RecurringStatus.ACTIVE,
      is_personal: isPersonal,
      business_ratio: businessRatio,
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
    if (dto.business_ratio !== undefined) template.business_ratio = dto.business_ratio;
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

  // ── Process Due Templates (called by BullMQ processor) ────────────────────

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
      } catch (err: any) {
        this.logger.error(`Failed to post recurring ${template.id}: ${err.message}`);
        failed++;
      }
    }

    this.logger.log(`Recurring processing complete: ${processed} posted, ${failed} failed`);
    return { processed, failed };
  }

  // ── Phase 12: Pattern Detection ────────────────────────────────────────────

  async detectPatterns(businessId: string): Promise<DetectionCandidate[]> {
    const business = await this.businessRepo.findOne({ where: { id: businessId } });
    if (!business) throw new NotFoundException('Business not found');

    const settings = business.recurring_detection_settings;
    const confirmedKeys: string[] = settings?.confirmed ?? [];
    const dismissedKeys: string[] = settings?.dismissed ?? [];

    const lookbackDate = new Date();
    lookbackDate.setMonth(lookbackDate.getMonth() - 12);

    const transactions = await this.rawTxRepo.find({
      where: {
        business_id: businessId,
        source: RawTransactionSource.PLAID,
        transaction_date: MoreThanOrEqual(lookbackDate) as any,
      },
      order: { transaction_date: 'ASC' },
      take: 1000,
    });

    const outflows = transactions.filter(
      (tx) =>
        Number(tx.amount) < 0 &&
        tx.status !== RawTransactionStatus.IGNORED,
    );

    const groups = new Map<string, RawTransaction[]>();
    for (const tx of outflows) {
      const key = this.normaliseDescription(tx.description);
      if (!key) continue;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(tx);
    }

    const candidates: DetectionCandidate[] = [];

    for (const [key, txs] of groups) {
      if (txs.length < 3) continue;
      if (confirmedKeys.includes(key) || dismissedKeys.includes(key)) continue;

      const amounts = txs.map((t) => Math.abs(Number(t.amount)));
      const avgAmount = amounts.reduce((s, a) => s + a, 0) / amounts.length;

      const amountCV = this.coefficientOfVariation(amounts);
      if (amountCV > 0.15) continue;

      const dates = txs.map((t) => new Date(t.transaction_date).getTime());
      const intervals: number[] = [];
      for (let i = 1; i < dates.length; i++) {
        intervals.push((dates[i] - dates[i - 1]) / (1000 * 60 * 60 * 24));
      }

      if (intervals.length === 0) continue;

      const avgInterval = intervals.reduce((s, v) => s + v, 0) / intervals.length;

      const intervalCV = this.coefficientOfVariation(intervals);
      if (intervalCV > 0.3) continue;

      const frequency = this.classifyFrequency(avgInterval);
      if (!frequency) continue;

      const lastDate = new Date(dates[dates.length - 1]);
      const nextDate = new Date(lastDate.getTime() + avgInterval * 24 * 60 * 60 * 1000);

      candidates.push({
        key,
        description: txs[txs.length - 1].description,
        averageAmount: Math.round(avgAmount * 100) / 100,
        frequency,
        occurrences: txs.length,
        nextEstimatedDate: nextDate.toISOString().split('T')[0],
      });
    }

    return candidates;
  }

  async confirmDetection(
    businessId: string,
    dto: ConfirmDetectionDto,
  ): Promise<RecurringTransaction> {
    const business = await this.businessRepo.findOne({ where: { id: businessId } });
    if (!business) throw new NotFoundException('Business not found');

    const settings = business.recurring_detection_settings ?? { confirmed: [], dismissed: [] };
    if (!settings.confirmed.includes(dto.key)) {
      settings.confirmed.push(dto.key);
    }
    await this.businessRepo.update(businessId, { recurring_detection_settings: settings });

    const freqMap: Record<string, RecurringFrequency> = {
      weekly: RecurringFrequency.WEEKLY,
      monthly: RecurringFrequency.MONTHLY,
      quarterly: RecurringFrequency.QUARTERLY,
      annually: RecurringFrequency.ANNUALLY,
    };
    const frequency = freqMap[dto.frequency] ?? RecurringFrequency.MONTHLY;

    const isPersonal = dto.isPersonal ?? false;
    const businessRatio = dto.businessRatio ?? (isPersonal ? 0.0 : 1.0);

    const startDate = new Date();
    const nextRunDate = this.calculateNextRunDate(startDate, frequency, true);

    const template = this.recurringRepo.create({
      business_id: businessId,
      description: dto.description,
      amount: dto.amount,
      currency_code: 'CAD',
      debit_account_id: isPersonal || !dto.debitAccountId ? null : dto.debitAccountId,
      credit_account_id: isPersonal || !dto.creditAccountId ? null : dto.creditAccountId,
      frequency,
      start_date: startDate,
      end_date: null,
      next_run_date: nextRunDate,
      status: RecurringStatus.ACTIVE,
      is_personal: isPersonal,
      business_ratio: businessRatio,
      notes: `Auto-confirmed from pattern detection`,
    });

    return this.recurringRepo.save(template);
  }

  async dismissDetection(businessId: string, key: string): Promise<{ success: boolean }> {
    const business = await this.businessRepo.findOne({ where: { id: businessId } });
    if (!business) throw new NotFoundException('Business not found');

    const settings = business.recurring_detection_settings ?? { confirmed: [], dismissed: [] };
    if (!settings.dismissed.includes(key)) {
      settings.dismissed.push(key);
    }
    await this.businessRepo.update(businessId, { recurring_detection_settings: settings });

    return { success: true };
  }

  // ── Post a single recurring entry ──────────────────────────────────────────

  private async postRecurringEntry(template: RecurringTransaction): Promise<void> {
    const ratio = Number(template.business_ratio ?? 1.0);

    // Fully personal — skip entirely, just advance the next run date
    if (template.is_personal || ratio <= 0) {
      await this.advanceNextRunDate(template);
      return;
    }

    const gross = Number(template.amount);
    const isSplit = ratio < 1.0;

    if (isSplit) {
      // Look up Owner Draw account for this business
      const ownerDrawAccount = await this.accountRepo.findOne({
        where: {
          business_id: template.business_id,
          account_subtype: AccountSubtype.OWNER_DRAW,
        },
      });
      if (!ownerDrawAccount) {
        throw new Error(
          `No owner_draw equity account found for business ${template.business_id} — cannot post split recurring entry`,
        );
      }

      const businessAmount = parseFloat((gross * ratio).toFixed(2));
      const personalAmount = parseFloat((gross - businessAmount).toFixed(2));

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
          notes: `Auto-posted (split ${Math.round(ratio * 100)}% business / ${Math.round((1 - ratio) * 100)}% personal) — ${template.frequency}`,
        });
        const savedEntry = await manager.save(JournalEntry, entry) as JournalEntry;

        await manager.save(JournalLine, [
          // Business portion → debit account (expense/asset)
          manager.create(JournalLine, {
            business_id: template.business_id,
            journal_entry_id: savedEntry.id,
            line_number: 1,
            account_id: template.debit_account_id,
            debit_amount: businessAmount,
            credit_amount: 0,
            description: `${template.description} (business ${Math.round(ratio * 100)}%)`,
            is_tax_line: false,
          }),
          // Personal portion → Owner Draw (equity)
          manager.create(JournalLine, {
            business_id: template.business_id,
            journal_entry_id: savedEntry.id,
            line_number: 2,
            account_id: ownerDrawAccount.id,
            debit_amount: personalAmount,
            credit_amount: 0,
            description: `${template.description} (personal ${Math.round((1 - ratio) * 100)}%)`,
            is_tax_line: false,
          }),
          // Full amount → credit account (bank)
          manager.create(JournalLine, {
            business_id: template.business_id,
            journal_entry_id: savedEntry.id,
            line_number: 3,
            account_id: template.credit_account_id,
            debit_amount: 0,
            credit_amount: gross,
            description: template.description,
            is_tax_line: false,
          }),
        ]);

        await this.advanceNextRunDateInTransaction(manager, template);
      });
    } else {
      // 100% business — original 2-line entry
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
            debit_amount: gross,
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
            credit_amount: gross,
            description: template.description,
            is_tax_line: false,
          }),
        ]);

        await this.advanceNextRunDateInTransaction(manager, template);
      });
    }
  }

  // ── Advance next_run_date helpers ─────────────────────────────────────────

  private async advanceNextRunDate(template: RecurringTransaction): Promise<void> {
    const nextRun = this.calculateNextRunDate(
      new Date(template.next_run_date!),
      template.frequency,
    );
    const isExpired =
      template.end_date !== null && nextRun > new Date(template.end_date);

    await this.recurringRepo.update(template.id, {
      next_run_date: isExpired ? null : nextRun,
      last_posted_at: new Date(),
      status: isExpired ? RecurringStatus.COMPLETED : RecurringStatus.ACTIVE,
    });
  }

  private async advanceNextRunDateInTransaction(
    manager: any,
    template: RecurringTransaction,
  ): Promise<void> {
    const nextRun = this.calculateNextRunDate(
      new Date(template.next_run_date!),
      template.frequency,
    );
    const isExpired =
      template.end_date !== null && nextRun > new Date(template.end_date);

    await manager.update(RecurringTransaction, template.id, {
      next_run_date: isExpired ? null : nextRun,
      last_posted_at: new Date(),
      status: isExpired ? RecurringStatus.COMPLETED : RecurringStatus.ACTIVE,
    });
  }

  // ── Detection helpers ──────────────────────────────────────────────────────

  private normaliseDescription(description: string): string {
    return description
      .toLowerCase()
      .replace(/[^a-z0-9 ]/g, '')
      .replace(/\s+/g, ' ')
      .trim()
      .substring(0, 40);
  }

  private coefficientOfVariation(values: number[]): number {
    if (values.length < 2) return 0;
    const mean = values.reduce((s, v) => s + v, 0) / values.length;
    if (mean === 0) return 0;
    const variance = values.reduce((s, v) => s + Math.pow(v - mean, 2), 0) / values.length;
    return Math.sqrt(variance) / mean;
  }

  private classifyFrequency(
    avgDays: number,
  ): 'weekly' | 'monthly' | 'quarterly' | 'annually' | null {
    if (avgDays >= 5 && avgDays <= 9) return 'weekly';
    if (avgDays >= 25 && avgDays <= 35) return 'monthly';
    if (avgDays >= 80 && avgDays <= 100) return 'quarterly';
    if (avgDays >= 345 && avgDays <= 385) return 'annually';
    return null;
  }

  // ── calculateNextRunDate ──────────────────────────────────────────────────

  private calculateNextRunDate(
    from: Date,
    frequency: RecurringFrequency,
    isFirstRun = false,
  ): Date {
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
