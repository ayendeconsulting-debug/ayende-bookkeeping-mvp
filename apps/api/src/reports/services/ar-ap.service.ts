import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, LessThan } from 'typeorm';
import { ArApRecord, ArApType, ArApStatus } from '../../entities/ar-ap-record.entity';
import { JournalEntry, JournalEntryStatus } from '../../entities/journal-entry.entity';
import { JournalLine } from '../../entities/journal-line.entity';
import { CreateArApDto, UpdateArApDto, RecordArApPaymentDto } from '../dto/ar-ap.dto';

@Injectable()
export class ArApService {
  constructor(
    @InjectRepository(ArApRecord)
    private readonly arApRepo: Repository<ArApRecord>,
    @InjectRepository(JournalEntry)
    private readonly journalEntryRepo: Repository<JournalEntry>,
    @InjectRepository(JournalLine)
    private readonly journalLineRepo: Repository<JournalLine>,
    private readonly dataSource: DataSource,
  ) {}

  // ── Create ────────────────────────────────────────────────────────────────

  async create(businessId: string, dto: CreateArApDto): Promise<ArApRecord> {
    const record = this.arApRepo.create({
      business_id: businessId,
      type: dto.type as ArApType,
      party_name: dto.party_name,
      party_email: dto.party_email ?? null,
      amount: dto.amount,
      amount_paid: 0,
      due_date: new Date(dto.due_date),
      description: dto.description ?? null,
      status: ArApStatus.OUTSTANDING,
    });
    return this.arApRepo.save(record);
  }

  // ── List ──────────────────────────────────────────────────────────────────

  async findAll(
    businessId: string,
    filters: {
      type?: string;
      status?: string;
      limit?: number;
      offset?: number;
    },
  ): Promise<{ data: ArApRecord[]; total: number }> {
    const { type, status, limit = 20, offset = 0 } = filters;

    // Auto-mark overdue before returning
    await this.markOverdue(businessId);

    const where: any = { business_id: businessId };
    if (type && type !== 'all') where.type = type as ArApType;
    if (status && status !== 'all') where.status = status as ArApStatus;

    const [data, total] = await this.arApRepo.findAndCount({
      where,
      order: { due_date: 'ASC', created_at: 'DESC' },
      take: Math.min(limit, 100),
      skip: offset,
    });

    return { data, total };
  }

  // ── Get One ───────────────────────────────────────────────────────────────

  async findOne(businessId: string, id: string): Promise<ArApRecord> {
    const record = await this.arApRepo.findOne({
      where: { id, business_id: businessId },
    });
    if (!record) throw new NotFoundException(`AR/AP record ${id} not found`);
    return record;
  }

  // ── Update ────────────────────────────────────────────────────────────────

  async update(businessId: string, id: string, dto: UpdateArApDto): Promise<ArApRecord> {
    const record = await this.findOne(businessId, id);

    const editableStatuses: ArApStatus[] = [ArApStatus.OUTSTANDING, ArApStatus.OVERDUE];
    if (!editableStatuses.includes(record.status)) {
      throw new BadRequestException(`Cannot edit a ${record.status} record.`);
    }

    if (dto.party_name) record.party_name = dto.party_name;
    if (dto.party_email !== undefined) record.party_email = dto.party_email ?? null;
    if (dto.due_date) record.due_date = new Date(dto.due_date);
    if (dto.description !== undefined) record.description = dto.description ?? null;

    return this.arApRepo.save(record);
  }

  // ── Record Payment ────────────────────────────────────────────────────────

