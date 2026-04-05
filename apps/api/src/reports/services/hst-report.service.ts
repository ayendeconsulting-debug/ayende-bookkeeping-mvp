import { Injectable, Logger } from '@nestjs/common';
import { ItcService, ItcResult } from './itc.service';

export interface HstPositionResult extends ItcResult {
  // Indicator for the dashboard card colour:
  // 'owing' = positive net (business owes CRA) — amber
  // 'refund' = negative net (CRA owes business) — green
  // 'nil' = zero net — neutral
  position_indicator: 'owing' | 'refund' | 'nil';
}

@Injectable()
export class HstReportService {
  private readonly logger = new Logger(HstReportService.name);

  constructor(private readonly itcService: ItcService) {}

  // ── HST Position (dashboard widget) ──────────────────────────────────────
  // Defaults to current calendar quarter when no dates are supplied
  async getPosition(
    businessId: string,
    startDate?: string,
    endDate?: string,
  ): Promise<HstPositionResult> {
    const { periodStart, periodEnd } = this.resolvePeriod(startDate, endDate);

    this.logger.debug(
      `HST position for ${businessId}: ${periodStart} → ${periodEnd}`,
    );

    const itc = await this.itcService.calculate(businessId, periodStart, periodEnd);

    const indicator: 'owing' | 'refund' | 'nil' =
      itc.net_tax_owing > 0
        ? 'owing'
        : itc.net_tax_owing < 0
        ? 'refund'
        : 'nil';

    return {
      ...itc,
      position_indicator: indicator,
    };
  }

  // ── Quarter resolution ────────────────────────────────────────────────────
  // Returns YYYY-MM-DD strings for the current calendar quarter
  private resolvePeriod(
    startDate?: string,
    endDate?: string,
  ): { periodStart: string; periodEnd: string } {
    if (startDate && endDate) {
      return { periodStart: startDate, periodEnd: endDate };
    }

    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth(); // 0-indexed

    // Determine quarter
    const quarterStartMonth = Math.floor(month / 3) * 3; // 0, 3, 6, or 9
    const quarterEndMonth = quarterStartMonth + 2;

    // Last day of quarter end month
    const lastDay = new Date(year, quarterEndMonth + 1, 0).getDate();

    const pad = (n: number) => String(n).padStart(2, '0');

    const periodStart = `${year}-${pad(quarterStartMonth + 1)}-01`;
    const periodEnd = `${year}-${pad(quarterEndMonth + 1)}-${pad(lastDay)}`;

    return { periodStart, periodEnd };
  }
}
