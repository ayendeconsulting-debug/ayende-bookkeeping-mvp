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
import { Account, AccountType } from '../../entities/account.entity';
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
   * Validates splits, creates TransactionSplit records, posts a balanced journal entry,
   * and marks the raw transaction + classified transaction as split.
   */
  async postSplitTransaction(
    businessId: string,
    rawTransactionId: string,
    dto: SplitTransactionDto,
    postedBy: string,
  ): Promise<JournalEntry> {
    // ── 1. Load raw transaction ────────────────────────────────────────────
    const rawTx = await this.rawTxRepo.findOne({
      where: { id: rawTransactionId, business_id: businessId },
    });
    if (!rawTx) {
      throw new NotFoundException(`Raw transaction ${rawTransactionId} not found`);
    }

    // ── 2. Guard: must be pending/classified, not already posted ──────────
    if (rawTx.status === RawTransactionStatus.POSTED) {
      throw new BadRequestException('This transaction has already been posted');
    }

    // ── 3. Guard: already split ───────────────────────────────────────────
    const existingSplit = await this.splitRepo.findOne({
      where: { raw_transaction_id: rawTransactionId, business_id: businessId },
    });
    if (existingSplit) {
      throw new BadRequestException('This transaction has already been split');
    }

    // ── 4. Validate splits array ──────────────────────────────────────────
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

    // ── 5. Validate all split accounts belong to this business ────────────
    const splitAccountIds = dto.splits.map((s) => s.account_id);
    const splitAccounts = await this.accountRepo
      .createQueryBuilder('a')
      .where('a.id IN (:...ids)', { ids: splitAccountIds })
      .andWhere('a.business_id = :businessId', { businessId })
      .getMany();

    if (splitAccounts.length !== splitAccountIds.length) {
      throw new BadRequestException(
        'One or more split accounts not found or do not belong to this business',
      );
    }

    // ── 6. Validate source account ────────────────────────────────────────
    const sourceAccount = await this.accountRepo.findOne({
      where: { id: dto.source_account_id, business_id: businessId },
    });
    if (!sourceAccount) {
      throw new BadRequestException('Source account not found or does not belong to this business');
    }

    // ── 7. Post atomically ────────────────────────────────────────────────
    return this.dataSource.transaction(async (manager) => {
      // 7a. Create the journal entry
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

      // 7b. Create one debit line per split + one credit line for source account
      const lines: Partial<JournalLine>[] = dto.splits.map((split, idx) => ({
        business_id: businessId,
        journal_entry_id: savedEntry.id,
        line_number: idx + 1,
        account_id: split.account_id,
        debit_amount: Number(split.amount),
        credit_amount: 0,
        description: split.description ?? rawTx.description,
        is_tax_line: false,
      }));

      // Credit line: source account for full raw amount
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

      await manager.save(
        JournalLine,
        lines.map((l) => manager.create(JournalLine, l)),
      );

      // 7c. Create TransactionSplit records
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

      // 7d. Create or update the ClassifiedTransaction to mark as split + posted
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
          account_id: dto.source_account_id,
          classified_by: postedBy,
          is_posted: true,
          is_split: true,
          split_count: dto.splits.length,
          posted_journal_entry_id: savedEntry.id,
        });
        await manager.save(ClassifiedTransaction, ct);
      }

      // 7e. Mark raw transaction as posted
      await manager.update(RawTransaction, rawTransactionId, {
        status: RawTransactionStatus.POSTED,
      });

      return savedEntry;
    });
  }

  /**
   * GET /classification/raw/:id/splits
   * Returns all split lines for a transaction.
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
