import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JournalLine } from '../../entities/journal-line.entity';
import { ReportFilterDto } from '../dto/report-filter.dto';

export interface BalanceSheetLine {
  account_id: string;
  account_code: string;
  account_name: string;
  account_subtype: string;
  balance: number;
}

export interface BalanceSheetReport {
  business_id: string;
  as_of_date: string;
  assets: BalanceSheetLine[];
  liabilities: BalanceSheetLine[];
  equity: BalanceSheetLine[];
  total_assets: number;
  total_liabilities: number;
  total_equity: number;
  is_balanced: boolean;
  generated_at: Date;
}

@Injectable()
export class BalanceSheetService {
  constructor(
    @InjectRepository(JournalLine)
    private readonly journalLineRepo: Repository<JournalLine>,
  ) {}

  async generate(filter: ReportFilterDto): Promise<BalanceSheetReport> {
    const { businessId } = filter;
    const asOfDate = filter.asOfDate ?? filter.endDate ?? new Date().toISOString().split('T')[0];

    const rows = await this.journalLineRepo
      .createQueryBuilder('jl')
      .select('a.id', 'account_id')
      .addSelect('a.code', 'account_code')
      .addSelect('a.name', 'account_name')
      .addSelect('a.account_type', 'account_type')
      .addSelect('a.account_subtype', 'account_subtype')
      .addSelect('SUM(jl.debit_amount) - SUM(jl.credit_amount)', 'net_balance')
      .innerJoin('jl.journalEntry', 'je')
      .innerJoin('jl.account', 'a')
      .where('jl.business_id = :businessId', { businessId })
      .andWhere("je.status = 'posted'")
      .andWhere("a.account_type IN ('asset', 'liability', 'equity')")
      .andWhere('je.entry_date <= :asOfDate', { asOfDate })
      .groupBy('a.id')
      .addGroupBy('a.code')
      .addGroupBy('a.name')
      .addGroupBy('a.account_type')
      .addGroupBy('a.account_subtype')
      .orderBy('a.code', 'ASC')
      .getRawMany();

    const assets: BalanceSheetLine[] = [];
    const liabilities: BalanceSheetLine[] = [];
    const equity: BalanceSheetLine[] = [];

    for (const row of rows) {
      const netBalance = parseFloat(row.net_balance) || 0;
      const line: BalanceSheetLine = {
        account_id: row.account_id,
        account_code: row.account_code,
        account_name: row.account_name,
        account_subtype: row.account_subtype,
        // Assets: normal debit balance (positive = debit > credit)
        // Liabilities/Equity: normal credit balance (positive = credit > debit, so negate)
        balance: row.account_type === 'asset'
          ? parseFloat(netBalance.toFixed(2))
          : parseFloat((-netBalance).toFixed(2)),
      };
      if (row.account_type === 'asset') assets.push(line);
      else if (row.account_type === 'liability') liabilities.push(line);
      else equity.push(line);
    }

    const total_assets = assets.reduce((s, a) => s + a.balance, 0);
    const total_liabilities = liabilities.reduce((s, l) => s + l.balance, 0);
    const total_equity = equity.reduce((s, e) => s + e.balance, 0);

    return {
      business_id: businessId,
      as_of_date: asOfDate,
      assets,
      liabilities,
      equity,
      total_assets: parseFloat(total_assets.toFixed(2)),
      total_liabilities: parseFloat(total_liabilities.toFixed(2)),
      total_equity: parseFloat(total_equity.toFixed(2)),
      is_balanced: Math.abs(total_assets - (total_liabilities + total_equity)) < 0.01,
      generated_at: new Date(),
    };
  }
}
