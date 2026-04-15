import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { ClassifiedTransaction, ClassificationMethod } from '../../entities/classified-transaction.entity';
import { RawTransaction, RawTransactionStatus } from '../../entities/raw-transaction.entity';
import { TransactionSplit } from '../../entities/transaction-split.entity';
import { Account, AccountType, AccountSubtype } from '../../entities/account.entity';
import { JournalEntry, JournalEntryStatus } from '../../entities/journal-entry.entity';
import { JournalLine } from '../../entities/journal-line.entity';
import { SplitTransactionDto } from '../dto/split-transaction.dto';

@Injectable()
export class SplitTransactionService {
  constructor(
    @InjectRepository(RawTransaction)
    private readonly rawTxRepo: Repository<RawTransaction>,
    @InjectRepository(ClassifiedTransaction)
    private readonly classifiedRepo: Repository<ClassifiedTransaction>,
    @InjectRepository(TransactionSplit)
    private readonly splitRepo: Repository<TransactionSplit>,
    @InjectRepository(Account)
    private readonly accountRepo: Repository<Account>,
    @InjectRepository(JournalEntry)
    private readonly journalEntryRepo: Repository<JournalEntry>,
    @InjectRepository(JournalLine)
    private readonly journalLineRepo: Repository<JournalLine>,
    private readonly dataSource: DataSource,
  ) {}

