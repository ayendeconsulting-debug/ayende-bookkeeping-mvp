import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JournalLine } from '../../entities/journal-line.entity';
import { ReportFilterDto } from '../dto/report-filter.dto';

export interface TrialBalanceLine {
  account_id: string;
  account_code: string;
  account_name: string;
  account_type: string;
  total_debits: number;
  total_credits: number;
}

export interface TrialBalanceReport {
  business_id: string;
  start_date: string;
  end_date: string;
  lines: TrialBalanceLine[];
  grand_total_debits: number;
  grand_total_credits: number;
  is_balanced: boolean;
  generated_at: Date;
}

@Injectable()
export class TrialBalanceService {
  constructor(
    @InjectRepository(JournalLine)
    private readonly journalLineRepo: Repository<JournalLine>,
  ) {}

  async generate(filter: ReportFilterDto): Promise<TrialBalanceReport> {
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
      .andWhere('je.entry_date >= :startDate', { startDate })
      .andWhere('je.entry_date <= :endDate', { endDate })
      .groupBy('a.id')
      .addGroupBy('a.code')
      .addGroupBy('a.name')
      .addGroupBy('a.account_type')
      .orderBy('a.code', 'ASC')
      .getRawMany();

    const lines: TrialBalanceLine[] = rows.map((row) => ({
      account_id: row.account_id,
      account_code: row.account_code,
      account_name: row.account_name,
      account_type: row.account_type,
      total_debits: parseFloat(parseFloat(row.total_debits).toFixed(2)) || 0,
      total_credits: parseFloat(parseFloat(row.total_credits).toFixed(2)) || 0,
    }));

    const grand_total_debits = lines.reduce((s, l) => s + l.total_debits, 0);
    const grand_total_credits = lines.reduce((s, l) => s + l.total_credits, 0);

    return {
      business_id: businessId,
      start_date: startDate,
      end_date: endDate,
      lines,
      grand_total_debits: parseFloat(grand_total_debits.toFixed(2)),
      grand_total_credits: parseFloat(grand_total_credits.toFixed(2)),
      is_balanced: Math.abs(grand_total_debits - grand_total_credits) < 0.01,
      generated_at: new Date(),
    };
  }
}
