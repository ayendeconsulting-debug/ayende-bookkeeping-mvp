import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TaxCode, TaxCategory, TaxType } from '../../entities/tax-code.entity';
import { Account, AccountSubtype } from '../../entities/account.entity';
import { ProvincialTaxConfig } from '../../entities/provincial-tax-config.entity';

interface TaxCodeSeed {
  code: string;
  name: string;
  description: string;
  tax_type: TaxType;
  rate: number;
  itc_eligible: boolean;
  itc_rate: number;
  tax_category: TaxCategory;
}

@Injectable()
export class TaxSeedService {
  private readonly logger = new Logger(TaxSeedService.name);

  constructor(
    @InjectRepository(TaxCode)
    private readonly taxCodeRepo: Repository<TaxCode>,
    @InjectRepository(Account)
    private readonly accountRepo: Repository<Account>,
  ) {}

  // ── Main entry point called from BusinessesService ────────────────────────
  async seedDefaultTaxCodes(
    businessId: string,
    provinceConfig: ProvincialTaxConfig,
  ): Promise<{ seeded: number; skipped: boolean }> {
    // Check if tax codes already exist — idempotent
    const existingCount = await this.taxCodeRepo.count({
      where: { business_id: businessId },
    });
    if (existingCount > 0) {
      return { seeded: 0, skipped: true };
    }

    // Find the HST/GST payable account for this business
    const taxAccount = await this.accountRepo.findOne({
      where: {
        business_id: businessId,
        account_subtype: AccountSubtype.TAX_PAYABLE,
        is_active: true,
      },
    });

    if (!taxAccount) {
      this.logger.warn(
        `No TAX_PAYABLE account found for business ${businessId} — tax code seeding skipped`,
      );
      return { seeded: 0, skipped: true };
    }

    const seeds = this.buildTaxCodeSeeds(provinceConfig);
    const taxCodes = seeds.map((seed) =>
      this.taxCodeRepo.create({
        business_id: businessId,
        tax_account_id: taxAccount.id,
        province_code: provinceConfig.province_code,
        ...seed,
        is_active: true,
      }),
    );

    await this.taxCodeRepo.save(taxCodes);
    this.logger.log(
      `Seeded ${taxCodes.length} default tax codes for business ${businessId} (${provinceConfig.province_code})`,
    );

    return { seeded: taxCodes.length, skipped: false };
  }

  // ── Build seed list based on province config ──────────────────────────────
  private buildTaxCodeSeeds(config: ProvincialTaxConfig): TaxCodeSeed[] {
    const isHst = config.is_hst_province;
    const rate = isHst ? Number(config.hst_rate) : Number(config.gst_rate);
    const taxLabel = isHst ? `HST ${Math.round(rate * 100)}%` : `GST ${Math.round(rate * 100)}%`;
    const category = isHst ? TaxCategory.HST : TaxCategory.GST;

    return [
      // Output — collected from customers on sales/invoices
      {
        code: isHst ? 'HST-OUT' : 'GST-OUT',
        name: `${taxLabel} — Sales (Output)`,
        description: `${taxLabel} collected on sales and revenue. Apply to invoices and revenue transactions.`,
        tax_type: TaxType.OUTPUT,
        rate,
        itc_eligible: false, // Output tax is never an ITC
        itc_rate: 0,
        tax_category: category,
      },
      // Input — paid on business expenses, 100% ITC eligible
      {
        code: isHst ? 'HST-IN' : 'GST-IN',
        name: `${taxLabel} — Purchases (Input, 100% ITC)`,
        description: `${taxLabel} paid on fully deductible business expenses. 100% ITC recoverable.`,
        tax_type: TaxType.INPUT,
        rate,
        itc_eligible: true,
        itc_rate: 1.0,
        tax_category: TaxCategory.INPUT_TAX_CREDIT,
      },
      // Meals & Entertainment — 50% ITC (CRA rule: only 50% of M&E is deductible)
      {
        code: isHst ? 'HST-ME' : 'GST-ME',
        name: `${taxLabel} — Meals & Entertainment (50% ITC)`,
        description: `${taxLabel} on meals and entertainment expenses. Only 50% ITC recoverable per CRA rules.`,
        tax_type: TaxType.INPUT,
        rate,
        itc_eligible: true,
        itc_rate: 0.5,
        tax_category: TaxCategory.INPUT_TAX_CREDIT,
      },
      // Zero-rated — 0% tax, still reportable (exports, basic groceries, etc.)
      {
        code: isHst ? 'HST-ZR' : 'GST-ZR',
        name: `${taxLabel} — Zero-Rated (0%)`,
        description: `Zero-rated supply. Tax rate is 0% but transaction is reportable. Applies to exports, basic groceries, certain medical supplies.`,
        tax_type: TaxType.OUTPUT,
        rate: 0,
        itc_eligible: false,
        itc_rate: 0,
        tax_category: TaxCategory.HST_ZERO_RATED,
      },
      // Exempt — no tax, not reportable (residential rent, health services, etc.)
      {
        code: isHst ? 'HST-EX' : 'GST-EX',
        name: `${taxLabel} — Exempt (0%)`,
        description: `Exempt supply. No tax charged and no ITC may be claimed. Applies to residential rent, most health/dental services, financial services.`,
        tax_type: TaxType.OUTPUT,
        rate: 0,
        itc_eligible: false,
        itc_rate: 0,
        tax_category: TaxCategory.HST_EXEMPT,
      },
    ];
  }
}
