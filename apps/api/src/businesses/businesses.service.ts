import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { Business, BusinessMode } from '../entities/business.entity';
import { Account, AccountType, AccountSubtype } from '../entities/account.entity';
import { UpdateTaxSettingsDto } from '../reports/dto/update-tax-settings.dto';
import { TaxSeedService } from '../reports/services/tax-seed.service';
import { ProvinceConfigService } from '../reports/services/province-config.service';
import { AutomationsService } from '../command-center/automations.service';

type AccountTypeStr = 'asset' | 'liability' | 'equity' | 'revenue' | 'expense';

interface AccountSeed {
  code: string;
  name: string;
  type: AccountTypeStr;
  subtype?: string | null;
  description?: string;
}

// Phase 12: standard default account set seeded on every new business
interface DefaultAccountSeed {
  account_code: string;
  account_name: string;
  account_type: AccountType;
  account_subtype: AccountSubtype | null;
}

const DEFAULT_ACCOUNTS: DefaultAccountSeed[] = [
  // -- Assets --------------------------------------------------------------
  { account_code: '1000', account_name: 'Cash and Bank',            account_type: AccountType.ASSET,     account_subtype: AccountSubtype.BANK },
  { account_code: '1100', account_name: 'Accounts Receivable',      account_type: AccountType.ASSET,     account_subtype: AccountSubtype.ACCOUNTS_RECEIVABLE },
  { account_code: '1200', account_name: 'Other Current Assets',     account_type: AccountType.ASSET,     account_subtype: null },
  // -- Liabilities ---------------------------------------------------------
  { account_code: '2000', account_name: 'Accounts Payable',         account_type: AccountType.LIABILITY, account_subtype: AccountSubtype.ACCOUNTS_PAYABLE },
  { account_code: '2100', account_name: 'Credit Card Payable',      account_type: AccountType.LIABILITY, account_subtype: AccountSubtype.CREDIT_CARD },
  { account_code: '2200', account_name: 'HST / GST Payable',        account_type: AccountType.LIABILITY, account_subtype: AccountSubtype.TAX_PAYABLE },
  { account_code: '2300', account_name: 'Other Current Liabilities',account_type: AccountType.LIABILITY, account_subtype: null },
  // -- Equity --------------------------------------------------------------
  { account_code: '3000', account_name: "Owner's Equity",           account_type: AccountType.EQUITY,    account_subtype: null },
  { account_code: '3100', account_name: 'Owner Contribution',       account_type: AccountType.EQUITY,    account_subtype: AccountSubtype.OWNER_CONTRIBUTION },
  { account_code: '3200', account_name: 'Owner Draw',               account_type: AccountType.EQUITY,    account_subtype: AccountSubtype.OWNER_DRAW },
  { account_code: '3300', account_name: 'Retained Earnings',        account_type: AccountType.EQUITY,    account_subtype: null },
  // -- Revenue -------------------------------------------------------------
  { account_code: '4000', account_name: 'Revenue',                  account_type: AccountType.REVENUE,   account_subtype: null },
  { account_code: '4100', account_name: 'Other Income',             account_type: AccountType.REVENUE,   account_subtype: null },
  // -- Expenses ------------------------------------------------------------
  { account_code: '5000', account_name: 'Cost of Goods Sold',       account_type: AccountType.EXPENSE,   account_subtype: null },
  { account_code: '5100', account_name: 'Advertising & Marketing',  account_type: AccountType.EXPENSE,   account_subtype: null },
  { account_code: '5200', account_name: 'Bank Fees & Charges',      account_type: AccountType.EXPENSE,   account_subtype: null },
  { account_code: '5300', account_name: 'Insurance',                account_type: AccountType.EXPENSE,   account_subtype: null },
  { account_code: '5400', account_name: 'Meals & Entertainment',    account_type: AccountType.EXPENSE,   account_subtype: null },
  { account_code: '5500', account_name: 'Office Expenses',          account_type: AccountType.EXPENSE,   account_subtype: null },
  { account_code: '5600', account_name: 'Professional Fees',        account_type: AccountType.EXPENSE,   account_subtype: null },
  { account_code: '5700', account_name: 'Rent & Facilities',        account_type: AccountType.EXPENSE,   account_subtype: null },
  { account_code: '5800', account_name: 'Software & Subscriptions', account_type: AccountType.EXPENSE,   account_subtype: null },
  { account_code: '5900', account_name: 'Travel',                   account_type: AccountType.EXPENSE,   account_subtype: null },
  { account_code: '6000', account_name: 'Payroll & Wages',          account_type: AccountType.EXPENSE,   account_subtype: null },
  { account_code: '6100', account_name: 'Utilities',                account_type: AccountType.EXPENSE,   account_subtype: null },
  { account_code: '6200', account_name: 'Depreciation',             account_type: AccountType.EXPENSE,   account_subtype: null },
  { account_code: '6900', account_name: 'Other Expenses',           account_type: AccountType.EXPENSE,   account_subtype: null },
];

