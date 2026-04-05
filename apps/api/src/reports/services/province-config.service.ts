import { Injectable, NotFoundException, Logger, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProvincialTaxConfig } from '../../entities/provincial-tax-config.entity';

// ── Canonical province seed data ─────────────────────────────────────────────
// effective_date: 2012-07-01 — last time any HST rate changed in Canada
// GST has been 5% since 2008 — all provinces share this date as safe baseline
const PROVINCE_SEED: Omit<ProvincialTaxConfig, 'id' | 'created_at'>[] = [
  // HST provinces (combined federal + provincial)
  {
    province_code: 'ON',
    province_name: 'Ontario',
    hst_rate: 0.13,
    gst_rate: 0.05,
    pst_rate: null,
    is_hst_province: true,
    effective_date: '2010-07-01',
  },
  {
    province_code: 'NB',
    province_name: 'New Brunswick',
    hst_rate: 0.15,
    gst_rate: 0.05,
    pst_rate: null,
    is_hst_province: true,
    effective_date: '2016-07-01',
  },
  {
    province_code: 'NS',
    province_name: 'Nova Scotia',
    hst_rate: 0.15,
    gst_rate: 0.05,
    pst_rate: null,
    is_hst_province: true,
    effective_date: '2010-07-01',
  },
  {
    province_code: 'PE',
    province_name: 'Prince Edward Island',
    hst_rate: 0.15,
    gst_rate: 0.05,
    pst_rate: null,
    is_hst_province: true,
    effective_date: '2013-04-01',
  },
  {
    province_code: 'NL',
    province_name: 'Newfoundland and Labrador',
    hst_rate: 0.15,
    gst_rate: 0.05,
    pst_rate: null,
    is_hst_province: true,
    effective_date: '2016-07-01',
  },
  // GST-only province (no PST)
  {
    province_code: 'AB',
    province_name: 'Alberta',
    hst_rate: null,
    gst_rate: 0.05,
    pst_rate: null,
    is_hst_province: false,
    effective_date: '2008-01-01',
  },
  // GST + PST provinces (PST deferred to Phase 9b)
  {
    province_code: 'BC',
    province_name: 'British Columbia',
    hst_rate: null,
    gst_rate: 0.05,
    pst_rate: 0.07,
    is_hst_province: false,
    effective_date: '2013-04-01',
  },
  {
    province_code: 'MB',
    province_name: 'Manitoba',
    hst_rate: null,
    gst_rate: 0.05,
    pst_rate: 0.07,
    is_hst_province: false,
    effective_date: '2023-07-01',
  },
  {
    province_code: 'SK',
    province_name: 'Saskatchewan',
    hst_rate: null,
    gst_rate: 0.05,
    pst_rate: 0.06,
    is_hst_province: false,
    effective_date: '2017-03-23',
  },
  {
    province_code: 'QC',
    province_name: 'Quebec',
    hst_rate: null,
    gst_rate: 0.05,
    pst_rate: 0.09975, // QST — deferred Phase 9b
    is_hst_province: false,
    effective_date: '2013-01-01',
  },
  // Territories — GST only, no provincial tax
  {
    province_code: 'NT',
    province_name: 'Northwest Territories',
    hst_rate: null,
    gst_rate: 0.05,
    pst_rate: null,
    is_hst_province: false,
    effective_date: '2008-01-01',
  },
  {
    province_code: 'NU',
    province_name: 'Nunavut',
    hst_rate: null,
    gst_rate: 0.05,
    pst_rate: null,
    is_hst_province: false,
    effective_date: '2008-01-01',
  },
  {
    province_code: 'YT',
    province_name: 'Yukon',
    hst_rate: null,
    gst_rate: 0.05,
    pst_rate: null,
    is_hst_province: false,
    effective_date: '2008-01-01',
  },
];

@Injectable()
export class ProvinceConfigService implements OnModuleInit {
  private readonly logger = new Logger(ProvinceConfigService.name);

  constructor(
    @InjectRepository(ProvincialTaxConfig)
    private readonly repo: Repository<ProvincialTaxConfig>,
  ) {}

  // ── Seed on module init ───────────────────────────────────────────────────
  // Idempotent — ON CONFLICT DO NOTHING via upsert
  async onModuleInit(): Promise<void> {
    await this.seedProvinces();
  }

  async seedProvinces(): Promise<void> {
    try {
      await this.repo.upsert(PROVINCE_SEED, {
        conflictPaths: ['province_code', 'effective_date'],
        skipUpdateIfNoValuesChanged: true,
      });
      this.logger.log('Province tax configs seeded (13 records — idempotent)');
    } catch (err) {
      this.logger.error(`Province seed failed: ${(err as Error).message}`);
    }
  }

  // ── Read methods ──────────────────────────────────────────────────────────

  async findAll(): Promise<ProvincialTaxConfig[]> {
    return this.repo.find({
      order: { province_name: 'ASC' },
    });
  }

  async findByCode(code: string): Promise<ProvincialTaxConfig> {
    // Return the most recent effective record for this province
    const config = await this.repo.findOne({
      where: { province_code: code.toUpperCase() },
      order: { effective_date: 'DESC' },
    });

    if (!config) {
      throw new NotFoundException(
        `Province config not found for code: ${code.toUpperCase()}`,
      );
    }

    return config;
  }

  // ── Helper used by TaxSeedService ─────────────────────────────────────────
  async getProvinceConfig(code: string): Promise<ProvincialTaxConfig | null> {
    return this.repo.findOne({
      where: { province_code: code.toUpperCase() },
      order: { effective_date: 'DESC' },
    });
  }
}
