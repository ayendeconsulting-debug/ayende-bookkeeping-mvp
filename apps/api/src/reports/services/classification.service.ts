import {
  Injectable,
  NotFoundException,
  BadRequestException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, ILike, Between } from 'typeorm';
import { ClassifiedTransaction, ClassificationMethod } from '../../entities/classified-transaction.entity';
import { ClassificationRule } from '../../entities/classification-rule.entity';
import { RawTransaction, RawTransactionStatus } from '../../entities/raw-transaction.entity';
import { Account, AccountSubtype } from '../../entities/account.entity';
import { TaxCode } from '../../entities/tax-code.entity';
import { TaxTransaction } from '../../entities/tax-transaction.entity';
import { JournalEntry, JournalEntryStatus } from '../../entities/journal-entry.entity';
import { JournalLine } from '../../entities/journal-line.entity';
import { FiscalYear } from '../../entities/fiscal-year.entity';
import {
  ClassifyTransactionDto,
  OwnerContributionDto,
  OwnerDrawDto,
} from '../dto/classify-transaction.dto';
import { CreateClassificationRuleDto, UpdateClassificationRuleDto } from '../dto/create-classification-rule.dto';
import { LearnClassificationRuleDto } from '../dto/learn-classification-rule.dto';
import { HstPeriodService } from './hst-period.service';

@Injectable()
export class ClassificationService {
  constructor(
    @InjectRepository(ClassifiedTransaction)
    private readonly classifiedRepo: Repository<ClassifiedTransaction>,
    @InjectRepository(ClassificationRule)
    private readonly ruleRepo: Repository<ClassificationRule>,
    @InjectRepository(RawTransaction)
    private readonly rawTxRepo: Repository<RawTransaction>,
    @InjectRepository(Account)
    private readonly accountRepo: Repository<Account>,
    @InjectRepository(TaxCode)
    private readonly taxCodeRepo: Repository<TaxCode>,
    @InjectRepository(TaxTransaction)
    private readonly taxTxRepo: Repository<TaxTransaction>,
    @InjectRepository(JournalEntry)
    private readonly journalEntryRepo: Repository<JournalEntry>,
    @InjectRepository(JournalLine)
    private readonly journalLineRepo: Repository<JournalLine>,
    @InjectRepository(FiscalYear)
    private readonly fiscalYearRepo: Repository<FiscalYear>,
    private readonly dataSource: DataSource,
    private readonly hstPeriodService: HstPeriodService,
  ) {}