@Injectable()
export class BusinessesService {
  private readonly logger = new Logger(BusinessesService.name);

  constructor(
    @InjectRepository(Business)
    private readonly businessRepo: Repository<Business>,
    @InjectRepository(Account)
    private readonly accountRepo: Repository<Account>,
    private readonly config: ConfigService,
    private readonly taxSeedService: TaxSeedService,
    private readonly provinceConfigService: ProvinceConfigService,
    private readonly automationsService: AutomationsService,
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
    clerkUserId?: string,
  ): Promise<Business> {
    const business = await this.findById(id);

    // Phase 32b: capture pre-state for onboarding-completion detection
    const wasOnboarded = business.settings?.mode_selected === true;

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

    const saved = await this.businessRepo.save(business);

    // Phase 32b: fire onboarding.completed exactly once, on first true completion.
    // Cancel-onboarding currently fails validation at the DTO layer (pre-existing
    // bug to be addressed in Phase 33), so cancel calls never reach this point.
    const isNowOnboarded = saved.settings?.mode_selected === true;
    if (!wasOnboarded && isNowOnboarded && clerkUserId) {
      void this.fireOnboardingCompleted(clerkUserId);
    }

    return saved;
  }

  // Phase 32b: fetch verified user details from Clerk and fire automation rules.
  // Fire-and-forget; swallow errors so onboarding write never fails on email issues.
  private async fireOnboardingCompleted(clerkUserId: string): Promise<void> {
    try {
      // DEBUG: Log what we're getting for the secret key
      const secretKey = this.config.get<string>('CLERK_SECRET_FOR_AUTOMATION') ?? '';
      this.logger.log(`fireOnboardingCompleted ${clerkUserId}: secretKey exists=${!!secretKey}, length=${secretKey.length}`);
      
      if (!secretKey) {
        this.logger.warn(`fireOnboardingCompleted ${clerkUserId}: CLERK_SECRET_KEY is empty or undefined`);
        return;
      }

      const { createClerkClient } = await import('@clerk/backend');
      const clerk = createClerkClient({ secretKey });

      this.logger.log(`fireOnboardingCompleted ${clerkUserId}: Clerk client created, fetching user...`);
      
      const user = await clerk.users.getUser(clerkUserId);
      
      const email =
        user.primaryEmailAddress?.emailAddress ??
        user.emailAddresses?.[0]?.emailAddress;

      if (!email) {
        this.logger.warn(`fireOnboardingCompleted ${clerkUserId}: no email found`);
        return;
      }

      this.logger.log(`fireOnboardingCompleted ${clerkUserId}: user found, email=${email}, firing rules...`);

      await this.automationsService.fireRules('onboarding.completed', {
        email,
        first_name: user.firstName ?? '',
        last_name:  user.lastName  ?? '',
      });

      this.logger.log(`fireOnboardingCompleted ${clerkUserId}: automation rules fired successfully`);
      
    } catch (err: any) {
      this.logger.error(`fireOnboardingCompleted ${clerkUserId}: ERROR - ${err.message}`, err.stack);
    }
  }

  // -- Phase 20: Upsert Expo push token ------------------------------------

