import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Account, AccountType, AccountSubtype } from '../../entities/account.entity';

export class CreateAccountDto {
  business_id: string;
  account_code: string;
  account_name: string;
  description?: string;
  account_type: AccountType;
  account_subtype: AccountSubtype;
  parent_account_id?: string;
}

// Phase 12: seed result shape
export interface SeedResult {
  added: number;
  skipped: number;
}

@Injectable()
export class AccountService {
  constructor(
    @InjectRepository(Account)
    private accountRepository: Repository<Account>,
  ) {}

  /**
   * Create a new account
   */
  async createAccount(dto: CreateAccountDto): Promise<Account> {
    const existing = await this.accountRepository.findOne({
      where: { business_id: dto.business_id, account_code: dto.account_code },
    });
    if (existing) {
      throw new BadRequestException(`Account with code ${dto.account_code} already exists`);
    }

    if (dto.parent_account_id) {
      const parent = await this.accountRepository.findOne({
        where: { id: dto.parent_account_id, business_id: dto.business_id },
      });
      if (!parent) throw new NotFoundException('Parent account not found');
    }

    const account = this.accountRepository.create(dto);
    return this.accountRepository.save(account);
  }

  /**
   * Get all accounts for a business
   */
  async getAccounts(
    businessId: string,
    accountType?: AccountType,
    activeOnly = true,
  ): Promise<Account[]> {
    const where: any = { business_id: businessId };
    if (accountType) where.account_type = accountType;
    if (activeOnly) where.is_active = true;
    return this.accountRepository.find({ where, order: { account_code: 'ASC' } });
  }

  /**
   * Get account by ID
   */
  async getAccount(id: string, businessId: string): Promise<Account> {
    const account = await this.accountRepository.findOne({
      where: { id, business_id: businessId },
      relations: ['parentAccount', 'childAccounts'],
    });
    if (!account) throw new NotFoundException('Account not found');
    return account;
  }

  /**
   * Update account
   */
  async updateAccount(
    id: string,
    businessId: string,
    updates: Partial<CreateAccountDto>,
  ): Promise<Account> {
    const account = await this.getAccount(id, businessId);
    if (account.is_system) throw new BadRequestException('Cannot modify system accounts');
    Object.assign(account, updates);
    return this.accountRepository.save(account);
  }

  /**
   * Deactivate account (soft delete)
   */
  async deactivateAccount(id: string, businessId: string): Promise<Account> {
    const account = await this.getAccount(id, businessId);
    if (account.is_system) throw new BadRequestException('Cannot deactivate system accounts');
    account.is_active = false;
    return this.accountRepository.save(account);
  }

