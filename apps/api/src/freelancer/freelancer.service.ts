import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { MileageLog } from '../entities/mileage-log.entity';
import { CreateMileageLogDto } from './dto/freelancer.dto';

export interface QuarterEstimate {
  quarter: number;
  label: string;
  due_date: string;
  start_date: string;
  end_date: string;
  net_income: number;
  estimated_tax: number;
  breakdown: Record<string, number>;
}

export interface TaxEstimateResult {
  year: number;
  country: string;
  annual_net_income: number;
  annual_estimated_tax: number;
  quarters: QuarterEstimate[];
  disclaimer: string;
}

@Injectable()
export class FreelancerService {
  constructor(
    @InjectRepository(MileageLog)
    private readonly mileageRepo: Repository<MileageLog>,
    private readonly dataSource: DataSource,
  ) {}

  // ── Mileage ──────────────────────────────────────────────────────────

  async createMileageLog(
    businessId: string,
    userId: string,
    dto: CreateMileageLogDto,
  ): Promise<MileageLog> {
    const bizRows = await this.dataSource.query(
      'SELECT country FROM businesses WHERE id = $1 LIMIT 1',
      [businessId],
    );
    const country: string = bizRows[0]?.country ?? 'CA';
    const rate = await this.getMileageRate(businessId, country, new Date(dto.trip_date));
    const deduction_value = parseFloat((dto.distance_km * rate).toFixed(2));

    const log = this.mileageRepo.create({
      business_id: businessId,
      user_id: userId,
      trip_date: dto.trip_date as any,
      start_location: dto.start_location,
      end_location: dto.end_location,
      purpose: dto.purpose,
      distance_km: dto.distance_km,
      rate_per_km: rate,
      deduction_value,
      country,
    });

    return this.mileageRepo.save(log);
  }

  async getMileageLogs(
    businessId: string,
    year?: number,
  ): Promise<{ data: MileageLog[]; total_distance: number; total_deduction: number; unit: string }> {
    const bizRows = await this.dataSource.query(
      'SELECT country FROM businesses WHERE id = $1 LIMIT 1',
      [businessId],
    );
    const country: string = bizRows[0]?.country ?? 'CA';

    const qb = this.mileageRepo
      .createQueryBuilder('ml')
      .where('ml.business_id = :businessId', { businessId })
      .orderBy('ml.trip_date', 'DESC');

    const targetYear = year ?? new Date().getFullYear();
    qb.andWhere('EXTRACT(YEAR FROM ml.trip_date) = :year', { year: targetYear });

    const data = await qb.getMany();
    const total_distance = data.reduce((s, l) => s + Number(l.distance_km), 0);
    const total_deduction = data.reduce((s, l) => s + Number(l.deduction_value), 0);

    return {
      data,
      total_distance: parseFloat(total_distance.toFixed(2)),
      total_deduction: parseFloat(total_deduction.toFixed(2)),
      unit: country === 'US' ? 'miles' : 'km',
    };
  }

  async deleteMileageLog(businessId: string, id: string): Promise<{ deleted: boolean }> {
    const log = await this.mileageRepo.findOne({ where: { id, business_id: businessId } });
    if (!log) throw new NotFoundException(`Mileage log ${id} not found`);
    await this.mileageRepo.remove(log);
    return { deleted: true };
  }

  private async getMileageRate(
    businessId: string,
    country: string,
    tripDate: Date,
  ): Promise<number> {
    if (country === 'US') return 0.7; // IRS 2025 standard rate (per mile)

    // CRA 2025: $0.72/km for first 5,000 km, $0.66/km after
    const year = tripDate.getFullYear();
    const result = await this.mileageRepo
      .createQueryBuilder('ml')
      .where('ml.business_id = :businessId', { businessId })
      .andWhere('EXTRACT(YEAR FROM ml.trip_date) = :year', { year })
      .select('SUM(ml.distance_km)', 'total')
      .getRawOne();

    const ytdKm = Number(result?.total ?? 0);
    return ytdKm >= 5000 ? 0.66 : 0.72;
  }