  /**
   * POST /classification/raw/:id/split
   *
   * Supports two source types (Freelancer hybrid mode):
   *
   * source_type = 'business' (default):
   *   - Business lines → DR expense/asset account
   *   - Personal lines → DR Owner Draw (equity)
   *   - One CR → source business bank account for full gross amount
   *   Journal stays balanced: sum(business debits) + sum(personal/owner-draw debits) = gross credit
   *
   * source_type = 'personal':
   *   - Business lines → DR expense/asset account, CR Owner Contribution
   *   - Personal lines → excluded from journal entirely (personal spend, not business)
   *   - No source account credit needed (personal account not in chart of accounts)
   *   Journal: per business line: DR expense / CR owner_contribution
   */
  async postSplitTransaction(
    businessId: string,
    rawTransactionId: string,
    dto: SplitTransactionDto,
    postedBy: string,
  ): Promise<JournalEntry> {
    const sourceType = dto.source_type ?? 'business';

    // ── 1. Load raw transaction ──────────────────────────────────────────────
    const rawTx = await this.rawTxRepo.findOne({
      where: { id: rawTransactionId, business_id: businessId },
    });
    if (!rawTx) {
      throw new NotFoundException(`Raw transaction ${rawTransactionId} not found`);
    }

    // ── 2. Guard: must not already be posted ─────────────────────────────────
    if (rawTx.status === RawTransactionStatus.POSTED) {
      throw new BadRequestException('This transaction has already been posted');
    }

    // ── 3. Guard: must not already be split ──────────────────────────────────
    const existingSplit = await this.splitRepo.findOne({
      where: { raw_transaction_id: rawTransactionId, business_id: businessId },
    });
    if (existingSplit) {
      throw new BadRequestException('This transaction has already been split');
    }

    // ── 4. Validate splits array ─────────────────────────────────────────────
    if (!dto.splits || dto.splits.length < 2) {
      throw new BadRequestException('A split transaction must have at least 2 lines');
    }

    const rawAmount = Math.abs(Number(rawTx.amount));
    const splitTotal = dto.splits.reduce((sum, s) => sum + Number(s.amount), 0);

    if (Math.abs(splitTotal - rawAmount) > 0.01) {
      throw new BadRequestException(
        `Split amounts (${splitTotal.toFixed(2)}) must equal the transaction amount (${rawAmount.toFixed(2)})`,
      );
    }

    // ── 5. Validate business split accounts belong to this business ──────────
    const businessLines = dto.splits.filter((s) => !s.is_personal);
    const businessAccountIds = businessLines.map((s) => s.account_id);

    if (businessAccountIds.length === 0) {
      throw new BadRequestException('At least one split line must be tagged as Business');
    }

    const splitAccounts = await this.accountRepo
      .createQueryBuilder('a')
      .where('a.id IN (:...ids)', { ids: businessAccountIds })
      .andWhere('a.business_id = :businessId', { businessId })
      .getMany();

    if (splitAccounts.length !== businessAccountIds.length) {
      throw new BadRequestException(
        'One or more business split accounts not found or do not belong to this business',
      );
    }

    // ── 6. Validate source account (business source only) ────────────────────
    let sourceAccount: Account | null = null;
    if (sourceType === 'business') {
      sourceAccount = await this.accountRepo.findOne({
        where: { id: dto.source_account_id, business_id: businessId },
      });
      if (!sourceAccount) {
        throw new BadRequestException('Source account not found or does not belong to this business');
      }
    }

    // ── 7. Look up equity accounts for Freelancer split logic ────────────────
    let ownerDrawAccount: Account | null = null;
    let ownerContribAccount: Account | null = null;

    const personalLines = dto.splits.filter((s) => s.is_personal);
    if (sourceType === 'personal') {
      // Personal source always needs Owner Contribution (for every business line posted)
      ownerContribAccount = await this.accountRepo.findOne({
        where: { business_id: businessId, account_subtype: AccountSubtype.OWNER_CONTRIBUTION },
      });
      if (!ownerContribAccount) {
        throw new BadRequestException(
          'No owner_contribution equity account found — cannot post business lines from personal source',
        );
      }
    } else if (personalLines.length > 0) {
      // Business source with personal lines → Owner Draw for the personal portion
      ownerDrawAccount = await this.accountRepo.findOne({
        where: { business_id: businessId, account_subtype: AccountSubtype.OWNER_DRAW },
      });
      if (!ownerDrawAccount) {
        throw new BadRequestException(
          'No owner_draw equity account found — cannot route personal split lines',
        );
      }
    }

    // ── 8. Post atomically ───────────────────────────────────────────────────
    return this.dataSource.transaction(async (manager) => {
      const entry = manager.create(JournalEntry, {
        business_id: businessId,
        entry_date: rawTx.transaction_date,
        description: `Split: ${rawTx.description}`,
        reference_type: 'split_transaction',
        reference_id: rawTransactionId,
        status: JournalEntryStatus.POSTED,
        created_by: postedBy,
        posted_by: postedBy,
        posted_at: new Date(),
      });
      const savedEntry = await manager.save(JournalEntry, entry) as JournalEntry;

      const lines: Partial<JournalLine>[] = [];

      if (sourceType === 'business') {
        // ── Business source: all lines debit, one credit to source bank ──────
        dto.splits.forEach((split, idx) => {
          if (split.is_personal) {
            // Personal line → Owner Draw
            lines.push({
              business_id: businessId,
              journal_entry_id: savedEntry.id,
              line_number: idx + 1,
              account_id: ownerDrawAccount!.id,
              debit_amount: Number(split.amount),
              credit_amount: 0,
              description: `${split.description ?? rawTx.description} (personal — owner draw)`,
              is_tax_line: false,
            });
          } else {
            // Business line → expense/asset account
            lines.push({
              business_id: businessId,
              journal_entry_id: savedEntry.id,
              line_number: idx + 1,
              account_id: split.account_id,
              debit_amount: Number(split.amount),
              credit_amount: 0,
              description: split.description ?? rawTx.description,
              is_tax_line: false,
            });
          }
        });

        // Single credit line for full gross to source bank account
        lines.push({
          business_id: businessId,
          journal_entry_id: savedEntry.id,
          line_number: dto.splits.length + 1,
          account_id: dto.source_account_id,
          debit_amount: 0,
          credit_amount: rawAmount,
          description: rawTx.description,
          is_tax_line: false,
        });

      } else {
        // ── Personal source: each business line is its own balanced entry ────
        // DR expense / CR Owner Contribution — per business line
        let lineNumber = 1;
        for (const split of dto.splits) {
          if (split.is_personal) continue; // personal lines produce no journal lines

          lines.push({
            business_id: businessId,
            journal_entry_id: savedEntry.id,
            line_number: lineNumber++,
            account_id: split.account_id,
            debit_amount: Number(split.amount),
            credit_amount: 0,
            description: split.description ?? rawTx.description,
            is_tax_line: false,
          });
          lines.push({
            business_id: businessId,
            journal_entry_id: savedEntry.id,
            line_number: lineNumber++,
            account_id: ownerContribAccount!.id,
            debit_amount: 0,
            credit_amount: Number(split.amount),
            description: `Owner Contribution: ${split.description ?? rawTx.description}`,
            is_tax_line: false,
          });
        }
      }

      await manager.save(
        JournalLine,
        lines.map((l) => manager.create(JournalLine, l)),
      );

      // ── 8c. Create TransactionSplit records (all lines, for audit) ──────────
      const splitRecords = dto.splits.map((split, idx) =>
        manager.create(TransactionSplit, {
          business_id: businessId,
          raw_transaction_id: rawTransactionId,
          split_number: idx + 1,
          amount: Number(split.amount),
          description: split.description ?? null,
          account_id: split.account_id,
          tax_code_id: split.tax_code_id ?? null,
        }),
      );
      await manager.save(TransactionSplit, splitRecords);

      // ── 8d. Create or update ClassifiedTransaction ───────────────────────────
      const existing = await this.classifiedRepo.findOne({
        where: { raw_transaction_id: rawTransactionId, business_id: businessId },
      });

      if (existing) {
        await manager.update(ClassifiedTransaction, existing.id, {
          is_posted: true,
          is_split: true,
          split_count: dto.splits.length,
          posted_journal_entry_id: savedEntry.id,
          classification_method: ClassificationMethod.SPLIT,
        });
      } else {
        const ct = manager.create(ClassifiedTransaction, {
          business_id: businessId,
          raw_transaction_id: rawTransactionId,
          classification_method: ClassificationMethod.SPLIT,
          account_id: dto.source_account_id || businessLines[0]?.account_id,
          classified_by: postedBy,
          is_posted: true,
          is_split: true,
          split_count: dto.splits.length,
          posted_journal_entry_id: savedEntry.id,
        });
        await manager.save(ClassifiedTransaction, ct);
      }

      // ── 8e. Mark raw transaction as posted ───────────────────────────────────
      await manager.update(RawTransaction, rawTransactionId, {
        status: RawTransactionStatus.POSTED,
      });

      return savedEntry;
    });
  }

  /**
   * GET /classification/raw/:id/splits
   */
  async getSplitLines(
    businessId: string,
    rawTransactionId: string,
  ): Promise<TransactionSplit[]> {
    const rawTx = await this.rawTxRepo.findOne({
      where: { id: rawTransactionId, business_id: businessId },
    });
    if (!rawTx) {
      throw new NotFoundException(`Raw transaction ${rawTransactionId} not found`);
    }

    return this.splitRepo.find({
      where: { raw_transaction_id: rawTransactionId, business_id: businessId },
      relations: ['account'],
      order: { split_number: 'ASC' },
    });
  }
}