  /**
   * Phase 12: Seed standard default chart of accounts.
   * Idempotent — checks each account code before inserting.
   * Returns { added, skipped } counts.
   * Called from POST /accounts/seed-defaults and POST /accounts/seed.
   */
  async seedDefaultChartOfAccounts(businessId: string): Promise<SeedResult> {
    const defaults: Omit<CreateAccountDto, 'business_id'>[] = [
      // ── Assets ────────────────────────────────────────────────────────────
      { account_code: '1000', account_name: 'Cash and Bank',            account_type: AccountType.ASSET,     account_subtype: AccountSubtype.BANK },
      { account_code: '1100', account_name: 'Accounts Receivable',      account_type: AccountType.ASSET,     account_subtype: AccountSubtype.ACCOUNTS_RECEIVABLE },
      { account_code: '1200', account_name: 'Other Current Assets',     account_type: AccountType.ASSET,     account_subtype: AccountSubtype.GENERAL },
      // ── Liabilities ───────────────────────────────────────────────────────
      { account_code: '2000', account_name: 'Accounts Payable',         account_type: AccountType.LIABILITY, account_subtype: AccountSubtype.ACCOUNTS_PAYABLE },
      { account_code: '2100', account_name: 'Credit Card Payable',      account_type: AccountType.LIABILITY, account_subtype: AccountSubtype.CREDIT_CARD },
      { account_code: '2200', account_name: 'HST / GST Payable',        account_type: AccountType.LIABILITY, account_subtype: AccountSubtype.TAX_PAYABLE },
      { account_code: '2300', account_name: 'Other Current Liabilities',account_type: AccountType.LIABILITY, account_subtype: AccountSubtype.GENERAL },
      // ── Equity ────────────────────────────────────────────────────────────
      { account_code: '3000', account_name: "Owner's Equity",           account_type: AccountType.EQUITY,    account_subtype: AccountSubtype.GENERAL },
      { account_code: '3100', account_name: 'Owner Contribution',       account_type: AccountType.EQUITY,    account_subtype: AccountSubtype.OWNER_CONTRIBUTION },
      { account_code: '3200', account_name: 'Owner Draw',               account_type: AccountType.EQUITY,    account_subtype: AccountSubtype.OWNER_DRAW },
      { account_code: '3300', account_name: 'Retained Earnings',        account_type: AccountType.EQUITY,    account_subtype: AccountSubtype.RETAINED_EARNINGS },
      // ── Revenue ───────────────────────────────────────────────────────────
      { account_code: '4000', account_name: 'Revenue',                  account_type: AccountType.REVENUE,   account_subtype: AccountSubtype.GENERAL },
      { account_code: '4100', account_name: 'Other Income',             account_type: AccountType.REVENUE,   account_subtype: AccountSubtype.GENERAL },
      // ── Expenses ──────────────────────────────────────────────────────────
      { account_code: '5000', account_name: 'Cost of Goods Sold',       account_type: AccountType.EXPENSE,   account_subtype: AccountSubtype.COST_OF_GOODS_SOLD },
      { account_code: '5100', account_name: 'Advertising & Marketing',  account_type: AccountType.EXPENSE,   account_subtype: AccountSubtype.OPERATING_EXPENSE },
      { account_code: '5200', account_name: 'Bank Fees & Charges',      account_type: AccountType.EXPENSE,   account_subtype: AccountSubtype.OPERATING_EXPENSE },
      { account_code: '5300', account_name: 'Insurance',                account_type: AccountType.EXPENSE,   account_subtype: AccountSubtype.OPERATING_EXPENSE },
      { account_code: '5400', account_name: 'Meals & Entertainment',    account_type: AccountType.EXPENSE,   account_subtype: AccountSubtype.OPERATING_EXPENSE },
      { account_code: '5500', account_name: 'Office Expenses',          account_type: AccountType.EXPENSE,   account_subtype: AccountSubtype.OPERATING_EXPENSE },
      { account_code: '5600', account_name: 'Professional Fees',        account_type: AccountType.EXPENSE,   account_subtype: AccountSubtype.OPERATING_EXPENSE },
      { account_code: '5700', account_name: 'Rent & Facilities',        account_type: AccountType.EXPENSE,   account_subtype: AccountSubtype.OPERATING_EXPENSE },
      { account_code: '5800', account_name: 'Software & Subscriptions', account_type: AccountType.EXPENSE,   account_subtype: AccountSubtype.OPERATING_EXPENSE },
      { account_code: '5900', account_name: 'Travel',                   account_type: AccountType.EXPENSE,   account_subtype: AccountSubtype.OPERATING_EXPENSE },
      { account_code: '6000', account_name: 'Payroll & Wages',          account_type: AccountType.EXPENSE,   account_subtype: AccountSubtype.OPERATING_EXPENSE },
      { account_code: '6100', account_name: 'Utilities',                account_type: AccountType.EXPENSE,   account_subtype: AccountSubtype.OPERATING_EXPENSE },
      { account_code: '6200', account_name: 'Depreciation',             account_type: AccountType.EXPENSE,   account_subtype: AccountSubtype.OPERATING_EXPENSE },
      { account_code: '6900', account_name: 'Other Expenses',           account_type: AccountType.EXPENSE,   account_subtype: AccountSubtype.OPERATING_EXPENSE },
    ];

    // Load all existing codes for this business in one query
    const existing = await this.accountRepository.find({
      where: { business_id: businessId },
      select: ['account_code'],
    });
    const existingCodes = new Set(existing.map((a) => a.account_code));

    let added = 0;
    let skipped = 0;

    for (const def of defaults) {
      if (existingCodes.has(def.account_code)) {
        skipped++;
        continue;
      }
      await this.accountRepository.save(
        this.accountRepository.create({
          business_id: businessId,
          account_code: def.account_code,
          account_name: def.account_name,
          account_type: def.account_type,
          account_subtype: def.account_subtype,
          is_active: true,
          is_system: false,
        }),
      );
      existingCodes.add(def.account_code);
      added++;
    }

    return { added, skipped };
  }
}