  // ── Tax Estimate ──────────────────────────────────────────────────────

  async getTaxEstimate(businessId: string, year?: number): Promise<TaxEstimateResult> {
    const targetYear = year ?? new Date().getFullYear();

    const bizRows = await this.dataSource.query(
      'SELECT country FROM businesses WHERE id = $1 LIMIT 1',
      [businessId],
    );
    const country: string = bizRows[0]?.country ?? 'CA';

    const quarterResults: QuarterEstimate[] = [];
    for (let q = 1; q <= 4; q++) {
      const dates = this.getQuarterDates(targetYear, q, country);
      const netIncome = await this.getNetBusinessIncome(
        businessId,
        dates.start_date,
        dates.end_date,
      );
      const { estimated_tax, breakdown } =
        country === 'US'
          ? this.calculateUsTax(netIncome)
          : await this.calculateCaTax(businessId, netIncome, dates.start_date, dates.end_date);

      quarterResults.push({ ...dates, net_income: netIncome, estimated_tax, breakdown });
    }

    return {
      year: targetYear,
      country,
      annual_net_income: parseFloat(
        quarterResults.reduce((s, q) => s + q.net_income, 0).toFixed(2),
      ),
      annual_estimated_tax: parseFloat(
        quarterResults.reduce((s, q) => s + q.estimated_tax, 0).toFixed(2),
      ),
      quarters: quarterResults,
      disclaimer:
        'These are estimates only, based on posted transactions in your ledger. Consult a qualified tax professional before filing or making tax payments.',
    };
  }

  // ── Helpers ───────────────────────────────────────────────────────────

  private async getNetBusinessIncome(
    businessId: string,
    startDate: string,
    endDate: string,
  ): Promise<number> {
    const rows = await this.dataSource.query(
      `SELECT a.account_type,
              SUM(jl.debit_amount)  AS total_debits,
              SUM(jl.credit_amount) AS total_credits
       FROM journal_lines jl
       INNER JOIN journal_entries je ON je.id = jl.journal_entry_id
       INNER JOIN accounts a ON a.id = jl.account_id
       WHERE jl.business_id = $1
         AND je.status = 'posted'
         AND je.entry_date BETWEEN $2 AND $3
         AND a.account_type IN ('revenue','expense')
       GROUP BY a.account_type`,
      [businessId, startDate, endDate],
    );

    let revenue = 0;
    let expenses = 0;
    for (const row of rows) {
      if (row.account_type === 'revenue') {
        revenue = Number(row.total_credits) - Number(row.total_debits);
      } else if (row.account_type === 'expense') {
        expenses = Number(row.total_debits) - Number(row.total_credits);
      }
    }
    return Math.max(0, revenue - expenses);
  }

  private calculateUsTax(netIncome: number): {
    estimated_tax: number;
    breakdown: Record<string, number>;
  } {
    // SE tax: 15.3% on 92.35% of net SE income (SS wage base $176,100 for 2025)
    const seTaxableIncome = netIncome * 0.9235;
    const seTax =
      seTaxableIncome <= 176100
        ? seTaxableIncome * 0.153
        : 176100 * 0.153 + Math.max(0, seTaxableIncome - 176100) * 0.029;

    // Deduct half SE tax for income tax calculation
    const taxableIncome = Math.max(0, netIncome - seTax / 2);
    const federalTax = this.applyBrackets(taxableIncome, [
      { limit: 11925, rate: 0.1 },
      { limit: 48475, rate: 0.12 },
      { limit: 103350, rate: 0.22 },
      { limit: 197300, rate: 0.24 },
      { limit: 250525, rate: 0.32 },
      { limit: 626350, rate: 0.35 },
      { limit: Infinity, rate: 0.37 },
    ]);

    return {
      estimated_tax: parseFloat((seTax + federalTax).toFixed(2)),
      breakdown: {
        'Self-Employment Tax (15.3%)': parseFloat(seTax.toFixed(2)),
        'Federal Income Tax (est.)': parseFloat(federalTax.toFixed(2)),
      },
    };
  }

