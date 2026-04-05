import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TaxTransaction } from '../../entities/tax-transaction.entity';
import { TaxType } from '../../entities/tax-code.entity';

// ── Result types ──────────────────────────────────────────────────────────────

export interface ItcBreakdownLine {
  tax_category: string | null;
  transaction_count: number;
  total_input_tax: number;
  itc_eligible_amount: number;
  itc_non_recoverable: number;
}

export interface ItcResult {
  period_start: string;
  period_end: string;
  // Output tax (HST/GST collected from customers — Line 103)
  total_output_tax: number;
  output_transaction_count: number;
  // Input tax (HST/GST paid on purchases)
  total_input_tax: number;
  input_transaction_count: number;
  // ITC calculation
  total_itc_eligible: number;        // recoverable portion — Line 106
  total_itc_non_recoverable: number; // non-recoverable (e.g. 50% M&E, exempt)
  // Net position
  net_tax_owing: number;             // Line 109: output_tax - itc_eligible
  // Breakdown by tax_category
  breakdown: ItcBreakdownLine[];
  // Warning: unposted transactions exist in range
  unposted_transaction_count: number;
}

export interface ItcTransactionDetail {
  journal_entry_id: string;
  entry_date: string;
  description: string;
  gross_amount: number;
  tax_amount: number;
  net_amount: number;
  tax_code: string;
  tax_code_name: string;
  tax_type: string;
  tax_category: string | null;
  itc_rate: number;
  itc_amount: number;
}

@Injectable()
export class ItcService {
  private readonly logger = new Logger(ItcService.name);

  constructor(
    @InjectRepository(TaxTransaction)
    private readonly taxTxRepo: Repository<TaxTransaction>,
  ) {}

  // ── Main calculation ──────────────────────────────────────────────────────
  async calculate(
    businessId: string,
    periodStart: string,
    periodEnd: string,
  ): Promise<ItcResult> {
    // Fetch all tax transactions for posted journal entries in the period
    // Joins: tax_transaction → journal_line → journal_entry → tax_code
    const rows = await this.taxTxRepo
      .createQueryBuilder('tt')
      .select([
        'tt.id',
        'tt.net_amount',
        'tt.tax_amount',
        'tt.gross_amount',
        'tc.tax_type',
        'tc.code',
        'tc.name',
        'tc.itc_eligible',
        'tc.itc_rate',
        'tc.tax_category',
        'je.entry_date',
        'je.description',
        'je.id AS je_id',
      ])
      .innerJoin('tt.taxCode', 'tc')
      .innerJoin('tt.journalLine', 'jl')
      .innerJoin('jl.journalEntry', 'je')
      .where('tt.business_id = :businessId', { businessId })
      .andWhere('je.status = :status', { status: 'posted' })
      .andWhere('je.entry_date >= :periodStart', { periodStart })
      .andWhere('je.entry_date <= :periodEnd', { periodEnd })
      .getRawMany();

    // Initialise accumulators
    let totalOutputTax = 0;
    let outputCount = 0;
    let totalInputTax = 0;
    let inputCount = 0;
    let totalItcEligible = 0;
    let totalItcNonRecoverable = 0;

    // Category breakdown map
    const breakdownMap = new Map<string, ItcBreakdownLine>();

    for (const row of rows) {
      const taxAmount = Number(row.tt_tax_amount ?? 0);
      const itcRate = Number(row.tc_itc_rate ?? 0);
      const itcEligible = row.tc_itc_eligible === true || row.tc_itc_eligible === 'true';
      const taxType = row.tc_tax_type as TaxType;
      const category = row.tc_tax_category ?? 'uncategorised';

      if (taxType === TaxType.OUTPUT) {
        // Output tax — collected from customers (Line 103)
        totalOutputTax += taxAmount;
        outputCount++;
      } else if (taxType === TaxType.INPUT) {
        // Input tax — paid on purchases
        totalInputTax += taxAmount;
        inputCount++;

        const itcAmount = itcEligible ? taxAmount * itcRate : 0;
        const nonRecoverable = taxAmount - itcAmount;

        totalItcEligible += itcAmount;
        totalItcNonRecoverable += nonRecoverable;

        // Accumulate breakdown
        if (!breakdownMap.has(category)) {
          breakdownMap.set(category, {
            tax_category: category,
            transaction_count: 0,
            total_input_tax: 0,
            itc_eligible_amount: 0,
            itc_non_recoverable: 0,
          });
        }
        const line = breakdownMap.get(category)!;
        line.transaction_count++;
        line.total_input_tax = round2(line.total_input_tax + taxAmount);
        line.itc_eligible_amount = round2(line.itc_eligible_amount + itcAmount);
        line.itc_non_recoverable = round2(line.itc_non_recoverable + nonRecoverable);
      }
    }

    const netTaxOwing = round2(totalOutputTax - totalItcEligible);

    // Count unposted classified transactions in range as a warning indicator
    const unpostedCount = await this.countUnpostedInRange(
      businessId,
      periodStart,
      periodEnd,
    );

    this.logger.debug(
      `ITC calculation for ${businessId} [${periodStart}→${periodEnd}]: ` +
      `output=${totalOutputTax}, itc=${totalItcEligible}, net=${netTaxOwing}`,
    );

    return {
      period_start: periodStart,
      period_end: periodEnd,
      total_output_tax: round2(totalOutputTax),
      output_transaction_count: outputCount,
      total_input_tax: round2(totalInputTax),
      input_transaction_count: inputCount,
      total_itc_eligible: round2(totalItcEligible),
      total_itc_non_recoverable: round2(totalItcNonRecoverable),
      net_tax_owing: netTaxOwing,
      breakdown: Array.from(breakdownMap.values()),
      unposted_transaction_count: unpostedCount,
    };
  }

