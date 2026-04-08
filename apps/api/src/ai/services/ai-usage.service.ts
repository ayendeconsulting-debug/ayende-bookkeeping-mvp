import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AiUsageLog } from '../../entities/ai-usage-log.entity';
import { Business } from '../../entities/business.entity';

export interface FirmUsageResult {
  used: number;
  cap: number;
  percentage: number;
}

@Injectable()
export class AiUsageService {
  constructor(
    @InjectRepository(AiUsageLog)
    private readonly usageRepo: Repository<AiUsageLog>,
    @InjectRepository(Business)
    private readonly businessRepo: Repository<Business>,
  ) {}

  /**
   * Count AI usage for a single business in the current calendar month.
   */
  async getBusinessUsage(businessId: string, monthStart: Date): Promise<number> {
    return this.usageRepo
      .createQueryBuilder('log')
      .where('log.business_id = :businessId', { businessId })
      .andWhere('log.used_at >= :monthStart', { monthStart })
      .getCount();
  }

  /**
   * Count AI usage across ALL client businesses under a firm in the current
   * calendar month. Used for Accountant plan firm-wide cap enforcement.
   * Cap is always 500 for the Accountant plan.
   */
  async getFirmUsage(firmId: string, monthStart: Date): Promise<FirmUsageResult> {
    const firmBusinesses = await this.businessRepo.find({
      where: { created_by_firm_id: firmId },
      select: ['id'],
    });

    if (firmBusinesses.length === 0) {
      return { used: 0, cap: 500, percentage: 0 };
    }

    const firmBusinessIds = firmBusinesses.map((b) => b.id);

    const used = await this.usageRepo
      .createQueryBuilder('log')
      .where('log.business_id IN (:...ids)', { ids: firmBusinessIds })
      .andWhere('log.used_at >= :monthStart', { monthStart })
      .getCount();

    const cap = 500;
    const percentage = Math.min(Math.round((used / cap) * 100), 100);
    return { used, cap, percentage };
  }

  /**
   * Returns the start of the current calendar month (UTC).
   */
  getCurrentMonthStart(): Date {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  }
}
