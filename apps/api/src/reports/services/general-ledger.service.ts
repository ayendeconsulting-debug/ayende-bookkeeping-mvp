import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JournalLine } from '../../entities/journal-line.entity';
import { ReportFilterDto } from '../dto/report-filter.dto';

export interface GeneralLedgerLine {
  journal_entry_id: string;
  entry_number:     string;
  entry_date:       Date;
  description:      string;
  debit_amount:     number;
  credit_amount:    number;
  running_balance:  number;
}

export interface GeneralLedgerAccountReport {
  account_id:      string;
  account_code:    string;
  account_name:    string;
  account_type:    string;
  opening_balance: number;
  lines:           GeneralLedgerLine[];
  closing_balance: number;
}

export interface GeneralLedgerReport {
  business_id:  string;
  start_date:   string;
  end_date:     string;
  accounts:     GeneralLedgerAccountReport[];
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

    // Build the base query for lines in the date range
    const qb = this.journalLineRepo
      .createQueryBuilder('jl')
      .select('je.id',                                   'journal_entry_id')
      .addSelect('je.entry_number',                      'entry_number')
      .addSelect('je.entry_date',                        'entry_date')
      .addSelect('COALESCE(jl.description, je.description)', 'description')
      .addSelect('jl.debit_amount',                      'debit_amount')
      .addSelect('jl.credit_amount',                     'credit_amount')
      .addSelect('a.id',                                 'account_id')
      .addSelect('a.code',                               'account_code')
      .addSelect('a.name',                               'account_name')
      .addSelect('a.account_type',                       'account_type')
      .innerJoin('jl.journalEntry', 'je')
      .innerJoin('jl.account', 'a')
      .where('jl.business_id = :businessId', { businessId })
      .andWhere("je.status = 'posted'")
      .andWhere('je.entry_date >= :startDate', { startDate })
      .andWhere('je.entry_date <= :endDate',   { endDate })
      .orderBy('a.code', 'ASC')
      .addOrderBy('je.entry_date', 'ASC')
      .addOrderBy('je.entry_number', 'ASC');

    if (accountId) {
      qb.andWhere('jl.account_id = :accountId', { accountId });
    }

    const rows = await qb.getRawMany();

    // Group rows by account
    const accountMap = new Map<string, { meta: any; rows: any[] }>();
    for (const row of rows) {
      if (!accountMap.has(row.account_id)) {
        accountMap.set(row.account_id, {
          meta: {
            account_id:   row.account_id,
            account_code: row.account_code,
            account_name: row.account_name,
            account_type: row.account_type,
          },
          rows: [],
        });
      }
      accountMap.get(row.account_id)!.rows.push(row);
    }

    // For each account compute opening balance + running balance
    const accounts: GeneralLedgerAccountReport[] = [];

    for (const [acctId, { meta, rows: acctRows }] of accountMap.entries()) {
      // Opening balance: sum of all posted lines before startDate
      const openingRow = await this.journalLineRepo
        .createQueryBuilder('jl')
        .select('SUM(jl.debit_amount) - SUM(jl.credit_amount)', 'net')
        .innerJoin('jl.journalEntry', 'je')
        .where('jl.business_id = :businessId', { businessId })
        .andWhere('jl.account_id = :acctId',   { acctId })
        .andWhere("je.status = 'posted'")
        .andWhere('je.entry_date < :startDate', { startDate })
        .getRawOne();

      const openingBalance = parseFloat(openingRow?.net ?? '0') || 0;
      let runningBalance = openingBalance;

      const lines: GeneralLedgerLine[] = acctRows.map((row) => {
        const debit  = parseFloat(row.debit_amount)  || 0;
        const credit = parseFloat(row.credit_amount) || 0;
        runningBalance += debit - credit;
        return {
          journal_entry_id: row.journal_entry_id,
          entry_number:     row.entry_number,
          entry_date:       row.entry_date,
          description:      row.description,
          debit_amount:     parseFloat(debit.toFixed(2)),
          credit_amount:    parseFloat(credit.toFixed(2)),
          running_balance:  parseFloat(runningBalance.toFixed(2)),
        };
      });

      accounts.push({
        ...meta,
        opening_balance: parseFloat(openingBalance.toFixed(2)),
        lines,
        closing_balance: parseFloat(runningBalance.toFixed(2)),
      });
    }

    return {
      business_id:  businessId,
      start_date:   startDate,
      end_date:     endDate,
      accounts,
      generated_at: new Date(),
    };
  }
}