  async recordPayment(
    businessId: string,
    id: string,
    dto: RecordArApPaymentDto,
    userId: string,
  ): Promise<ArApRecord> {
    const record = await this.findOne(businessId, id);

    const payableStatuses: ArApStatus[] = [
      ArApStatus.OUTSTANDING,
      ArApStatus.OVERDUE,
      ArApStatus.PARTIALLY_PAID,
    ];
    if (!payableStatuses.includes(record.status)) {
      throw new BadRequestException(`Cannot record payment on a ${record.status} record.`);
    }

    const balanceOwing = Number(record.amount) - Number(record.amount_paid);
    if (dto.amount > balanceOwing + 0.01) {
      throw new BadRequestException(
        `Payment $${dto.amount} exceeds balance owing $${balanceOwing.toFixed(2)}.`,
      );
    }

    return this.dataSource.transaction(async (manager) => {
      const isReceivable = record.type === ArApType.RECEIVABLE;

      // AR: Debit bank (money received) → Credit contra (revenue/AR account)
      // AP: Debit contra (expense/AP account) → Credit bank (money paid out)
      const [debitAccountId, creditAccountId] = isReceivable
        ? [dto.bank_account_id, dto.contra_account_id]
        : [dto.contra_account_id, dto.bank_account_id];

      const typeLabel = isReceivable ? 'Payment received' : 'Payment made';
      const entry = manager.create(JournalEntry, {
        business_id: businessId,
        entry_date: new Date(dto.payment_date),
        description: `${typeLabel} — ${record.party_name}`,
        reference_type: record.type === ArApType.RECEIVABLE ? 'ar_payment' : 'ap_payment',
        reference_id: record.id,
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
          account_id: debitAccountId,
          debit_amount: dto.amount,
          credit_amount: 0,
          description: `${record.party_name}`,
          is_tax_line: false,
        }),
        manager.create(JournalLine, {
          business_id: businessId,
          journal_entry_id: savedEntry.id,
          line_number: 2,
          account_id: creditAccountId,
          debit_amount: 0,
          credit_amount: dto.amount,
          description: `${record.party_name}`,
          is_tax_line: false,
        }),
      ]);

      const newAmountPaid = parseFloat((Number(record.amount_paid) + dto.amount).toFixed(2));
      const remaining = parseFloat((Number(record.amount) - newAmountPaid).toFixed(2));

      record.amount_paid = newAmountPaid;
      record.linked_journal_entry_id = savedEntry.id;
      record.status = remaining <= 0 ? ArApStatus.PAID : ArApStatus.PARTIALLY_PAID;

      await manager.save(ArApRecord, record);
      return record;
    });
  }

  // ── Void ──────────────────────────────────────────────────────────────────

  async voidRecord(businessId: string, id: string): Promise<ArApRecord> {
    const record = await this.findOne(businessId, id);

    if (record.status === ArApStatus.PAID) {
      throw new BadRequestException('Cannot void a paid record.');
    }
    if (record.status === ArApStatus.VOID) {
      throw new BadRequestException('Record is already void.');
    }

    record.status = ArApStatus.VOID;
    return this.arApRepo.save(record);
  }

  // ── Summary (dashboard widget) ────────────────────────────────────────────

  async getSummary(businessId: string): Promise<{
    total_receivable: number;
    total_payable: number;
    overdue_receivable: number;
    overdue_payable: number;
    net_position: number;
  }> {
    await this.markOverdue(businessId);

    const activeStatuses = [
      ArApStatus.OUTSTANDING,
      ArApStatus.OVERDUE,
      ArApStatus.PARTIALLY_PAID,
    ];

    const records = await this.arApRepo.find({
      where: { business_id: businessId },
    });

    const active = records.filter((r) => activeStatuses.includes(r.status));
    const balance = (r: ArApRecord) => Number(r.amount) - Number(r.amount_paid);

    const totalReceivable = active
      .filter((r) => r.type === ArApType.RECEIVABLE)
      .reduce((s, r) => s + balance(r), 0);

    const totalPayable = active
      .filter((r) => r.type === ArApType.PAYABLE)
      .reduce((s, r) => s + balance(r), 0);

    const overdueReceivable = active
      .filter((r) => r.type === ArApType.RECEIVABLE && r.status === ArApStatus.OVERDUE)
      .reduce((s, r) => s + balance(r), 0);

    const overduePayable = active
      .filter((r) => r.type === ArApType.PAYABLE && r.status === ArApStatus.OVERDUE)
      .reduce((s, r) => s + balance(r), 0);

    return {
      total_receivable: parseFloat(totalReceivable.toFixed(2)),
      total_payable: parseFloat(totalPayable.toFixed(2)),
      overdue_receivable: parseFloat(overdueReceivable.toFixed(2)),
      overdue_payable: parseFloat(overduePayable.toFixed(2)),
      net_position: parseFloat((totalReceivable - totalPayable).toFixed(2)),
    };
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  private async markOverdue(businessId: string): Promise<void> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    await this.arApRepo
      .createQueryBuilder()
      .update(ArApRecord)
      .set({ status: ArApStatus.OVERDUE })
      .where('business_id = :businessId', { businessId })
      .andWhere('status IN (:...statuses)', {
        statuses: [ArApStatus.OUTSTANDING, ArApStatus.PARTIALLY_PAID],
      })
      .andWhere('due_date < :today', { today })
      .execute();
  }
}
