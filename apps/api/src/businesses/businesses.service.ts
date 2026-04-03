import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Business, BusinessMode } from '../entities/business.entity';
import { Account } from '../entities/account.entity';

type AccountType = 'asset' | 'liability' | 'equity' | 'revenue' | 'expense';

interface AccountSeed {
  code: string;
  name: string;
  type: AccountType;
  subtype?: string | null;
  description?: string;
}

@Injectable()
export class BusinessesService {
  constructor(
    @InjectRepository(Business)
    private readonly businessRepo: Repository<Business>,
    @InjectRepository(Account)
    private readonly accountRepo: Repository<Account>,
  ) {}

  async findByClerkOrgId(clerkOrgId: string): Promise<Business | null> {
    return this.businessRepo.findOne({ where: { clerk_org_id: clerkOrgId } });
  }

  async findById(id: string): Promise<Business> {
    const business = await this.businessRepo.findOne({ where: { id } });
    if (!business) throw new NotFoundException('Business not found.');
    return business;
  }

  async update(
    id: string,
    updates: {
      name?: string;
      fiscal_year_end?: string;
      currency_code?: string;
      mode?: BusinessMode;
      country?: string;
      settings?: Record<string, any>;
    },
  ): Promise<Business> {
    const business = await this.findById(id);

    if (updates.name !== undefined) business.name = updates.name;
    if (updates.fiscal_year_end !== undefined) business.fiscal_year_end = updates.fiscal_year_end as any;
    if (updates.currency_code !== undefined) business.currency_code = updates.currency_code;
    if (updates.mode !== undefined) business.mode = updates.mode;
    if (updates.country !== undefined) business.country = updates.country;

    if (updates.settings !== undefined) {
      business.settings = {
        ...(business.settings ?? {}),
        ...updates.settings,
      };
    }

    return this.businessRepo.save(business);
  }

  async provision(clerkOrgId: string, name: string): Promise<Business> {
    const existing = await this.findByClerkOrgId(clerkOrgId);
    if (existing) return existing;

    const business = this.businessRepo.create({
      name: name || 'My Business',
      clerk_org_id: clerkOrgId,
    });

    return this.businessRepo.save(business);
  }

  // ── Seed Chart of Accounts ────────────────────────────────────────────────

  async seedAccounts(
    businessId: string,
    industry: string,
  ): Promise<{ seeded: number; skipped: boolean }> {
    const business = await this.findById(businessId);

    // Check if accounts already exist — idempotent
    const existingCount = await this.accountRepo.count({ where: { business_id: businessId } });
    if (existingCount > 0) {
      return { seeded: 0, skipped: true };
    }

    const country = business.country ?? 'CA';
    const seeds = this.buildAccountSeeds(country, industry);

    const accounts = seeds.map((seed) => {
      // Object.assign bypasses DeepPartial<Account> type constraints
      const acc = this.accountRepo.create();
      Object.assign(acc, {
        business_id: businessId,
        code: seed.code,
        name: seed.name,
        account_type: seed.type,
        is_active: true,
        ...(seed.subtype ? { account_subtype: seed.subtype } : {}),
      });
      return acc;
    });

    await this.accountRepo.save(accounts);
    return { seeded: accounts.length, skipped: false };
  }

  // ── Account seed templates ─────────────────────────────────────────────────

