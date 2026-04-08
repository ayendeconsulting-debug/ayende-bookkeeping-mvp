import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, Between } from 'typeorm';
import { ClassifiedTransaction, ClassificationMethod } from '../../entities/classified-transaction.entity';
import { RawTransaction, RawTransactionStatus } from '../../entities/raw-transaction.entity';
import { Account, AccountType } from '../../entities/account.entity';
import { JournalEntry, JournalEntryStatus } from '../../entities/journal-entry.entity';
import { JournalLine } from '../../entities/journal-line.entity';
import { MarkTransferDto } from '../dto/transfer-transaction.dto';

@Injectable()
export class TransferService {
  constructor(
    @InjectRepository(RawTransaction)
    private readonly rawTxRepo: Repository<RawTransaction>,
    @InjectRepository(ClassifiedTransaction)
    private readonly classifiedRepo: Repository<ClassifiedTransaction>,
    @InjectRepository(Account)
    private readonly accountRepo: Repository<Account>,
    @InjectRepository(JournalEntry)
    private readonly journalEntryRepo: Repository<JournalEntry>,
    @InjectRepository(JournalLine)
    private readonly journalLineRepo: Repository<JournalLine>,
    private readonly dataSource: DataSource,
  ) {}

  /**
   * PATCH /classification/raw/:id/mark-transfer
   * Marks a raw transaction as a transfer between two accounts.
   * Posts a balanced journal entry: Debit destination, Credit source.
   * Attempts to find and mark the counter-leg transaction automatically.
   */
  async markAsTransfer(
    businessId: string,
    rawTransactionId: string,
    dto: MarkTransferDto,
    postedBy: string,
  ): Promise<JournalEntry> {
    // ── 1. Load raw transaction ───────────────────────────────────────────
    const rawTx = await this.rawTxRepo.findOne({
      where: { id: rawTransactionId, business_id: businessId },
    });
    if (!rawTx) {
      throw new NotFoundException(`Raw transaction ${rawTransactionId} not found`);
    }

    // ── 2. Guard: not already posted ──────────────────────────────────────
    if (rawTx.status === RawTransactionStatus.POSTED) {
      throw new BadRequestException('This transaction has already been posted');
    }

    // ── 3. Guard: not already marked as transfer ──────────────────────────
    const existingCt = await this.classifiedRepo.findOne({
      where: { raw_transaction_id: rawTransactionId, business_id: businessId, is_transfer: true },
    });
    if (existingCt) {
      throw new BadRequestException('This transaction has already been marked as a transfer');
    }

    // ── 4. Validate source account ────────────────────────────────────────
    const sourceAccount = await this.accountRepo.findOne({
      where: { id: dto.source_account_id, business_id: businessId },
    });
    if (!sourceAccount) {
      throw new BadRequestException('Source account not found or does not belong to this business');
    }
    if (
      sourceAccount.account_type !== AccountType.ASSET &&
      sourceAccount.account_type !== AccountType.LIABILITY
    ) {
      throw new BadRequestException('Source account must be an asset or liability account (bank or credit card)');
    }

    // ── 5. Validate destination account ──────────────────────────────────
    const destinationAccount = await this.accountRepo.findOne({
      where: { id: dto.destination_account_id, business_id: businessId },
    });
    if (!destinationAccount) {
      throw new BadRequestException('Destination account not found or does not belong to this business');
    }
    if (
      destinationAccount.account_type !== AccountType.ASSET &&
      destinationAccount.account_type !== AccountType.LIABILITY
    ) {
      throw new BadRequestException('Destination account must be an asset or liability account (bank or credit card)');
    }
    if (dto.source_account_id === dto.destination_account_id) {
      throw new BadRequestException('Source and destination accounts must be different');
    }

    const amount = Math.abs(Number(rawTx.amount));

    // ── 6. Post atomically ────────────────────────────────────────────────
    return this.dataSource.transaction(async (manager) => {
      // 6a. Create journal entry
      const entry = manager.create(JournalEntry, {
        business_id: businessId,
        entry_date: rawTx.transaction_date,
        description: `Transfer: ${rawTx.description}`,
        reference_type: 'transfer',
        reference_id: rawTransactionId,
        status: JournalEntryStatus.POSTED,
        created_by: postedBy,
        posted_by: postedBy,
        posted_at: new Date(),
      });
      const savedEntry = await manager.save(JournalEntry, entry) as JournalEntry;

      // 6b. Journal lines: Debit destination, Credit source
      await manager.save(JournalLine, [
        manager.create(JournalLine, {
          business_id: businessId,
          journal_entry_id: savedEntry.id,
          line_number: 1,
          account_id: dto.destination_account_id,
          debit_amount: amount,
          credit_amount: 0,
          description: `Transfer in: ${rawTx.description}`,
          is_tax_line: false,
        }),
        manager.create(JournalLine, {
          business_id: businessId,
          journal_entry_id: savedEntry.id,
          line_number: 2,
          account_id: dto.source_account_id,
          debit_amount: 0,
          credit_amount: amount,
          description: `Transfer out: ${rawTx.description}`,
          is_tax_line: false,
        }),
      ]);

      // 6c. Create classified_transaction marked as transfer
      const existingAny = await this.classifiedRepo.findOne({
        where: { raw_transaction_id: rawTransactionId, business_id: businessId },
      });

      let primaryCtId: string;

      if (existingAny) {
        await manager.update(ClassifiedTransaction, existingAny.id, {
          is_posted: true,
          is_transfer: true,
          destination_account_id: dto.destination_account_id,
          posted_journal_entry_id: savedEntry.id,
          classification_method: ClassificationMethod.MANUAL,
        });
        primaryCtId = existingAny.id;
      } else {
        const ct = manager.create(ClassifiedTransaction, {
          business_id: businessId,
          raw_transaction_id: rawTransactionId,
          classification_method: ClassificationMethod.MANUAL,
          account_id: dto.source_account_id,
          classified_by: postedBy,
          is_posted: true,
          is_transfer: true,
          destination_account_id: dto.destination_account_id,
          posted_journal_entry_id: savedEntry.id,
        });
        const saved = await manager.save(ClassifiedTransaction, ct) as ClassifiedTransaction;
        primaryCtId = saved.id;
      }

      // 6d. Mark raw transaction as posted
      await manager.update(RawTransaction, rawTransactionId, {
        status: RawTransactionStatus.POSTED,
      });

      // 6e. Attempt to find and pair counter-leg (best-effort — never fails the transaction)
      try {
        const counterLeg = await this.findCounterLeg(
          businessId,
          rawTransactionId,
          amount,
          rawTx.transaction_date,
          dto.destination_account_id,
        );

        if (counterLeg) {
          const counterExisting = await this.classifiedRepo.findOne({
            where: { raw_transaction_id: counterLeg.id, business_id: businessId },
          });

          if (counterExisting) {
            await manager.update(ClassifiedTransaction, counterExisting.id, {
              is_transfer: true,
              transfer_pair_id: primaryCtId,
            });
          } else {
            await manager.save(
              ClassifiedTransaction,
              manager.create(ClassifiedTransaction, {
                business_id: businessId,
                raw_transaction_id: counterLeg.id,
                classification_method: ClassificationMethod.MANUAL,
                account_id: dto.destination_account_id,
                classified_by: 'system',
                is_posted: true,
                is_transfer: true,
                transfer_pair_id: primaryCtId,
                destination_account_id: dto.source_account_id,
                posted_journal_entry_id: savedEntry.id,
              }),
            );
          }

          await manager.update(RawTransaction, counterLeg.id, {
            status: RawTransactionStatus.POSTED,
          });

          // Update primary CT with pair reference
          await manager.update(ClassifiedTransaction, primaryCtId, {
            transfer_pair_id: counterExisting?.id ?? undefined,
          });
        }
      } catch {
        // Counter-leg matching is best-effort — never block the main transfer
      }

      return savedEntry;
    });
  }

