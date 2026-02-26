import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JournalLine } from '../../entities/journal-line.entity';
import { Account, AccountType } from '../../entities/account.entity';
import { JournalEntry, JournalEntryStatus } from '../../entities/journal-entry.entity';

export interface AccountBalance {
  account_id: string;
  account_code: string;
  account_name: string;
  account_type: AccountType;
  debit_total: number;
  credit_total: number;
  balance: number;
}

export interface TrialBalance {
  accounts: AccountBalance[];
  total_debits: number;
  total_credits: number;
  is_balanced: boolean;
  difference: number;
}

@Injectable()
export class LedgerService {
  constructor(
    @InjectRepository(JournalLine)
    private journalLineRepository: Repository<JournalLine>,
    @InjectRepository(JournalEntry)
    private journalEntryRepository: Repository<JournalEntry>,
    @InjectRepository(Account)
    private accountRepository: Repository<Account>,
  ) {}

  /**
   * Calculate balance for a specific account
   */
  async getAccountBalance(
    accountId: string,
    businessId: string,
    asOfDate?: Date,
  ): Promise<AccountBalance> {
    const account = await this.accountRepository.findOne({
      where: { id: accountId, business_id: businessId },
    });

    if (!account) {
      throw new Error('Account not found');
    }

    // Build query for journal lines
    const query = this.journalLineRepository
      .createQueryBuilder('jl')
      .innerJoin('jl.journalEntry', 'je')
      .where('jl.account_id = :accountId', { accountId })
      .andWhere('jl.business_id = :businessId', { businessId })
      .andWhere('je.status = :status', { status: JournalEntryStatus.POSTED });

    if (asOfDate) {
      query.andWhere('je.entry_date <= :asOfDate', { asOfDate });
    }

    const lines = await query.getMany();

    const debit_total = lines.reduce(
      (sum, line) => sum + Number(line.debit_amount),
      0,
    );
    const credit_total = lines.reduce(
      (sum, line) => sum + Number(line.credit_amount),
      0,
    );

    // Calculate balance based on account type
    // Assets and Expenses: Debit increases balance
    // Liabilities, Equity, Revenue: Credit increases balance
    let balance: number;
    if (
      account.account_type === AccountType.ASSET ||
      account.account_type === AccountType.EXPENSE
    ) {
      balance = debit_total - credit_total;
    } else {
      balance = credit_total - debit_total;
    }

    return {
      account_id: account.id,
      account_code: account.code,
      account_name: account.name,
      account_type: account.account_type,
      debit_total,
      credit_total,
      balance,
    };
  }

  /**
   * Generate Trial Balance
   * CRITICAL: This should ALWAYS equal zero if accounting is correct
   */
  async getTrialBalance(
    businessId: string,
    asOfDate?: Date,
  ): Promise<TrialBalance> {
    // Get all accounts
    const accounts = await this.accountRepository.find({
      where: { business_id: businessId, is_active: true },
      order: { code: 'ASC' },
    });

    // Calculate balance for each account
    const accountBalances: AccountBalance[] = [];
    let totalDebits = 0;
    let totalCredits = 0;

    for (const account of accounts) {
      const balance = await this.getAccountBalance(
        account.id,
        businessId,
        asOfDate,
      );

      // Only include accounts with activity
      if (balance.debit_total > 0 || balance.credit_total > 0) {
        accountBalances.push(balance);
        totalDebits += balance.debit_total;
        totalCredits += balance.credit_total;
      }
    }

    const difference = totalDebits - totalCredits;
    const isBalanced = Math.abs(difference) < 0.01; // Allow for rounding

    return {
      accounts: accountBalances,
      total_debits: totalDebits,
      total_credits: totalCredits,
      is_balanced: isBalanced,
      difference,
    };
  }

  /**
   * Get general ledger for an account (all transactions)
   */
  async getGeneralLedger(
    accountId: string,
    businessId: string,
    startDate?: Date,
    endDate?: Date,
  ) {
    const query = this.journalLineRepository
      .createQueryBuilder('jl')
      .innerJoinAndSelect('jl.journalEntry', 'je')
      .innerJoinAndSelect('jl.account', 'account')
      .where('jl.account_id = :accountId', { accountId })
      .andWhere('jl.business_id = :businessId', { businessId })
      .andWhere('je.status = :status', { status: JournalEntryStatus.POSTED });

    if (startDate) {
      query.andWhere('je.entry_date >= :startDate', { startDate });
    }

    if (endDate) {
      query.andWhere('je.entry_date <= :endDate', { endDate });
    }

    query.orderBy('je.entry_date', 'ASC').addOrderBy('je.entry_number', 'ASC');

    const lines = await query.getMany();

    // Get account info
    const account = await this.accountRepository.findOne({
      where: { id: accountId },
    });

    if (!account) {
      throw new Error('Account not found');
    }

    // Calculate running balance
    let runningBalance = 0;

    const ledgerEntries = lines.map((line) => {
      const debit = Number(line.debit_amount);
      const credit = Number(line.credit_amount);

      // Update running balance based on account type
      if (
        account.account_type === AccountType.ASSET ||
        account.account_type === AccountType.EXPENSE
      ) {
        runningBalance += debit - credit;
      } else {
        runningBalance += credit - debit;
      }

      return {
        date: line.journalEntry.entry_date,
        entry_number: line.journalEntry.entry_number,
        description: line.description || line.journalEntry.description,
        debit,
        credit,
        balance: runningBalance,
      };
    });

    return {
      account_id: accountId,
      account_code: account.code,
      account_name: account.name,
      account_type: account.account_type,
      entries: ledgerEntries,
      ending_balance: runningBalance,
    };
  }

  /**
   * Verify accounting integrity
   * Returns true if all posted entries balance
   */
  async verifyAccountingIntegrity(businessId: string): Promise<{
    is_valid: boolean;
    total_debits: number;
    total_credits: number;
    difference: number;
    errors: string[];
  }> {
    const errors: string[] = [];

    // Get all posted journal entries
    const entries = await this.journalEntryRepository.find({
      where: {
        business_id: businessId,
        status: JournalEntryStatus.POSTED,
      },
      relations: ['lines'],
    });

    // Check each entry is balanced
    for (const entry of entries) {
      const totalDebits = entry.lines.reduce(
        (sum, line) => sum + Number(line.debit_amount),
        0,
      );
      const totalCredits = entry.lines.reduce(
        (sum, line) => sum + Number(line.credit_amount),
        0,
      );

      if (Math.abs(totalDebits - totalCredits) > 0.01) {
        errors.push(
          `Entry ${entry.entry_number} is unbalanced: Debits ${totalDebits}, Credits ${totalCredits}`,
        );
      }
    }

    // Get trial balance
    const trialBalance = await this.getTrialBalance(businessId);

    if (!trialBalance.is_balanced) {
      errors.push(
        `Trial balance does not balance. Difference: ${trialBalance.difference}`,
      );
    }

    return {
      is_valid: errors.length === 0,
      total_debits: trialBalance.total_debits,
      total_credits: trialBalance.total_credits,
      difference: trialBalance.difference,
      errors,
    };
  }
}
