import {
  Injectable,
  BadRequestException,
  NotFoundException,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { JournalEntry, JournalEntryStatus } from '../../entities/journal-entry.entity';
import { JournalLine } from '../../entities/journal-line.entity';
import { Account } from '../../entities/account.entity';
import { FiscalYear } from '../../entities/fiscal-year.entity';
import { CreateJournalEntryDto, PostJournalEntryDto } from './dto/create-journal-entry.dto';

@Injectable()
export class JournalEntryService {
  constructor(
    @InjectRepository(JournalEntry)
    private journalEntryRepository: Repository<JournalEntry>,
    @InjectRepository(JournalLine)
    private journalLineRepository: Repository<JournalLine>,
    @InjectRepository(Account)
    private accountRepository: Repository<Account>,
    @InjectRepository(FiscalYear)
    private fiscalYearRepository: Repository<FiscalYear>,
    private dataSource: DataSource,
  ) {}

  // ── Fiscal Year Lock Guard ────────────────────────────────────────────────

  /**
   * Throws HTTP 423 if the given date falls within a locked fiscal year.
   * Called before any write operation on journal entries.
   */
  private async assertNotLocked(businessId: string, date: Date): Promise<void> {
    const entryDate = date instanceof Date ? date : new Date(date);
    const year = entryDate.getFullYear();
    const fy = await this.fiscalYearRepository.findOne({
      where: { business_id: businessId, year_number: year },
    });
    if (fy?.is_locked) {
      throw new HttpException(
        'This fiscal year is locked. Contact support to make changes.',
        HttpStatus.LOCKED, // 423
      );
    }
  }

  // ── Journal Entry Operations ──────────────────────────────────────────────

  /**
   * Create a journal entry in DRAFT status
   * Validates that debits = credits before saving
   */
  async createJournalEntry(
    dto: CreateJournalEntryDto,
    userId: string,
  ): Promise<JournalEntry> {
    // Validation 1: Must have at least 2 lines (double-entry requirement)
    if (dto.lines.length < 2) {
      throw new BadRequestException(
        'Journal entry must have at least 2 lines (double-entry requirement)',
      );
    }

    // Validation 2: Each line must be either debit OR credit, not both
    for (const line of dto.lines) {
      if (line.debit_amount > 0 && line.credit_amount > 0) {
        throw new BadRequestException(
          `Line ${line.line_number}: Cannot have both debit and credit amounts`,
        );
      }
      if (line.debit_amount === 0 && line.credit_amount === 0) {
        throw new BadRequestException(
          `Line ${line.line_number}: Must have either debit or credit amount`,
        );
      }
    }

    // Validation 3: CRITICAL - Debits must equal credits
    const totalDebits = dto.lines.reduce((sum, line) => sum + line.debit_amount, 0);
    const totalCredits = dto.lines.reduce((sum, line) => sum + line.credit_amount, 0);

    if (Math.abs(totalDebits - totalCredits) > 0.01) {
      throw new BadRequestException(
        `Journal entry is not balanced. Debits: ${totalDebits}, Credits: ${totalCredits}`,
      );
    }

    // Validation 4: All accounts must exist and belong to the business
    const accountIds = dto.lines.map((line) => line.account_id);
    const accounts = await this.accountRepository.find({
      where: accountIds.map((id) => ({ id, business_id: dto.business_id })),
    });

    if (accounts.length !== accountIds.length) {
      throw new BadRequestException(
        'One or more accounts not found or do not belong to this business',
      );
    }

    // Use transaction to ensure atomicity
    return this.dataSource.transaction(async (manager) => {
      const entryDate = typeof dto.entry_date === 'string'
        ? new Date(dto.entry_date)
        : dto.entry_date;

      const entryNumber = await this.generateEntryNumber(dto.business_id, entryDate);

      const journalEntry = manager.create(JournalEntry, {
        business_id: dto.business_id,
        entry_number: entryNumber,
        entry_date: entryDate,
        description: dto.description,
        reference_type: dto.reference_type,
        reference_id: dto.reference_id,
        notes: dto.notes,
        status: JournalEntryStatus.DRAFT,
        created_by: userId,
      });

      const savedEntry = await manager.save(JournalEntry, journalEntry) as JournalEntry;

      const journalLines = dto.lines.map((lineDto) =>
        manager.create(JournalLine, {
          business_id: dto.business_id,
          journal_entry_id: savedEntry.id,
          line_number: lineDto.line_number,
          account_id: lineDto.account_id,
          debit_amount: lineDto.debit_amount,
          credit_amount: lineDto.credit_amount,
          description: lineDto.description || dto.description,
        }),
      );

      await manager.save(JournalLine, journalLines);

      const result = await manager.findOne(JournalEntry, {
        where: { id: savedEntry.id },
        relations: ['lines', 'lines.account'],
      });

      if (!result) throw new Error('Failed to retrieve created journal entry');
      return result;
    });
  }

  /**
   * Post a journal entry (make it permanent)
   * Re-validates balance and checks fiscal year lock before posting.
   */
  async postJournalEntry(dto: PostJournalEntryDto): Promise<JournalEntry> {
    const entry = await this.journalEntryRepository.findOne({
      where: { id: dto.journal_entry_id },
      relations: ['lines'],
    });

    if (!entry) throw new NotFoundException('Journal entry not found');

    if (entry.status !== JournalEntryStatus.DRAFT) {
      throw new BadRequestException(`Cannot post entry with status: ${entry.status}`);
    }

    // Phase 14: fiscal year lock check
    await this.assertNotLocked(entry.business_id, entry.entry_date);

    // Re-validate balance before posting
    const totalDebits = entry.lines.reduce((sum, line) => sum + Number(line.debit_amount), 0);
    const totalCredits = entry.lines.reduce((sum, line) => sum + Number(line.credit_amount), 0);

    if (Math.abs(totalDebits - totalCredits) > 0.01) {
      throw new BadRequestException('Cannot post unbalanced journal entry.');
    }

    entry.status = JournalEntryStatus.POSTED;
    entry.posted_by = dto.posted_by;
    entry.posted_at = new Date();

    return this.journalEntryRepository.save(entry);
  }

  /**
   * Get journal entry by ID
   */
  async getJournalEntry(id: string, businessId: string): Promise<JournalEntry> {
    const entry = await this.journalEntryRepository.findOne({
      where: { id, business_id: businessId },
      relations: ['lines', 'lines.account', 'createdBy', 'postedBy'],
    });

    if (!entry) throw new NotFoundException('Journal entry not found');
    return entry;
  }

  /**
   * Get all journal entries for a business
   */
  async getJournalEntries(
    businessId: string,
    status?: JournalEntryStatus,
  ): Promise<JournalEntry[]> {
    const where: any = { business_id: businessId };
    if (status) where.status = status;

    return this.journalEntryRepository.find({
      where,
      relations: ['lines', 'lines.account'],
      order: { entry_date: 'DESC', entry_number: 'DESC' },
    });
  }

  /**
   * Delete a draft journal entry.
   * Also checks fiscal year lock — even draft entries in a locked year cannot be deleted.
   */
  async deleteJournalEntry(id: string, businessId: string): Promise<void> {
    const entry = await this.journalEntryRepository.findOne({
      where: { id, business_id: businessId },
    });

    if (!entry) throw new NotFoundException('Journal entry not found');

    if (entry.status !== JournalEntryStatus.DRAFT) {
      throw new BadRequestException('Cannot delete posted or locked journal entries');
    }

    // Phase 14: fiscal year lock check
    await this.assertNotLocked(businessId, entry.entry_date);

    await this.journalEntryRepository.remove(entry);
  }

  /**
   * Generate unique entry number: JE-YYYY-00001
   */
  private async generateEntryNumber(businessId: string, entryDate: Date): Promise<string> {
    const year = entryDate.getFullYear();

    const lastEntry = await this.journalEntryRepository
      .createQueryBuilder('je')
      .where('je.business_id = :businessId', { businessId })
      .andWhere('je.entry_number LIKE :pattern', { pattern: `JE-${year}-%` })
      .orderBy('je.entry_number', 'DESC')
      .getOne();

    let sequence = 1;
    if (lastEntry?.entry_number) {
      const match = lastEntry.entry_number.match(/JE-\d{4}-(\d+)/);
      if (match) sequence = parseInt(match[1], 10) + 1;
    }

    return `JE-${year}-${sequence.toString().padStart(5, '0')}`;
  }
}