  private buildAccountSeeds(country: string, industry: string): AccountSeed[] {
    const isCA = country === 'CA';

    const standard: AccountSeed[] = [
      // Assets
      { code: '1000', name: 'Cash / Chequing Account',     type: 'asset',     subtype: 'bank' },
      { code: '1010', name: 'Savings Account',              type: 'asset',     subtype: 'bank' },
      { code: '1100', name: 'Accounts Receivable',          type: 'asset',     subtype: 'accounts_receivable' },
      { code: '1200', name: 'Prepaid Expenses',             type: 'asset',     subtype: null },
      { code: '1500', name: 'Equipment',                    type: 'asset',     subtype: null },
      { code: '1510', name: 'Accumulated Depreciation',     type: 'asset',     subtype: null },
      // Liabilities
      { code: '2000', name: 'Accounts Payable',             type: 'liability', subtype: 'accounts_payable' },
      { code: '2100', name: isCA ? 'HST/GST Payable' : 'Sales Tax Payable', type: 'liability', subtype: 'tax_payable' },
      { code: '2200', name: 'Credit Card Payable',          type: 'liability', subtype: 'credit_card' },
      { code: '2300', name: isCA ? 'CPP Payable'  : 'FICA - Social Security Payable',  type: 'liability', subtype: null },
      { code: '2310', name: isCA ? 'EI Payable'   : 'FICA - Medicare Payable',         type: 'liability', subtype: null },
      { code: '2320', name: isCA ? 'Income Tax Payable (Employees)' : 'Federal Withholding Payable', type: 'liability', subtype: null },
      // Equity
      { code: '3000', name: "Owner's Equity",               type: 'equity',    subtype: null },
      { code: '3100', name: 'Owner Contributions',          type: 'equity',    subtype: 'owner_contribution' },
      { code: '3200', name: 'Owner Drawings',               type: 'equity',    subtype: 'owner_draw' },
      { code: '3300', name: 'Retained Earnings',            type: 'equity',    subtype: null },
      // Revenue
      { code: '4000', name: 'Revenue',                      type: 'revenue',   subtype: null },
      // Expenses
      { code: '5000', name: 'General Expenses',             type: 'expense',   subtype: null },
      { code: '5100', name: 'Bank & Service Charges',       type: 'expense',   subtype: null },
      { code: '5200', name: 'Professional Fees',            type: 'expense',   subtype: null },
      { code: '5300', name: 'Office Supplies',              type: 'expense',   subtype: null },
      { code: '5400', name: 'Insurance',                    type: 'expense',   subtype: null },
      { code: '5500', name: 'Wages & Salaries',             type: 'expense',   subtype: null },
      { code: '5600', name: 'Rent',                         type: 'expense',   subtype: null },
      { code: '5700', name: 'Utilities',                    type: 'expense',   subtype: null },
      { code: '5800', name: 'Travel & Transportation',      type: 'expense',   subtype: null },
      { code: '5900', name: 'Marketing & Advertising',      type: 'expense',   subtype: null },
    ];

    const industryExtras: Record<string, AccountSeed[]> = {
      retail: [
        { code: '1300', name: 'Inventory',                  type: 'asset',   subtype: null },
        { code: '4100', name: 'Sales Returns & Allowances', type: 'revenue', subtype: null },
        { code: '5010', name: 'Cost of Goods Sold',         type: 'expense', subtype: null },
      ],
      services: [
        { code: '4100', name: 'Consulting Revenue',         type: 'revenue', subtype: null },
        { code: '4200', name: 'Retainer Revenue',           type: 'revenue', subtype: null },
        { code: '5810', name: 'Meals & Entertainment',      type: 'expense', subtype: null },
        { code: '5820', name: 'Software & Subscriptions',   type: 'expense', subtype: null },
      ],
      construction: [
        { code: '1400', name: 'Work in Progress (WIP)',     type: 'asset',   subtype: null },
        { code: '4100', name: 'Contract Revenue',           type: 'revenue', subtype: null },
        { code: '5010', name: 'Materials & Supplies',       type: 'expense', subtype: null },
        { code: '5020', name: 'Subcontractor Expenses',     type: 'expense', subtype: null },
        { code: '5030', name: 'Equipment Rental',           type: 'expense', subtype: null },
      ],
      restaurant: [
        { code: '4100', name: 'Food & Beverage Revenue',    type: 'revenue', subtype: null },
        { code: '4200', name: 'Catering Revenue',           type: 'revenue', subtype: null },
        { code: '5010', name: 'Food Cost',                  type: 'expense', subtype: null },
        { code: '5020', name: 'Beverage Cost',              type: 'expense', subtype: null },
        { code: '5510', name: 'Kitchen Labor',              type: 'expense', subtype: null },
      ],
      freelancer: [
        { code: '4100', name: 'Consulting / Project Revenue', type: 'revenue', subtype: null },
        { code: '5810', name: 'Home Office',                  type: 'expense', subtype: null },
        { code: '5820', name: 'Software & Tools',             type: 'expense', subtype: null },
        { code: '5830', name: 'Professional Development',     type: 'expense', subtype: null },
        { code: '5840', name: 'Mileage & Vehicle',            type: 'expense', subtype: null },
      ],
    };

    const extras = industryExtras[industry] ?? [];
    return [...standard, ...extras];
  }
}
