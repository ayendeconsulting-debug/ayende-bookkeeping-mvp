import {
  Injectable,
  NotFoundException,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FiscalYear } from '../entities/fiscal-year.entity';
import { JournalEntry, JournalEntryStatus } from '../entities/journal-entry.entity';

export interface FiscalYearSummary {
  year: number;
  entry_count: number;
  is_locked: boolean;
  locked_at: Date | null;
  locked_by: string | null;
}

@Injectable()
export class FiscalYearLockService {
  constructor(
    @InjectRepository(FiscalYear)
    private readonly fiscalYearRepo: Repository<FiscalYear>,
    @InjectRepository(JournalEntry)
    private readonly journalEntryRepo: Repository<JournalEntry>,
  ) {}

  /**
   * GET /fiscal-years
   * Returns all years that have posted journal entries, with lock status.
   */
  async getFiscalYears(businessId: string): Promise<FiscalYearSummary[]> {
    // Get distinct years from posted journal entries
    const rows = await this.journalEntryRepo
      .createQueryBuilder('je')
      .select("EXTRACT(YEAR FROM je.entry_date)::integer", 'year')
      .addSelect('COUNT(je.id)', 'entry_count')
      .where('je.business_id = :businessId', { businessId })
      .andWhere('je.status = :status', { status: JournalEntryStatus.POSTED })
      .groupBy('EXTRACT(YEAR FROM je.entry_date)')
      .orderBy('EXTRACT(YEAR FROM je.entry_date)', 'DESC')
      .getRawMany();

    if (rows.length === 0) return [];

    // Load fiscal year lock records for this business
    const fiscalYears = await this.fiscalYearRepo.find({
      where: { business_id: businessId },
    });

    return rows.map((row) => {
      const year = Number(row.year);
      const fy = fiscalYears.find((f) => f.year_number === year);
      return {
        year,
        entry_count: Number(row.entry_count),
        is_locked: fy?.is_locked ?? false,
        locked_at: fy?.locked_at ?? null,
        locked_by: fy?.locked_by ?? null,
      };
    });
  }

  /**
   * POST /fiscal-years/:year/lock
   * Locks a fiscal year. Idempotent — no error if already locked.
   */
  async lockYear(
    businessId: string,
    year: number,
    lockedByUserId: string,
  ): Promise<FiscalYearSummary> {
    let fy = await this.fiscalYearRepo.findOne({
      where: { business_id: businessId, year_number: year },
    });

    if (fy) {
      if (fy.is_locked) {
        // Already locked — return current state (idempotent)
        return this.toSummary(fy, businessId);
      }
      fy.is_locked = true;
      fy.locked_by = lockedByUserId;
      fy.locked_at = new Date();
      const saved = await this.fiscalYearRepo.save(fy);
      return this.toSummary(saved, businessId);
    }

    // No fiscal year record yet — create one
    const newFy = this.fiscalYearRepo.create({
      business_id: businessId,
      year_number: year,
      start_date: new Date(year, 0, 1),
      end_date: new Date(year, 11, 31),
      is_locked: true,
      locked_by: lockedByUserId,
      locked_at: new Date(),
    });
    const saved = await this.fiscalYearRepo.save(newFy);
    return this.toSummary(saved, businessId);
  }

  /**
   * DELETE /fiscal-years/:year/lock
   * Unlocks a fiscal year. Admin/support use only — not exposed in UI.
   */
  async unlockYear(businessId: string, year: number): Promise<FiscalYearSummary> {
    const fy = await this.fiscalYearRepo.findOne({
      where: { business_id: businessId, year_number: year },
    });
    if (!fy) {
      throw new NotFoundException(`No fiscal year record found for year ${year}`);
    }
    fy.is_locked = false;
    fy.locked_by = null;
    fy.locked_at = null;
    const saved = await this.fiscalYearRepo.save(fy);
    return this.toSummary(saved, businessId);
  }

  /**
   * Returns true if the given date falls within a locked fiscal year.
   * Used by JournalEntryService to guard write operations.
   */
  async isLocked(businessId: string, date: Date): Promise<boolean> {
    const year = (date instanceof Date ? date : new Date(date)).getFullYear();
    const fy = await this.fiscalYearRepo.findOne({
      where: { business_id: businessId, year_number: year },
    });
    return fy?.is_locked ?? false;
  }

  /**
   * Throws HTTP 423 if the given date falls in a locked fiscal year.
   */
  async assertNotLocked(businessId: string, date: Date): Promise<void> {
    const locked = await this.isLocked(businessId, date);
    if (locked) {
      throw new HttpException(
        'This fiscal year is locked. Contact support to make changes.',
        HttpStatus.LOCKED, // 423
      );
    }
  }

  private async toSummary(fy: FiscalYear, businessId: string): Promise<FiscalYearSummary> {
    const row = await this.journalEntryRepo
      .createQueryBuilder('je')
      .select('COUNT(je.id)', 'entry_count')
      .where('je.business_id = :businessId', { businessId })
      .andWhere('je.status = :status', { status: JournalEntryStatus.POSTED })
      .andWhere("EXTRACT(YEAR FROM je.entry_date) = :year", { year: fy.year_number })
      .getRawOne();

    return {
      year: fy.year_number,
      entry_count: Number(row?.entry_count ?? 0),
      is_locked: fy.is_locked,
      locked_at: fy.locked_at ?? null,
      locked_by: fy.locked_by ?? null,
    };
  }
}