  // ── Transaction-level detail (used by CRA report) ─────────────────────────
  async getTransactionDetail(
    businessId: string,
    periodStart: string,
    periodEnd: string,
  ): Promise<ItcTransactionDetail[]> {
    const rows = await this.taxTxRepo
      .createQueryBuilder('tt')
      .select([
        'tt.net_amount',
        'tt.tax_amount',
        'tt.gross_amount',
        'tc.tax_type',
        'tc.code',
        'tc.name',
        'tc.itc_eligible',
        'tc.itc_rate',
        'tc.tax_category',
        'je.entry_date',
        'je.description',
        'je.id',
        'jl.journal_entry_id',
      ])
      .innerJoin('tt.taxCode', 'tc')
      .innerJoin('tt.journalLine', 'jl')
      .innerJoin('jl.journalEntry', 'je')
      .where('tt.business_id = :businessId', { businessId })
      .andWhere('je.status = :status', { status: 'posted' })
      .andWhere('je.entry_date >= :periodStart', { periodStart })
      .andWhere('je.entry_date <= :periodEnd', { periodEnd })
      .orderBy('je.entry_date', 'ASC')
      .getRawMany();

    return rows.map((row) => {
      const taxAmount = Number(row.tt_tax_amount ?? 0);
      const itcRate = Number(row.tc_itc_rate ?? 0);
      const itcEligible = row.tc_itc_eligible === true || row.tc_itc_eligible === 'true';
      const itcAmount =
        row.tc_tax_type === TaxType.INPUT && itcEligible
          ? round2(taxAmount * itcRate)
          : 0;

      return {
        journal_entry_id: row.je_id ?? row['jl_journal_entry_id'],
        entry_date: row.je_entry_date,
        description: row.je_description ?? '',
        gross_amount: round2(Number(row.tt_gross_amount ?? 0)),
        tax_amount: round2(taxAmount),
        net_amount: round2(Number(row.tt_net_amount ?? 0)),
        tax_code: row.tc_code,
        tax_code_name: row.tc_name,
        tax_type: row.tc_tax_type,
        tax_category: row.tc_tax_category ?? null,
        itc_rate: itcRate,
        itc_amount: itcAmount,
      };
    });
  }

  // ── Helper: count unposted classified transactions ────────────────────────
  private async countUnpostedInRange(
    businessId: string,
    periodStart: string,
    periodEnd: string,
  ): Promise<number> {
    try {
      const result = await this.taxTxRepo.manager
        .createQueryBuilder()
        .select('COUNT(*)', 'count')
        .from('classified_transactions', 'ct')
        .innerJoin('raw_transactions', 'rt', 'rt.id = ct.raw_transaction_id')
        .where('ct.business_id = :businessId', { businessId })
        .andWhere('ct.is_posted = false')
        .andWhere('rt.date >= :periodStart', { periodStart })
        .andWhere('rt.date <= :periodEnd', { periodEnd })
        .getRawOne();

      return parseInt(result?.count ?? '0', 10);
    } catch {
      // Non-critical — return 0 if query fails
      return 0;
    }
  }
}

// ── Utility ───────────────────────────────────────────────────────────────────
function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