  /**
   * Stores or clears the Expo push token for a business.
   * Called on every mobile app launch (upsert) and on sign-out (null).
   * Does nothing if the token is already the same value -- avoids
   * unnecessary writes on repeated launches.
   */
  async updatePushToken(id: string, token: string | null): Promise<void> {
    const business = await this.findById(id);
    if (business.expo_push_token === token) return;
    business.expo_push_token = token;
    await this.businessRepo.save(business);
  }

  // -- Phase 9: Update Canadian tax settings --------------------------------
  async updateTaxSettings(
    id: string,
    dto: UpdateTaxSettingsDto,
  ): Promise<Business> {
    const business = await this.findById(id);

    const isFirstProvinceSet =
      dto.province_code !== undefined && business.province_code === null;

    if (dto.province_code !== undefined) {
      const provinceConfig = await this.provinceConfigService.getProvinceConfig(
        dto.province_code,
      );
      if (!provinceConfig) {
        throw new BadRequestException(
          `Invalid province code: ${dto.province_code}. Must be a valid Canadian province or territory code.`,
        );
      }
      business.province_code = dto.province_code;

      if (isFirstProvinceSet) {
        await this.taxSeedService.seedDefaultTaxCodes(id, provinceConfig);
      }
    }

    if (dto.hst_registration_number !== undefined) {
      business.hst_registration_number = dto.hst_registration_number;
    }

    if (dto.hst_reporting_frequency !== undefined) {
      business.hst_reporting_frequency = dto.hst_reporting_frequency;
    }

    return this.businessRepo.save(business);
  }

  async provision(
    clerkOrgId: string,
    name: string,
  ): Promise<Business> {
    const existing = await this.findByClerkOrgId(clerkOrgId);
    if (existing) return existing;

    const business = this.businessRepo.create({
      name: name || 'My Business',
      clerk_org_id: clerkOrgId,
    });

    const saved = await this.businessRepo.save(business);

    // Phase 12: seed standard chart of accounts on every new business creation
    try {
      await this.seedDefaultAccounts(saved.id);
    } catch (err: any) {
      console.warn(`seedDefaultAccounts failed for business ${saved.id}: ${err.message}`);
    }

    // Phase 32b: welcome email moved to onboarding-completion event,
    // fired from update() when settings.mode_selected flips false -> true.
    return saved;
  }

  // -- Phase 12: Seed standard default chart of accounts -------------------
  async seedDefaultAccounts(
    businessId: string,
  ): Promise<{ added: number; skipped: number }> {
    const existing = await this.accountRepo.find({
      where: { business_id: businessId },
      select: ['account_code'],
    });
    const existingCodes = new Set(existing.map((a) => a.account_code));

    let added = 0;
    let skipped = 0;

    for (const def of DEFAULT_ACCOUNTS) {
      if (existingCodes.has(def.account_code)) {
        skipped++;
        continue;
      }
      const acc = this.accountRepo.create();
      Object.assign(acc, {
        business_id: businessId,
        account_code: def.account_code,
        account_name: def.account_name,
        account_type: def.account_type,
        is_active: true,
        ...(def.account_subtype ? { account_subtype: def.account_subtype } : {}),
      });
      await this.accountRepo.save(acc);
      existingCodes.add(def.account_code);
      added++;
    }

    return { added, skipped };
  }

  // -- Seed Chart of Accounts (industry-specific, called from onboarding) --
  async seedAccounts(
    businessId: string,
    industry: string,
  ): Promise<{ seeded: number; skipped: boolean }> {
    const business = await this.findById(businessId);

    const existingCount = await this.accountRepo.count({ where: { business_id: businessId } });
    if (existingCount > 0) {
      return { seeded: 0, skipped: true };
    }

    const country = business.country ?? 'CA';
    const seeds = this.buildAccountSeeds(country, industry);

    const accounts = seeds.map((seed) => {
      const acc = this.accountRepo.create();
      Object.assign(acc, {
        business_id: businessId,
        account_code: seed.code,
        account_name: seed.name,
        account_type: seed.type,
        is_active: true,
        ...(seed.subtype ? { account_subtype: seed.subtype } : {}),
      });
      return acc;
    });

    await this.accountRepo.save(accounts);
    return { seeded: accounts.length, skipped: false };
  }

  // -- Account seed templates ----------------------------------------------

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