  /**
   * Looks for a counter-leg transaction:
   * - Same business
   * - Same absolute amount
   * - Within a 2-day window of the transfer date
   * - Different raw transaction ID
   * - Not already posted
   */
  private async findCounterLeg(
    businessId: string,
    excludeId: string,
    amount: number,
    date: Date,
    destinationAccountId: string,
  ): Promise<RawTransaction | null> {
    const txDate = date instanceof Date ? date : new Date(date);
    const windowStart = new Date(txDate);
    windowStart.setDate(windowStart.getDate() - 2);
    const windowEnd = new Date(txDate);
    windowEnd.setDate(windowEnd.getDate() + 2);

    // Look for a pending/classified transaction with the matching amount in the window
    const candidates = await this.rawTxRepo
      .createQueryBuilder('rt')
      .where('rt.business_id = :businessId', { businessId })
      .andWhere('rt.id != :excludeId', { excludeId })
      .andWhere('rt.status IN (:...statuses)', {
        statuses: [RawTransactionStatus.PENDING, RawTransactionStatus.CLASSIFIED],
      })
      .andWhere('rt.transaction_date BETWEEN :start AND :end', {
        start: windowStart,
        end: windowEnd,
      })
      .getMany();

    // Match on absolute amount
    return (
      candidates.find(
        (c) => Math.abs(Math.abs(Number(c.amount)) - amount) < 0.01,
      ) ?? null
    );
  }
}