  // â”€â”€ Classification Rules â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  async createRule(dto: CreateClassificationRuleDto): Promise<ClassificationRule> {
    const rule = this.ruleRepo.create({
      business_id: dto.businessId,
      name: dto.name,
      description: dto.description,
      match_type: dto.match_type,
      match_value: dto.match_value,
      match_pattern: dto.match_pattern,
      target_account_id: dto.target_account_id,
      tax_code_id: dto.tax_code_id,
      priority: dto.priority ?? 100,
    });
    return this.ruleRepo.save(rule);
  }

  async findAllRules(businessId: string): Promise<ClassificationRule[]> {
    return this.ruleRepo.find({
      where: { business_id: businessId, is_active: true },
      relations: ['targetAccount', 'taxCode'],
      order: { priority: 'ASC' },
    });
  }

  async updateRule(businessId: string, id: string, dto: UpdateClassificationRuleDto): Promise<ClassificationRule> {
    const rule = await this.ruleRepo.findOne({ where: { id, business_id: businessId } });
    if (!rule) throw new NotFoundException(`Rule ${id} not found`);
    Object.assign(rule, dto);
    return this.ruleRepo.save(rule);
  }

  async deactivateRule(businessId: string, id: string): Promise<ClassificationRule> {
    const rule = await this.ruleRepo.findOne({ where: { id, business_id: businessId } });
    if (!rule) throw new NotFoundException(`Rule ${id} not found`);
    rule.is_active = false;
    return this.ruleRepo.save(rule);
  }

  // â”€â”€ Raw Transactions â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  async getRawTransactions(
    businessId: string,
    filters: {
      status?: string;
      search?: string;
      startDate?: string;
      endDate?: string;
      sourceAccountName?: string;
      month?: string; // format: YYYY-MM
      limit?: number;
      offset?: number;
    },
  ): Promise<{ data: RawTransaction[]; total: number }> {
    const {
      status, search, startDate, endDate,
      sourceAccountName, month,
      limit = 20, offset = 0,
    } = filters;

    const qb = this.rawTxRepo
      .createQueryBuilder('rt')
      .where('rt.business_id = :businessId', { businessId });

    // â”€â”€ Status filter â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    // 'categorized' = personal_category_id IS NOT NULL (personal mode)
    if (status && status !== 'all') {
      if (status === 'categorized') {
        qb.andWhere('rt.personal_category_id IS NOT NULL');
      } else {
        qb.andWhere('rt.status = :status', { status });
      }
    }

    // â”€â”€ Search â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    if (search) {
      qb.andWhere('rt.description ILIKE :search', { search: `%${search}%` });
    }

    // â”€â”€ Date range â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    if (startDate && endDate) {
      qb.andWhere('rt.transaction_date BETWEEN :startDate AND :endDate', { startDate, endDate });
    }

    // â”€â”€ Month filter (YYYY-MM) overrides startDate/endDate â”€â”€â”€â”€â”€â”€â”€â”€â”€
    if (month) {
      const [year, mon] = month.split('-').map(Number);
      const firstDay = `${year}-${String(mon).padStart(2, '0')}-01`;
      const lastDay = new Date(year, mon, 0).getDate();
      const lastDayStr = `${year}-${String(mon).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
      qb.andWhere('rt.transaction_date BETWEEN :mStart AND :mEnd', {
        mStart: firstDay,
        mEnd: lastDayStr,
      });
    }

    // â”€â”€ Source account filter â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    if (sourceAccountName) {
      qb.andWhere('rt.source_account_name = :sourceAccountName', { sourceAccountName });
    }

    qb.orderBy('rt.transaction_date', 'DESC')
      .addOrderBy('rt.created_at', 'DESC')
      .take(Math.min(limit, 100))
      .skip(offset);

    const [data, total] = await qb.getManyAndCount();

    // Enrich with classified_id and classified_source_account_id for Post button
    if (data.length > 0) {
      const ids = data.map((t) => t.id);
      const classified = await this.classifiedRepo
        .createQueryBuilder('ct')
        .select(['ct.raw_transaction_id', 'ct.id', 'ct.source_account_id', 'ct.account_id'])
        .where('ct.raw_transaction_id IN (:...ids)', { ids })
        .andWhere('ct.business_id = :businessId', { businessId })
        .getMany();
      const classifiedMap = new Map(classified.map((ct) => [ct.raw_transaction_id, ct]));
      for (const tx of data) {
        const ct = classifiedMap.get(tx.id);
        if (ct) {
          (tx as any).classified_id = ct.id;
          (tx as any).classified_source_account_id = (ct as any).source_account_id ?? null;
          (tx as any).classified_account_id = (ct as any).account_id ?? null;
        }
      }
    }

    return { data, total };
  }

  // â”€â”€ Source Account Names (for filter dropdown) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  async getSourceAccounts(businessId: string): Promise<{ value: string; label: string }[]> {
    const rows = await this.dataSource.query(
      `SELECT DISTINCT rt.source_account_name AS value,
              COALESCE(pa.name, rt.source_account_name) AS label
       FROM raw_transactions rt
       LEFT JOIN plaid_accounts pa ON pa.account_id = rt.source_account_name
       WHERE rt.business_id = $1
         AND rt.source_account_name IS NOT NULL
         AND rt.source_account_name != ''
       ORDER BY label ASC`,
      [businessId],
    );
    return rows.map((r: any) => ({ value: r.value as string, label: r.label as string }));
  }

  async getTransactionMonths(businessId: string): Promise<{ value: string; label: string }[]> {
    const rows = await this.dataSource.query(
      `SELECT DISTINCT TO_CHAR(transaction_date, 'YYYY-MM') AS value
       FROM raw_transactions
       WHERE business_id = $1
       ORDER BY value DESC`,
      [businessId],
    );
    return rows.map((r: any) => {
      const [year, mon] = (r.value as string).split('-');
      const date = new Date(Number(year), Number(mon) - 1, 1);
      const label = date.toLocaleDateString('en-CA', { month: 'long', year: 'numeric' });
      return { value: r.value as string, label };
    });
  }

  // â”€â”€ Tag Transaction (Freelancer Mode) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  async tagTransaction(
    businessId: string,
    id: string,
    isPersonal: boolean,
  ): Promise<RawTransaction> {
    const tx = await this.rawTxRepo.findOne({
      where: { id, business_id: businessId },
    });
    if (!tx) throw new NotFoundException(`Raw transaction ${id} not found`);
    tx.is_personal = isPersonal;
    return this.rawTxRepo.save(tx);
  }

  // â”€â”€ Bulk Classification â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  async bulkClassify(
    businessId: string,
    userId: string,
    rawTransactionIds: string[],
    accountId: string,
    taxCodeId?: string,
  ): Promise<{ classified: number; skipped: number; errors: string[] }> {
    let classified = 0;
    let skipped = 0;
    const errors: string[] = [];

    for (const rawTransactionId of rawTransactionIds) {
      try {
        const rawTx = await this.rawTxRepo.findOne({
          where: { id: rawTransactionId, business_id: businessId },
        });
        if (!rawTx) { skipped++; continue; }

        const existing = await this.classifiedRepo.findOne({
          where: { raw_transaction_id: rawTransactionId, business_id: businessId },
        });
        if (existing) { skipped++; continue; }

        const ct = this.classifiedRepo.create({
          business_id: businessId,
          raw_transaction_id: rawTransactionId,
          classification_method: ClassificationMethod.MANUAL,
          account_id: accountId,
          tax_code_id: taxCodeId ?? null,
          classified_by: userId,
          is_posted: false,
        });
        await this.classifiedRepo.save(ct);

        rawTx.status = RawTransactionStatus.CLASSIFIED;
        await this.rawTxRepo.save(rawTx);
        classified++;
      } catch (err: any) {
        errors.push(`${rawTransactionId}: ${err.message ?? 'Unknown error'}`);
      }
    }

    return { classified, skipped, errors };
  }

  // â”€â”€ Manual Classification â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  async classify(dto: ClassifyTransactionDto): Promise<ClassifiedTransaction> {
    const rawTx = await this.rawTxRepo.findOne({
      where: { id: dto.rawTransactionId, business_id: dto.businessId },
    });
    if (!rawTx) throw new NotFoundException(`Raw transaction ${dto.rawTransactionId} not found`);

    const existing = await this.classifiedRepo.findOne({
      where: { raw_transaction_id: dto.rawTransactionId, business_id: dto.businessId },
    });
    if (existing) {
      throw new BadRequestException('This transaction has already been classified');
    }

    const classified = this.classifiedRepo.create({
      business_id: dto.businessId,
      raw_transaction_id: dto.rawTransactionId,
      classification_method: dto.classificationMethod,
      account_id: dto.accountId,
      tax_code_id: dto.taxCodeId,
      override_amount: dto.overrideAmount,
      classified_by: dto.classifiedBy,
      source_account_id: dto.sourceAccountId ?? null,
        is_posted: false,
    });
    return this.classifiedRepo.save(classified);
  }

  // â”€â”€ Post to General Ledger â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  // ── Unclassify

  async unclassify(businessId: string, rawTransactionId: string): Promise<void> {
    const rawTx = await this.rawTxRepo.findOne({ where: { id: rawTransactionId, business_id: businessId } });
    if (!rawTx) throw new NotFoundException(`Raw transaction ${rawTransactionId} not found`);
    if (rawTx.status === 'posted') throw new BadRequestException('Cannot unclassify a posted transaction');
    await this.classifiedRepo.delete({ raw_transaction_id: rawTransactionId, business_id: businessId });
    await this.rawTxRepo.update(rawTransactionId, { status: RawTransactionStatus.PENDING });
  }

  // ── Unclassify


  // ── Bulk Post

  async bulkPost(
    businessId: string,
    rawTransactionIds: string[],
    sourceAccountId: string,
    postedBy: string,
  ): Promise<{ posted: number; skipped: number; errors: string[] }> {
    let posted = 0;
    let skipped = 0;
    const errors: string[] = [];
    for (const rawTransactionId of rawTransactionIds) {
      try {
        const classified = await this.classifiedRepo.findOne({
          where: { raw_transaction_id: rawTransactionId, business_id: businessId, is_posted: false },
        });
        if (!classified) { skipped++; continue; }
        await this.postClassifiedTransaction(businessId, classified.id, sourceAccountId, postedBy);
        posted++;
      } catch (err: any) {
        errors.push(`${rawTransactionId}: ${err.message ?? 'Unknown error'}`);
      }
    }
    return { posted, skipped, errors };
  }

  async postClassifiedTransaction(
    businessId: string,
    classifiedId: string,
    sourceAccountId: string,
    postedBy: string,
  ): Promise<JournalEntry> {
    const classified = await this.classifiedRepo.findOne({
      where: { id: classifiedId, business_id: businessId },
    });
    if (!classified) throw new NotFoundException(`Classified transaction ${classifiedId} not found`);
    if (classified.is_posted) throw new BadRequestException('Transaction is already posted');

    const rawTx = await this.rawTxRepo.findOne({ where: { id: classified.raw_transaction_id } });
    if (!rawTx) throw new NotFoundException('Raw transaction not found');

    const amount = Number(classified.override_amount ?? rawTx.amount);
    await this.checkFiscalYearLock(businessId, rawTx.transaction_date);
    await this.checkHstPeriodLock(businessId, rawTx.transaction_date);

    return this.dataSource.transaction(async (manager) => {
      const entry = manager.create(JournalEntry, {
        business_id: businessId,
        entry_date: rawTx.transaction_date,
        description: rawTx.description,
        reference_type: 'classified_transaction',
        reference_id: classified.id,
        status: JournalEntryStatus.POSTED,
        created_by: postedBy,
        posted_by: postedBy,
        posted_at: new Date(),
      });
      const savedEntry = await manager.save(JournalEntry, entry) as JournalEntry;

      const lines: Partial<JournalLine>[] = [];

      if (classified.tax_code_id) {
        const taxCode = await this.taxCodeRepo.findOne({ where: { id: classified.tax_code_id } });
        if (!taxCode) throw new NotFoundException('Tax code not found');

        const rate = Number(taxCode.rate);
        const netAmount = parseFloat((amount / (1 + rate)).toFixed(2));
        const taxAmount = parseFloat((amount - netAmount).toFixed(2));

        lines.push({ business_id: businessId, journal_entry_id: savedEntry.id, line_number: 1, account_id: classified.account_id, debit_amount: netAmount, credit_amount: 0, description: rawTx.description, is_tax_line: false, tax_code_id: null });
        lines.push({ business_id: businessId, journal_entry_id: savedEntry.id, line_number: 2, account_id: taxCode.tax_account_id, debit_amount: taxAmount, credit_amount: 0, description: `Tax: ${taxCode.code} @ ${(rate * 100).toFixed(2)}%`, is_tax_line: true, tax_code_id: taxCode.id });
        lines.push({ business_id: businessId, journal_entry_id: savedEntry.id, line_number: 3, account_id: sourceAccountId, debit_amount: 0, credit_amount: amount, description: rawTx.description, is_tax_line: false, tax_code_id: null });

        const savedLines = await manager.save(JournalLine, lines.map(l => manager.create(JournalLine, l))) as JournalLine[];
        const taxLine = savedLines[1];
        await manager.save(TaxTransaction, manager.create(TaxTransaction, {
          business_id: businessId, journal_line_id: taxLine.id, tax_code_id: taxCode.id,
          net_amount: netAmount, tax_amount: taxAmount, gross_amount: amount,
        }));
      } else {
        lines.push({ business_id: businessId, journal_entry_id: savedEntry.id, line_number: 1, account_id: classified.account_id, debit_amount: amount, credit_amount: 0, description: rawTx.description, is_tax_line: false });
        lines.push({ business_id: businessId, journal_entry_id: savedEntry.id, line_number: 2, account_id: sourceAccountId, debit_amount: 0, credit_amount: amount, description: rawTx.description, is_tax_line: false });
        await manager.save(JournalLine, lines.map(l => manager.create(JournalLine, l)));
      }

      await manager.update(ClassifiedTransaction, classified.id, {
        is_posted: true,
        posted_journal_entry_id: savedEntry.id,
      });
        await manager.update(RawTransaction, rawTx.id, { status: RawTransactionStatus.POSTED, anomaly_flags: null });
      return savedEntry;
    });
  }

  // â”€â”€ Owner Contribution â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  async postOwnerContribution(dto: OwnerContributionDto): Promise<JournalEntry> {
    const rawTx = await this.rawTxRepo.findOne({
      where: { id: dto.rawTransactionId, business_id: dto.businessId },
    });
    if (!rawTx) throw new NotFoundException(`Raw transaction ${dto.rawTransactionId} not found`);

    const ownerContribAccount = await this.accountRepo.findOne({
      where: { business_id: dto.businessId, account_subtype: AccountSubtype.OWNER_CONTRIBUTION },
    });
    if (!ownerContribAccount) throw new NotFoundException('No owner_contribution equity account found');

    await this.checkFiscalYearLock(dto.businessId, rawTx.transaction_date);
    await this.checkHstPeriodLock(dto.businessId, rawTx.transaction_date);

    const amount = Number(rawTx.amount);
    return this.dataSource.transaction(async (manager) => {
      const entry = manager.create(JournalEntry, {
        business_id: dto.businessId, entry_date: rawTx.transaction_date,
        description: `Owner Contribution: ${rawTx.description}`,
        reference_type: 'owner_contribution', reference_id: rawTx.id,
        status: JournalEntryStatus.POSTED, created_by: dto.classifiedBy,
        posted_by: dto.classifiedBy, posted_at: new Date(),
      });
      const savedEntry = await manager.save(JournalEntry, entry) as JournalEntry;
      await manager.save(JournalLine, [
        manager.create(JournalLine, { business_id: dto.businessId, journal_entry_id: savedEntry.id, line_number: 1, account_id: dto.debitAccountId, debit_amount: amount, credit_amount: 0, description: rawTx.description }),
        manager.create(JournalLine, { business_id: dto.businessId, journal_entry_id: savedEntry.id, line_number: 2, account_id: ownerContribAccount.id, debit_amount: 0, credit_amount: amount, description: `Owner Contribution: ${rawTx.description}` }),
      ]);
      return savedEntry;
    });
  }

  // â”€â”€ Owner Draw â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  async postOwnerDraw(dto: OwnerDrawDto): Promise<JournalEntry> {
    const rawTx = await this.rawTxRepo.findOne({
      where: { id: dto.rawTransactionId, business_id: dto.businessId },
    });
    if (!rawTx) throw new NotFoundException(`Raw transaction ${dto.rawTransactionId} not found`);

    const ownerDrawAccount = await this.accountRepo.findOne({
      where: { business_id: dto.businessId, account_subtype: AccountSubtype.OWNER_DRAW },
    });
    if (!ownerDrawAccount) throw new NotFoundException('No owner_draw equity account found');

    await this.checkFiscalYearLock(dto.businessId, rawTx.transaction_date);
    await this.checkHstPeriodLock(dto.businessId, rawTx.transaction_date);

    const amount = Number(rawTx.amount);
    return this.dataSource.transaction(async (manager) => {
      const entry = manager.create(JournalEntry, {
        business_id: dto.businessId, entry_date: rawTx.transaction_date,
        description: `Owner Draw: ${rawTx.description}`,
        reference_type: 'owner_draw', reference_id: rawTx.id,
        status: JournalEntryStatus.POSTED, created_by: dto.classifiedBy,
        posted_by: dto.classifiedBy, posted_at: new Date(),
      });
      const savedEntry = await manager.save(JournalEntry, entry) as JournalEntry;
      await manager.save(JournalLine, [
        manager.create(JournalLine, { business_id: dto.businessId, journal_entry_id: savedEntry.id, line_number: 1, account_id: ownerDrawAccount.id, debit_amount: amount, credit_amount: 0, description: `Owner Draw: ${rawTx.description}` }),
        manager.create(JournalLine, { business_id: dto.businessId, journal_entry_id: savedEntry.id, line_number: 2, account_id: dto.creditAccountId, debit_amount: 0, credit_amount: amount, description: rawTx.description }),
      ]);
      return savedEntry;
    });
  }

  // â”€â”€ Classification Learning â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  async learnRule(dto: LearnClassificationRuleDto): Promise<ClassificationRule> {
    const rawTx = await this.rawTxRepo.findOne({
      where: { id: dto.rawTransactionId, business_id: dto.businessId },
    });
    if (!rawTx) throw new NotFoundException(`Raw transaction ${dto.rawTransactionId} not found`);

    const account = await this.accountRepo.findOne({
      where: { id: dto.targetAccountId, business_id: dto.businessId },
    });
    if (!account) throw new NotFoundException(`Account ${dto.targetAccountId} not found`);

    const matchValue = rawTx.description.toLowerCase().replace(/[^a-z0-9 ]/g, '').substring(0, 40).trim();
    if (!matchValue) throw new BadRequestException('Transaction description is too short to create a meaningful rule.');

    const existing = await this.ruleRepo.findOne({
      where: { business_id: dto.businessId, match_value: matchValue, target_account_id: dto.targetAccountId, is_active: true },
    });
    if (existing) return existing;

    const rule = this.ruleRepo.create({
      business_id: dto.businessId,
      name: `Auto: ${rawTx.description.substring(0, 60)}`,
      match_type: 'keyword',
      match_value: matchValue,
      target_account_id: dto.targetAccountId,
      tax_code_id: dto.taxCodeId ?? null,
      priority: 50,
      source: 'user_learned',
      is_active: true,
    });
    return this.ruleRepo.save(rule);
  }

  // â”€â”€ Phase 12: Auto-Classification Engine â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  private matchRule(rules: ClassificationRule[], rawTx: RawTransaction): ClassificationRule | null {
    for (const rule of rules) {
      if (!rule.match_value) continue;
      if (rule.match_type === 'keyword') {
        if (rawTx.description?.toLowerCase().includes(rule.match_value.toLowerCase())) return rule;
      } else if (rule.match_type === 'vendor') {
        if (rawTx.description?.toLowerCase().trim() === rule.match_value.toLowerCase().trim()) return rule;
      } else if (rule.match_type === 'account') {
        if ((rawTx as any).plaid_account_id === rule.match_value) return rule;
      }
    }
    return null;
  }

  async applyRulesToTransaction(
    businessId: string,
    rawTx: RawTransaction,
  ): Promise<{ matched: boolean; ruleId?: string }> {
    try {
      if (rawTx.status !== RawTransactionStatus.PENDING) return { matched: false };
      const existing = await this.classifiedRepo.findOne({
        where: { raw_transaction_id: rawTx.id, business_id: businessId },
      });
      if (existing) return { matched: false };

      const rules = await this.ruleRepo.find({
        where: { business_id: businessId, is_active: true },
        order: { priority: 'ASC' },
      });

      const matched = this.matchRule(rules, rawTx);
      if (!matched) return { matched: false };

      await this.classifiedRepo.save(
        this.classifiedRepo.create({
          business_id: businessId, raw_transaction_id: rawTx.id,
          classification_method: ClassificationMethod.AUTO,
          account_id: matched.target_account_id,
          tax_code_id: matched.tax_code_id ?? null,
          classified_by: 'system', is_posted: false,
        }),
      );
      await this.rawTxRepo.update(rawTx.id, { status: RawTransactionStatus.CLASSIFIED });
      return { matched: true, ruleId: matched.id };
    } catch {
      return { matched: false };
    }
  }

  async runBatchRules(
    businessId: string,
  ): Promise<{ total: number; classified: number; skipped: number }> {
    const rules = await this.ruleRepo.find({
      where: { business_id: businessId, is_active: true },
      order: { priority: 'ASC' },
    });
    const pendingTxs = await this.rawTxRepo.find({
      where: { business_id: businessId, status: RawTransactionStatus.PENDING },
    });

    let classified = 0;
    let skipped = 0;

    for (const rawTx of pendingTxs) {
      try {
        const existing = await this.classifiedRepo.findOne({
          where: { raw_transaction_id: rawTx.id, business_id: businessId },
        });
        if (existing) { skipped++; continue; }

        const matched = this.matchRule(rules, rawTx);
        if (!matched) { skipped++; continue; }

        await this.classifiedRepo.save(
          this.classifiedRepo.create({
            business_id: businessId, raw_transaction_id: rawTx.id,
            classification_method: ClassificationMethod.AUTO,
            account_id: matched.target_account_id,
            tax_code_id: matched.tax_code_id ?? null,
            classified_by: 'system', is_posted: false,
          }),
        );
        await this.rawTxRepo.update(rawTx.id, { status: RawTransactionStatus.CLASSIFIED });
        classified++;
      } catch {
        skipped++;
      }
    }

    return { total: pendingTxs.length, classified, skipped };
  }

  // â”€â”€ Helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  private async checkFiscalYearLock(businessId: string, date: Date): Promise<void> {
    const fiscalYear = await this.fiscalYearRepo
      .createQueryBuilder('fy')
      .where('fy.business_id = :businessId', { businessId })
      .andWhere(':date BETWEEN fy.start_date AND fy.end_date', { date })
      .getOne();
    if (fiscalYear?.is_locked) {
      throw new BadRequestException(
        `Fiscal year ${fiscalYear.year_number} is locked. Cannot post transactions.`,
      );
    }
  }

  private async checkHstPeriodLock(businessId: string, date: Date): Promise<void> {
    const dateStr = date instanceof Date
      ? date.toISOString().split('T')[0]
      : String(date).split('T')[0];

    const lockedPeriod = await this.hstPeriodService.isDateInLockedPeriod(businessId, dateStr);
    if (lockedPeriod) {
      throw new UnprocessableEntityException(
        `Cannot post transaction dated ${dateStr} â€“ it falls within a locked HST period ` +
        `(${lockedPeriod.period_start} to ${lockedPeriod.period_end}). ` +
        `Locked periods cannot accept new journal entries.`,
      );
    }
  }
}