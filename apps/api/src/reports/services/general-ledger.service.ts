import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JournalLine } from '../../entities/journal-line.entity';
import { ReportFilterDto } from '../dto/report-filter.dto';

export interface GeneralLedgerLine {
  journal_entry_id: string;
  entry_number: string;
  entry_date: Date;
  description: string;
  debit_amount: number;
  credit_amount: number;
  running_balance: number;
}

export interface GeneralLedgerReport {
  business_id: string;
  account_id: string;
  account_code: string;
  account_name: string;
  account_type: string;
  start_date: string;
  end_date: string;
  opening_balance: number;
  lines: GeneralLedgerLine[];
  closing_balance: number;
  generated_at: Date;
}

@Injectable()
export class GeneralLedgerService {
  constructor(
    @InjectRepository(JournalLine)
    private readonly journalLineRepo: Repository<JournalLine>,
  ) {}

  async generate(filter: ReportFilterDto): Promise<GeneralLedgerReport> {
    const { businessId, startDate, endDate, accountId } = filter;

    // Opening balance: all posted entries before startDate for this account
    const openingRow = await this.journalLineRepo
      .createQueryBuilder('jl')
      .select('SUM(jl.debit_amount) - SUM(jl.credit_amount)', 'net')
      .addSelect('a.account_type', 'account_type')
      .innerJoin('jl.journalEntry', 'je')
      .innerJoin('jl.account', 'a')
      .where('jl.business_id = :businessId', { businessId })
      .andWhere('jl.account_id = :accountId', { accountId })
      .andWhere("je.status = 'posted'")
      .andWhere('je.entry_date < :startDate', { startDate })
      .groupBy('a.account_type')
      .getRawOne();

    const openingBalance = parseFloat(openingRow?.net ?? '0');

    // Lines within the date range
    const rows = await this.journalLineRepo
      .createQueryBuilder('jl')
      .select('je.id', 'journal_entry_id')
      .addSelect('je.entry_number', 'entry_number')
      .addSelect('je.entry_date', 'entry_date')
      .addSelect('COALESCE(jl.description, je.description)', 'description')
      .addSelect('jl.debit_amount', 'debit_amount')
      .addSelect('jl.credit_amount', 'credit_amount')
      .addSelect('a.code', 'account_code')
      .addSelect('a.name', 'account_name')
      .addSelect('a.account_type', 'account_type')
      .innerJoin('jl.journalEntry', 'je')
      .innerJoin('jl.account', 'a')
      .where('jl.business_id = :businessId', { businessId })
      .andWhere('jl.account_id = :accountId', { accountId })
      .andWhere("je.status = 'posted'")
      .andWhere('je.entry_date >= :startDate', { startDate })
      .andWhere('je.entry_date <= :endDate', { endDate })
      .orderBy('je.entry_date', 'ASC')
      .addOrderBy('je.entry_number', 'ASC')
      .getRawMany();

    let runningBalance = openingBalance;
    const lines: GeneralLedgerLine[] = rows.map((row) => {
      const debit = parseFloat(row.debit_amount) || 0;
      const credit = parseFloat(row.credit_amount) || 0;
      runningBalance += debit - credit;

      return {
        journal_entry_id: row.journal_entry_id,
        entry_number: row.entry_number,
        entry_date: row.entry_date,
        description: row.description,
        debit_amount: parseFloat(debit.toFixed(2)),
        credit_amount: parseFloat(credit.toFixed(2)),
        running_balance: parseFloat(runningBalance.toFixed(2)),
      };
    });

    return {
      business_id: businessId,
      account_id: accountId,
      account_code: rows[0]?.account_code ?? '',
      account_name: rows[0]?.account_name ?? '',
      account_type: rows[0]?.account_type ?? '',
      start_date: startDate,
      end_date: endDate,
      opening_balance: parseFloat(openingBalance.toFixed(2)),
      lines,
      closing_balance: parseFloat(runningBalance.toFixed(2)),
      generated_at: new Date(),
    };
  }
}