  private async calculateCaTax(
    businessId: string,
    netIncome: number,
    startDate: string,
    endDate: string,
  ): Promise<{ estimated_tax: number; breakdown: Record<string, number> }> {
    // Federal income tax brackets 2025
    const federalTax = this.applyBrackets(netIncome, [
      { limit: 57375, rate: 0.15 },
      { limit: 114750, rate: 0.205 },
      { limit: 158519, rate: 0.26 },
      { limit: 220000, rate: 0.29 },
      { limit: Infinity, rate: 0.33 },
    ]);

    // CPP: 5.95% on income above $3,500 basic exemption, capped at $73,200 max pensionable
    const cppBase = Math.min(Math.max(0, netIncome - 3500), 73200 - 3500);
    const cppContribution = parseFloat((cppBase * 0.0595).toFixed(2));

    // HST/GST net tax from posted tax_transactions
    const taxRows = await this.dataSource.query(
      `SELECT tc.tax_type, SUM(tt.tax_amount) AS total
       FROM tax_transactions tt
       INNER JOIN journal_lines jl ON jl.id = tt.journal_line_id
       INNER JOIN journal_entries je ON je.id = jl.journal_entry_id
       INNER JOIN tax_codes tc ON tc.id = tt.tax_code_id
       WHERE jl.business_id = $1
         AND je.status = 'posted'
         AND je.entry_date BETWEEN $2 AND $3
       GROUP BY tc.tax_type`,
      [businessId, startDate, endDate],
    );

    let outputTax = 0;
    let inputTax = 0;
    for (const row of taxRows) {
      if (row.tax_type === 'output') outputTax += Number(row.total);
      else if (row.tax_type === 'input') inputTax += Number(row.total);
    }
    const hstNetOwing = parseFloat(Math.max(0, outputTax - inputTax).toFixed(2));

    return {
      estimated_tax: parseFloat((federalTax + cppContribution + hstNetOwing).toFixed(2)),
      breakdown: {
        'Federal Income Tax (est.)': parseFloat(federalTax.toFixed(2)),
        'CPP Contributions (5.95%)': cppContribution,
        'HST/GST Net Owing': hstNetOwing,
      },
    };
  }

  private applyBrackets(
    income: number,
    brackets: { limit: number; rate: number }[],
  ): number {
    let tax = 0;
    let prev = 0;
    for (const b of brackets) {
      if (income <= prev) break;
      const taxable = Math.min(income, b.limit) - prev;
      tax += taxable * b.rate;
      prev = b.limit;
    }
    return parseFloat(tax.toFixed(2));
  }

  private getQuarterDates(
    year: number,
    quarter: number,
    country: string,
  ): { quarter: number; label: string; due_date: string; start_date: string; end_date: string } {
    const ranges: Record<number, { start: string; end: string; label: string }> = {
      1: { start: `${year}-01-01`, end: `${year}-03-31`, label: `Q1 ${year}` },
      2: { start: `${year}-04-01`, end: `${year}-06-30`, label: `Q2 ${year}` },
      3: { start: `${year}-07-01`, end: `${year}-09-30`, label: `Q3 ${year}` },
      4: { start: `${year}-10-01`, end: `${year}-12-31`, label: `Q4 ${year}` },
    };

    const dueDates: Record<string, Record<number, string>> = {
      US: {
        1: `${year}-04-15`,
        2: `${year}-06-16`,
        3: `${year}-09-15`,
        4: `${year + 1}-01-15`,
      },
      CA: {
        1: `${year}-03-15`,
        2: `${year}-06-15`,
        3: `${year}-09-15`,
        4: `${year}-12-15`,
      },
    };

    const r = ranges[quarter];
    const key = country === 'US' ? 'US' : 'CA';
    return {
      quarter,
      label: r.label,
      due_date: dueDates[key][quarter],
      start_date: r.start,
      end_date: r.end,
    };
  }
}
