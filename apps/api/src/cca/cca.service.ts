import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CcaAsset, CCA_CLASSES } from '../entities/cca-asset.entity';

export interface CreateCcaAssetDto {
  name: string;
  description?: string;
  cca_class: string;
  original_cost: number;
  acquisition_date: string;
  business_use_percent?: number;
  ucc_opening_balance?: number | null;
  linked_transaction_id?: string | null;
}

export interface UpdateCcaAssetDto {
  name?: string;
  description?: string;
  original_cost?: number;
  acquisition_date?: string;
  business_use_percent?: number;
  ucc_opening_balance?: number | null;
  is_active?: boolean;
}

export interface CcaYearRow {
  year: number;
  opening_ucc: number;
  additions: number;       // cost added in this year
  cca_deduction: number;   // full deduction (before business use %)
  claimable_amount: number; // deduction * business_use_percent / 100
  closing_ucc: number;
}

export interface CcaAssetSchedule {
  asset: CcaAsset;
  schedule: CcaYearRow[];
  total_deductions: number;
  total_claimable: number;
}

export interface CcaScheduleSummary {
  assets: CcaAssetSchedule[];
  by_class: Record<string, {
    label: string;
    rate: number;
    total_cost: number;
    total_claimable: number;
    assets: CcaAssetSchedule[];
  }>;
  grand_total_claimable: number;
}

@Injectable()
export class CcaService {
  constructor(
    @InjectRepository(CcaAsset)
    private readonly ccaRepo: Repository<CcaAsset>,
  ) {}

  // â”€â”€ CRUD â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  async findAll(businessId: string): Promise<CcaAsset[]> {
    return this.ccaRepo.find({
      where: { business_id: businessId, is_active: true },
      order: { acquisition_date: 'DESC' },
    });
  }

  async create(businessId: string, dto: CreateCcaAssetDto): Promise<CcaAsset> {
    const classInfo = CCA_CLASSES[dto.cca_class];
    const rate = classInfo?.rate ?? 0.30;

    const asset = this.ccaRepo.create({
      business_id: businessId,
      name: dto.name,
      description: dto.description ?? null,
      cca_class: dto.cca_class,
      rate,
      original_cost: dto.original_cost,
      acquisition_date: dto.acquisition_date,
      business_use_percent: dto.business_use_percent ?? 100,
      ucc_opening_balance: dto.ucc_opening_balance ?? null,
      linked_transaction_id: dto.linked_transaction_id ?? null,
      is_active: true,
    });
    return this.ccaRepo.save(asset);
  }

  async update(businessId: string, id: string, dto: UpdateCcaAssetDto): Promise<CcaAsset> {
    const asset = await this.ccaRepo.findOne({ where: { id, business_id: businessId } });
    if (!asset) throw new NotFoundException(`CCA asset ${id} not found`);

    if (dto.name !== undefined) asset.name = dto.name;
    if (dto.description !== undefined) asset.description = dto.description ?? null;
    if (dto.original_cost !== undefined) asset.original_cost = dto.original_cost;
    if (dto.acquisition_date !== undefined) asset.acquisition_date = dto.acquisition_date;
    if (dto.business_use_percent !== undefined) asset.business_use_percent = dto.business_use_percent;
    if (dto.ucc_opening_balance !== undefined) asset.ucc_opening_balance = dto.ucc_opening_balance;
    if (dto.is_active !== undefined) asset.is_active = dto.is_active;

    return this.ccaRepo.save(asset);
  }

  async remove(businessId: string, id: string): Promise<void> {
    const asset = await this.ccaRepo.findOne({ where: { id, business_id: businessId } });
    if (!asset) throw new NotFoundException(`CCA asset ${id} not found`);
    asset.is_active = false;
    await this.ccaRepo.save(asset);
  }

  // â”€â”€ Schedule Calculation â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  async getSchedule(businessId: string): Promise<CcaScheduleSummary> {
    const assets = await this.findAll(businessId);

    const assetSchedules: CcaAssetSchedule[] = assets.map((asset) => {
      const schedule = this.calculateAssetSchedule(asset);
      const total_deductions = schedule.reduce((s, r) => s + r.cca_deduction, 0);
      const total_claimable  = schedule.reduce((s, r) => s + r.claimable_amount, 0);
      return { asset, schedule, total_deductions, total_claimable };
    });

    // Group by class
    const by_class: CcaScheduleSummary['by_class'] = {};
    for (const as of assetSchedules) {
      const cls = as.asset.cca_class;
      const info = CCA_CLASSES[cls] ?? { label: `Class ${cls}`, rate: Number(as.asset.rate) };
      if (!by_class[cls]) {
        by_class[cls] = {
          label: info.label,
          rate: info.rate,
          total_cost: 0,
          total_claimable: 0,
          assets: [],
        };
      }
      by_class[cls].total_cost      += Number(as.asset.original_cost);
      by_class[cls].total_claimable += as.total_claimable;
      by_class[cls].assets.push(as);
    }

    const grand_total_claimable = assetSchedules.reduce((s, a) => s + a.total_claimable, 0);

    return { assets: assetSchedules, by_class, grand_total_claimable };
  }

  // â”€â”€ Private helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  private calculateAssetSchedule(asset: CcaAsset): CcaYearRow[] {
    const rows: CcaYearRow[] = [];
    const rate             = Number(asset.rate);
    const businessUsePct   = Number(asset.business_use_percent);
    const acquisitionYear  = new Date(asset.acquisition_date).getFullYear();
    const currentYear      = new Date().getFullYear();

    // Starting UCC: use override if provided, otherwise original cost
    let ucc = Number(asset.ucc_opening_balance ?? asset.original_cost);

    const MAX_YEARS = 40;
    let year = acquisitionYear;

    for (let i = 0; i < MAX_YEARS && ucc > 0.01; i++) {
      const isAcquisitionYear = i === 0;
      // Half-year rule: 50% of normal rate in year of acquisition
      const effectiveRate = isAcquisitionYear ? rate * 0.5 : rate;
      const additions     = isAcquisitionYear ? Number(asset.original_cost) : 0;

      // For the opening UCC in year 1, use the override if set
      const opening_ucc = isAcquisitionYear
        ? Number(asset.ucc_opening_balance ?? asset.original_cost)
        : ucc;

      const cca_deduction   = parseFloat(Math.min(opening_ucc * effectiveRate, opening_ucc).toFixed(2));
      const claimable_amount = parseFloat((cca_deduction * businessUsePct / 100).toFixed(2));
      const closing_ucc     = parseFloat(Math.max(0, opening_ucc - cca_deduction).toFixed(2));

      rows.push({
        year,
        opening_ucc:      parseFloat(opening_ucc.toFixed(2)),
        additions:        parseFloat(additions.toFixed(2)),
        cca_deduction,
        claimable_amount,
        closing_ucc,
      });

      ucc = closing_ucc;
      year++;

      // For Class 12 (100%) the asset is fully deducted after year 2 max
      if (ucc < 0.01) break;

      // Don't project beyond current year + 5 for display purposes
      if (year > currentYear + 5) break;
    }

    return rows;
  }
}
