import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  UnprocessableEntityException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { HstPeriod, HstPeriodStatus } from '../../entities/hst-period.entity';
import { ClassifiedTransaction } from '../../entities/classified-transaction.entity';
import { CreateHSTPeriodDto } from '../dto/hst-period.dto';

@Injectable()
export class HstPeriodService {
  private readonly logger = new Logger(HstPeriodService.name);

  constructor(
    @InjectRepository(HstPeriod)
    private readonly periodRepo: Repository<HstPeriod>,
    @InjectRepository(ClassifiedTransaction)
    private readonly classifiedTxRepo: Repository<ClassifiedTransaction>,
  ) {}

  // ── Create ────────────────────────────────────────────────────────────────
  async create(businessId: string, dto: CreateHSTPeriodDto): Promise<HstPeriod> {
    // Validate dates
    const start = new Date(dto.period_start);
    const end = new Date(dto.period_end);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      throw new BadRequestException('Invalid date format. Use YYYY-MM-DD.');
    }
    if (end <= start) {
      throw new BadRequestException('period_end must be after period_start.');
    }

    // Check for overlapping periods
    await this.validateNoOverlap(businessId, dto.period_start, dto.period_end);

    const period = this.periodRepo.create({
      business_id: businessId,
      period_start: dto.period_start,
      period_end: dto.period_end,
      frequency: dto.frequency,
      status: HstPeriodStatus.OPEN,
    });

    const saved = await this.periodRepo.save(period);
    this.logger.log(
      `HST period created for business ${businessId}: ${dto.period_start} to ${dto.period_end}`,
    );
    return saved;
  }

  // ── Find all ──────────────────────────────────────────────────────────────
  async findAll(businessId: string): Promise<HstPeriod[]> {
    return this.periodRepo.find({
      where: { business_id: businessId },
      order: { period_start: 'DESC' },
    });
  }

  // ── Find one ──────────────────────────────────────────────────────────────
  async findOne(businessId: string, id: string): Promise<HstPeriod> {
    const period = await this.periodRepo.findOne({
      where: { id, business_id: businessId },
    });
    if (!period) {
      throw new NotFoundException(`HST period ${id} not found.`);
    }
    return period;
  }

  // ── File a period ─────────────────────────────────────────────────────────
  // Transitions open → filed
  // Rejects if any unposted transactions exist within the period date range
  async file(businessId: string, id: string, filedBy: string): Promise<HstPeriod> {
    const period = await this.findOne(businessId, id);

    if (period.status !== HstPeriodStatus.OPEN) {
      throw new BadRequestException(
        `Period cannot be filed — current status is '${period.status}'. Only open periods can be filed.`,
      );
    }

    // Check for unposted transactions in the period date range
    const unpostedCount = await this.countUnpostedTransactions(
      businessId,
      period.period_start,
      period.period_end,
    );

    if (unpostedCount > 0) {
      throw new UnprocessableEntityException({
        message: `Cannot file period — ${unpostedCount} unposted transaction(s) exist within this period. Post all transactions before filing.`,
        unposted_count: unpostedCount,
        period_start: period.period_start,
        period_end: period.period_end,
      });
    }

    period.status = HstPeriodStatus.FILED;
    period.filed_at = new Date();
    period.filed_by = filedBy;

    const saved = await this.periodRepo.save(period);
    this.logger.log(`HST period ${id} filed by ${filedBy}`);
    return saved;
  }

  // ── Lock a period ─────────────────────────────────────────────────────────
  // Transitions filed → locked
  async lock(businessId: string, id: string): Promise<HstPeriod> {
    const period = await this.findOne(businessId, id);

    if (period.status !== HstPeriodStatus.FILED) {
      throw new BadRequestException(
        `Period cannot be locked — current status is '${period.status}'. Only filed periods can be locked.`,
      );
    }

    period.status = HstPeriodStatus.LOCKED;
    period.locked_at = new Date();

    const saved = await this.periodRepo.save(period);
    this.logger.log(`HST period ${id} locked for business ${businessId}`);
    return saved;
  }

  // ── Check if a date falls within any locked period ────────────────────────
  // Used by ClassificationService before posting journal entries
  async isDateInLockedPeriod(
    businessId: string,
    entryDate: string,
  ): Promise<HstPeriod | null> {
    const locked = await this.periodRepo
      .createQueryBuilder('p')
      .where('p.business_id = :businessId', { businessId })
      .andWhere('p.status = :status', { status: HstPeriodStatus.LOCKED })
      .andWhere('p.period_start <= :date', { date: entryDate })
      .andWhere('p.period_end >= :date', { date: entryDate })
      .getOne();

    return locked ?? null;
  }

  // ── Private helpers ───────────────────────────────────────────────────────

  private async validateNoOverlap(
    businessId: string,
    periodStart: string,
    periodEnd: string,
    excludeId?: string,
  ): Promise<void> {
    const qb = this.periodRepo
      .createQueryBuilder('p')
      .where('p.business_id = :businessId', { businessId })
      // Overlap condition: existing.start <= new.end AND existing.end >= new.start
      .andWhere('p.period_start <= :periodEnd', { periodEnd })
      .andWhere('p.period_end >= :periodStart', { periodStart });

    if (excludeId) {
      qb.andWhere('p.id != :excludeId', { excludeId });
    }

    const overlapping = await qb.getOne();
    if (overlapping) {
      throw new ConflictException(
        `An HST period already exists that overlaps with ${periodStart} to ${periodEnd}. ` +
        `Existing period: ${overlapping.period_start} to ${overlapping.period_end} (${overlapping.status}).`,
      );
    }
  }

  private async countUnpostedTransactions(
    businessId: string,
    periodStart: string,
    periodEnd: string,
  ): Promise<number> {
    // Count classified transactions that are not yet posted within the date range
    return this.classifiedTxRepo
      .createQueryBuilder('ct')
      .innerJoin('ct.rawTransaction', 'rt')
      .where('ct.business_id = :businessId', { businessId })
      .andWhere('ct.is_posted = false')
      .andWhere('rt.date >= :periodStart', { periodStart })
      .andWhere('rt.date <= :periodEnd', { periodEnd })
      .getCount();
  }
}
