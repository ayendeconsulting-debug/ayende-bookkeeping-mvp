import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JournalLine } from '../../entities/journal-line.entity';
import { ReportFilterDto } from '../dto/report-filter.dto';

export interface IncomeStatementLine {
  account_id: string;
  account_code: string;
  account_name: string;
  total_debits: number;
  total_credits: number;
  net_amount: number;
}

export interface IncomeStatementReport {
  business_id: string;
  start_date: string;
  end_date: string;
  revenue: IncomeStatementLine[];
  expenses: IncomeStatementLine[];
  total_revenue: number;
  total_expenses: number;
  net_income: number;
  generated_at: Date;
}

@Injectable()
export class IncomeStatementService {
  constructor(
    @InjectRepository(JournalLine)
    private readonly journalLineRepo: Repository<JournalLine>,
  ) {}

  async generate(filter: ReportFilterDto): Promise<IncomeStatementReport> {
    const { businessId, startDate, endDate } = filter;

    const rows = await this.journalLineRepo
      .createQueryBuilder('jl')
      .select('a.id', 'account_id')
      .addSelect('a.code', 'account_code')
      .addSelect('a.name', 'account_name')
      .addSelect('a.account_type', 'account_type')
      .addSelect('SUM(jl.debit_amount)', 'total_debits')
      .addSelect('SUM(jl.credit_amount)', 'total_credits')
      .innerJoin('jl.journalEntry', 'je')
      .innerJoin('jl.account', 'a')
      .where('jl.business_id = :businessId', { businessId })
      .andWhere("je.status = 'posted'")
      .andWhere("a.account_type IN ('revenue', 'expense')")
      .andWhere('je.entry_date >= :startDate', { startDate })
      .andWhere('je.entry_date <= :endDate', { endDate })
      .groupBy('a.id')
      .addGroupBy('a.code')
      .addGroupBy('a.name')
      .addGroupBy('a.account_type')
      .orderBy('a.code', 'ASC')
      .getRawMany();

    const revenue: IncomeStatementLine[] = [];
    const expenses: IncomeStatementLine[] = [];

    for (const row of rows) {
      const debits = parseFloat(row.total_debits) || 0;
      const credits = parseFloat(row.total_credits) || 0;
      const line: IncomeStatementLine = {
        account_id: row.account_id,
        account_code: row.account_code,
        account_name: row.account_name,
        total_debits: debits,
        total_credits: credits,
        // Revenue: credits - debits (normal credit balance)
        // Expense: debits - credits (normal debit balance)
        net_amount: row.account_type === 'revenue'
          ? parseFloat((credits - debits).toFixed(2))
          : parseFloat((debits - credits).toFixed(2)),
      };
      if (row.account_type === 'revenue') revenue.push(line);
      else expenses.push(line);
    }

    const total_revenue = revenue.reduce((s, r) => s + r.net_amount, 0);
    const total_expenses = expenses.reduce((s, e) => s + e.net_amount, 0);

    return {
      business_id: businessId,
      start_date: startDate,
      end_date: endDate,
      revenue,
      expenses,
      total_revenue: parseFloat(total_revenue.toFixed(2)),
      total_expenses: parseFloat(total_expenses.toFixed(2)),
      net_income: parseFloat((total_revenue - total_expenses).toFixed(2)),
      generated_at: new Date(),
    };
  }
}
