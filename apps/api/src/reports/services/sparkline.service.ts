import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';

export interface SparklinePoint {
  date: string;
  value: number;
}

export interface SparklineData {
  revenue: SparklinePoint[];
  expenses: SparklinePoint[];
  net: SparklinePoint[];
  pending: SparklinePoint[];
}

@Injectable()
export class SparklineService {
  constructor(private readonly dataSource: DataSource) {}

  async getSparklineData(businessId: string): Promise<SparklineData> {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 29);
    const startDate = thirtyDaysAgo.toISOString().split('T')[0];

    const dates = this.generateDateRange(startDate);

    // Daily revenue from posted journal entries
    const revenueRows = await this.dataSource.query(
      `SELECT je.entry_date::date::text AS date,
              SUM(jl.credit_amount - jl.debit_amount) AS value
       FROM journal_lines jl
       INNER JOIN journal_entries je ON je.id = jl.journal_entry_id
       INNER JOIN accounts a ON a.id = jl.account_id
       WHERE jl.business_id = $1
         AND je.status = 'posted'
         AND a.account_type = 'revenue'
         AND je.entry_date >= $2
       GROUP BY je.entry_date::date
       ORDER BY je.entry_date::date`,
      [businessId, startDate],
    );

    // Daily expenses from posted journal entries
    const expenseRows = await this.dataSource.query(
      `SELECT je.entry_date::date::text AS date,
              SUM(jl.debit_amount - jl.credit_amount) AS value
       FROM journal_lines jl
       INNER JOIN journal_entries je ON je.id = jl.journal_entry_id
       INNER JOIN accounts a ON a.id = jl.account_id
       WHERE jl.business_id = $1
         AND je.status = 'posted'
         AND a.account_type = 'expense'
         AND je.entry_date >= $2
       GROUP BY je.entry_date::date
       ORDER BY je.entry_date::date`,
      [businessId, startDate],
    );

    // Daily pending transaction imports
    const pendingRows = await this.dataSource.query(
      `SELECT transaction_date::date::text AS date,
              COUNT(*)::int AS value
       FROM raw_transactions
       WHERE business_id = $1
         AND transaction_date >= $2
         AND status = 'pending'
       GROUP BY transaction_date::date
       ORDER BY transaction_date::date`,
      [businessId, startDate],
    );

    const revenueMap = this.toMap(revenueRows);
    const expenseMap = this.toMap(expenseRows);
    const pendingMap = this.toMap(pendingRows);

    const revenue = dates.map((date) => ({
      date, value: Math.max(0, Number(revenueMap[date] ?? 0)),
    }));
    const expenses = dates.map((date) => ({
      date, value: Math.max(0, Number(expenseMap[date] ?? 0)),
    }));
    const net = dates.map((date, i) => ({
      date, value: revenue[i].value - expenses[i].value,
    }));
    const pending = dates.map((date) => ({
      date, value: Number(pendingMap[date] ?? 0),
    }));

    return { revenue, expenses, net, pending };
  }

  private generateDateRange(startDate: string): string[] {
    const dates: string[] = [];
    const current = new Date(startDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    while (current <= today) {
      dates.push(current.toISOString().split('T')[0]);
      current.setDate(current.getDate() + 1);
    }
    return dates;
  }

  private toMap(rows: { date: string; value: any }[]): Record<string, number> {
    const map: Record<string, number> = {};
    for (const row of rows) map[row.date] = Number(row.value);
    return map;
  }
}
