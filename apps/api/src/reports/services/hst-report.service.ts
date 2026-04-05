import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ItcService, ItcResult, ItcTransactionDetail } from './itc.service';
import { HstPeriodService } from './hst-period.service';
import { IncomeStatementService } from './income-statement.service';
import { HstPeriod } from '../../entities/hst-period.entity';

export interface HstPositionResult extends ItcResult {
  position_indicator: 'owing' | 'refund' | 'nil';
}

// ── GST34-aligned CRA Remittance Report ──────────────────────────────────────
export interface CraRemittanceReport {
  // Header
  business_id: string;
  period: HstPeriod;
  generated_at: string;

  // GST34 Lines
  line_101_total_sales: number;       // Total sales and other revenue
  line_103_hst_collected: number;     // GST/HST collected or collectible
  line_106_itc_claimed: number;       // Input tax credits
  line_109_net_tax: number;           // Net tax (Line 103 - Line 106)
  line_111_instalments: number;       // Instalments already paid (user-supplied, default 0)
  line_113_balance: number;           // Balance owing or refund (Line 109 - Line 111)

  // Summary
  total_input_tax: number;            // Gross input tax paid (before ITC recovery)
  total_itc_non_recoverable: number;  // Non-recoverable portion
  unposted_transaction_count: number; // Warning if > 0

  // Transaction breakdown
  transactions: ItcTransactionDetail[];

  // Disclaimer (always included — NFR-9.8)
  disclaimer: string;
}

const DISCLAIMER =
  'This report is produced by Tempo Books for reference purposes. ' +
  'It is not an official CRA filing. ' +
  'Please review with your accountant before submitting your GST34 return.';

@Injectable()
export class HstReportService {
  private readonly logger = new Logger(HstReportService.name);

  constructor(
    private readonly itcService: ItcService,
    private readonly hstPeriodService: HstPeriodService,
    private readonly incomeStatementService: IncomeStatementService,
  ) {}

  // ── HST Position (dashboard widget) ──────────────────────────────────────
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
      itc.net_tax_owing > 0 ? 'owing'
      : itc.net_tax_owing < 0 ? 'refund'
      : 'nil';

    return { ...itc, position_indicator: indicator };
  }

  // ── CRA Remittance Report ─────────────────────────────────────────────────
  async getCraReport(
    businessId: string,
    periodId: string,
    instalmentsPaid: number = 0,
  ): Promise<CraRemittanceReport> {
    // 1. Load and validate the HST period
    const period = await this.hstPeriodService.findOne(businessId, periodId);
    if (!period) {
      throw new NotFoundException(`HST period ${periodId} not found.`);
    }

    const periodStart = period.period_start;
    const periodEnd = period.period_end;

    // 2. Run ITC engine for Lines 103 and 106
    const itc = await this.itcService.calculate(businessId, periodStart, periodEnd);

    // 3. Get Line 101 — total sales and other revenue from Income Statement
    let line101 = 0;
    try {
      const is = await this.incomeStatementService.generate({
        businessId,
        startDate: periodStart,
        endDate: periodEnd,
      });
      line101 = is.total_revenue;
    } catch (err) {
      this.logger.warn(
        `Could not generate income statement for Line 101: ${(err as Error).message}`,
      );
    }

    // 4. GST34 line calculations
    const line103 = itc.total_output_tax;   // HST/GST collected
    const line106 = itc.total_itc_eligible; // ITCs claimed
    const line109 = round2(line103 - line106); // Net tax
    const line111 = round2(instalmentsPaid);   // Instalments paid (user-supplied)
    const line113 = round2(line109 - line111); // Balance owing or refund

    // 5. Get transaction-level breakdown
    const transactions = await this.itcService.getTransactionDetail(
      businessId,
      periodStart,
      periodEnd,
    );

    // 6. Update period computed totals (non-blocking — best effort)
    this.updatePeriodTotals(period, line103, line106, line109).catch((err) =>
      this.logger.warn(`Could not update period totals: ${(err as Error).message}`),
    );

    this.logger.log(
      `CRA report generated for business ${businessId}, period ${periodId}: ` +
      `L101=${line101}, L103=${line103}, L106=${line106}, L109=${line109}, L113=${line113}`,
    );

    return {
      business_id: businessId,
      period,
      generated_at: new Date().toISOString(),
      line_101_total_sales: round2(line101),
      line_103_hst_collected: round2(line103),
      line_106_itc_claimed: round2(line106),
      line_109_net_tax: line109,
      line_111_instalments: line111,
      line_113_balance: line113,
      total_input_tax: itc.total_input_tax,
      total_itc_non_recoverable: itc.total_itc_non_recoverable,
      unposted_transaction_count: itc.unposted_transaction_count,
      transactions,
      disclaimer: DISCLAIMER,
    };
  }

  // ── Persist computed totals back to the period record ─────────────────────
  private async updatePeriodTotals(
    period: HstPeriod,
    hstCollected: number,
    itcClaimed: number,
    netTaxOwing: number,
  ): Promise<void> {
    period.total_hst_collected = round2(hstCollected);
    period.total_itc_claimed = round2(itcClaimed);
    period.net_tax_owing = round2(netTaxOwing);
    await this.hstPeriodService['periodRepo']?.save(period);
  }

  // ── Quarter resolution ────────────────────────────────────────────────────
  private resolvePeriod(
    startDate?: string,
    endDate?: string,
  ): { periodStart: string; periodEnd: string } {
    if (startDate && endDate) {
      return { periodStart: startDate, periodEnd: endDate };
    }

    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    const quarterStartMonth = Math.floor(month / 3) * 3;
    const quarterEndMonth = quarterStartMonth + 2;
    const lastDay = new Date(year, quarterEndMonth + 1, 0).getDate();
    const pad = (n: number) => String(n).padStart(2, '0');

    return {
      periodStart: `${year}-${pad(quarterStartMonth + 1)}-01`,
      periodEnd: `${year}-${pad(quarterEndMonth + 1)}-${pad(lastDay)}`,
    };
  }
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
