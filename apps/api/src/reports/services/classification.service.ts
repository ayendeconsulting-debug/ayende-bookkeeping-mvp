import {
  Injectable,
  NotFoundException,
  BadRequestException,
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
  ) {}

  // ── Classification Rules ──────────────────────────────────────────

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

  // ── Raw Transactions ──────────────────────────────────────────────

  async getRawTransactions(
    businessId: string,
    filters: {
      status?: string;
      search?: string;
      startDate?: string;
      endDate?: string;
      limit?: number;
      offset?: number;
    },
  ): Promise<{ data: RawTransaction[]; total: number }> {
    const { status, search, startDate, endDate, limit = 20, offset = 0 } = filters;

    const where: any = { business_id: businessId };

    if (status && status !== 'all') {
      where.status = status as RawTransactionStatus;
    }

    if (search) {
      where.description = ILike(`%${search}%`);
    }

    if (startDate && endDate) {
      where.transaction_date = Between(
        new Date(startDate),
        new Date(endDate),
      );
    }

    const [data, total] = await this.rawTxRepo.findAndCount({
      where,
      order: { transaction_date: 'DESC', created_at: 'DESC' },
      take: Math.min(limit, 100),
      skip: offset,
    });

    return { data, total };
  }

  // ── Manual Classification ─────────────────────────────────────────

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
      is_posted: false,
    });
    return this.classifiedRepo.save(classified);
  }

  // ── Post to General Ledger ────────────────────────────────────────

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

        // Line 1: Debit expense/asset account (net)
        lines.push({
          business_id: businessId,
          journal_entry_id: savedEntry.id,
          line_number: 1,
          account_id: classified.account_id,
          debit_amount: netAmount,
          credit_amount: 0,
          description: rawTx.description,
          is_tax_line: false,
          tax_code_id: null,
        });

        // Line 2: Debit tax payable account (tax)
        lines.push({
          business_id: businessId,
          journal_entry_id: savedEntry.id,
          line_number: 2,
          account_id: taxCode.tax_account_id,
          debit_amount: taxAmount,
          credit_amount: 0,
          description: `Tax: ${taxCode.code} @ ${(rate * 100).toFixed(2)}%`,
          is_tax_line: true,
          tax_code_id: taxCode.id,
        });

        // Line 3: Credit source (bank) account (gross)
        lines.push({
          business_id: businessId,
          journal_entry_id: savedEntry.id,
          line_number: 3,
          account_id: sourceAccountId,
          debit_amount: 0,
          credit_amount: amount,
          description: rawTx.description,
          is_tax_line: false,
          tax_code_id: null,
        });

        const savedLines = await manager.save(JournalLine, lines.map(l => manager.create(JournalLine, l))) as JournalLine[];

        // Create tax_transaction record linked to the tax line
        const taxLine = savedLines[1];
        await manager.save(TaxTransaction, manager.create(TaxTransaction, {
          business_id: businessId,
          journal_line_id: taxLine.id,
          tax_code_id: taxCode.id,
          net_amount: netAmount,
          tax_amount: taxAmount,
          gross_amount: amount,
        }));

      } else {
        // Simple two-line entry — no tax
        lines.push({
          business_id: businessId,
          journal_entry_id: savedEntry.id,
          line_number: 1,
          account_id: classified.account_id,
          debit_amount: amount,
          credit_amount: 0,
          description: rawTx.description,
          is_tax_line: false,
        });
        lines.push({
          business_id: businessId,
          journal_entry_id: savedEntry.id,
          line_number: 2,
          account_id: sourceAccountId,
          debit_amount: 0,
          credit_amount: amount,
          description: rawTx.description,
          is_tax_line: false,
        });
        await manager.save(JournalLine, lines.map(l => manager.create(JournalLine, l)));
      }

      // Mark classified transaction as posted
      await manager.update(ClassifiedTransaction, classified.id, {
        is_posted: true,
        posted_journal_entry_id: savedEntry.id,
      });

      return savedEntry;
    });
  }

  // ── Owner Contribution ────────────────────────────────────────────

  async postOwnerContribution(dto: OwnerContributionDto): Promise<JournalEntry> {
    const rawTx = await this.rawTxRepo.findOne({
      where: { id: dto.rawTransactionId, business_id: dto.businessId },
    });
    if (!rawTx) throw new NotFoundException(`Raw transaction ${dto.rawTransactionId} not found`);

    const ownerContribAccount = await this.accountRepo.findOne({
      where: { business_id: dto.businessId, account_subtype: AccountSubtype.OWNER_CONTRIBUTION },
    });
    if (!ownerContribAccount) {
      throw new NotFoundException('No owner_contribution equity account found for this business');
    }

    await this.checkFiscalYearLock(dto.businessId, rawTx.transaction_date);
    const amount = Number(rawTx.amount);

    return this.dataSource.transaction(async (manager) => {
      const entry = manager.create(JournalEntry, {
        business_id: dto.businessId,
        entry_date: rawTx.transaction_date,
        description: `Owner Contribution: ${rawTx.description}`,
        reference_type: 'owner_contribution',
        reference_id: rawTx.id,
        status: JournalEntryStatus.POSTED,
        created_by: dto.classifiedBy,
        posted_by: dto.classifiedBy,
        posted_at: new Date(),
      });
      const savedEntry = await manager.save(JournalEntry, entry) as JournalEntry;

      await manager.save(JournalLine, [
        manager.create(JournalLine, {
          business_id: dto.businessId,
          journal_entry_id: savedEntry.id,
          line_number: 1,
          account_id: dto.debitAccountId,
          debit_amount: amount,
          credit_amount: 0,
          description: rawTx.description,
        }),
        manager.create(JournalLine, {
          business_id: dto.businessId,
          journal_entry_id: savedEntry.id,
          line_number: 2,
          account_id: ownerContribAccount.id,
          debit_amount: 0,
          credit_amount: amount,
          description: `Owner Contribution: ${rawTx.description}`,
        }),
      ]);

      return savedEntry;
    });
  }

  // ── Owner Draw ────────────────────────────────────────────────────

  async postOwnerDraw(dto: OwnerDrawDto): Promise<JournalEntry> {
    const rawTx = await this.rawTxRepo.findOne({
      where: { id: dto.rawTransactionId, business_id: dto.businessId },
    });
    if (!rawTx) throw new NotFoundException(`Raw transaction ${dto.rawTransactionId} not found`);

    const ownerDrawAccount = await this.accountRepo.findOne({
      where: { business_id: dto.businessId, account_subtype: AccountSubtype.OWNER_DRAW },
    });
    if (!ownerDrawAccount) {
      throw new NotFoundException('No owner_draw equity account found for this business');
    }

    await this.checkFiscalYearLock(dto.businessId, rawTx.transaction_date);
    const amount = Number(rawTx.amount);

    return this.dataSource.transaction(async (manager) => {
      const entry = manager.create(JournalEntry, {
        business_id: dto.businessId,
        entry_date: rawTx.transaction_date,
        description: `Owner Draw: ${rawTx.description}`,
        reference_type: 'owner_draw',
        reference_id: rawTx.id,
        status: JournalEntryStatus.POSTED,
        created_by: dto.classifiedBy,
        posted_by: dto.classifiedBy,
        posted_at: new Date(),
      });
      const savedEntry = await manager.save(JournalEntry, entry) as JournalEntry;

      await manager.save(JournalLine, [
        manager.create(JournalLine, {
          business_id: dto.businessId,
          journal_entry_id: savedEntry.id,
          line_number: 1,
          account_id: ownerDrawAccount.id,
          debit_amount: amount,
          credit_amount: 0,
          description: `Owner Draw: ${rawTx.description}`,
        }),
        manager.create(JournalLine, {
          business_id: dto.businessId,
          journal_entry_id: savedEntry.id,
          line_number: 2,
          account_id: dto.creditAccountId,
          debit_amount: 0,
          credit_amount: amount,
          description: rawTx.description,
        }),
      ]);

      return savedEntry;
    });
  }

  // ── Helpers ───────────────────────────────────────────────────────

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
}
