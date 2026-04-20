import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { ReferralPartner } from '../entities/referral-partner.entity';
import { ReferralEvent } from '../entities/referral-event.entity';
import { ReferralCommission } from '../entities/referral-commission.entity';

@Injectable()
export class ReferralsService {
  constructor(
    @InjectRepository(ReferralPartner)
    private readonly partnerRepo: Repository<ReferralPartner>,
    @InjectRepository(ReferralEvent)
    private readonly eventRepo: Repository<ReferralEvent>,
    @InjectRepository(ReferralCommission)
    private readonly commissionRepo: Repository<ReferralCommission>,
    private readonly dataSource: DataSource,
  ) {}

  // ── Partner CRUD ──────────────────────────────────────────────────────

  async listPartners() {
    const partners = await this.dataSource.query(`
      SELECT
        rp.*,
        COALESCE(ev.click_count, 0)::int       AS click_count,
        COALESCE(ev.signup_count, 0)::int       AS signup_count,
        COALESCE(ev.conversion_count, 0)::int   AS conversion_count,
        COALESCE(cm.total_earned, 0)::numeric   AS total_earned
      FROM referral_partners rp
      LEFT JOIN (
        SELECT partner_id,
          COUNT(*) FILTER (WHERE event_type = 'click')     AS click_count,
          COUNT(*) FILTER (WHERE event_type = 'signup')    AS signup_count,
          COUNT(*) FILTER (WHERE event_type = 'converted') AS conversion_count
        FROM referral_events
        GROUP BY partner_id
      ) ev ON ev.partner_id = rp.id
      LEFT JOIN (
        SELECT partner_id, SUM(commission_amount) AS total_earned
        FROM referral_commissions
        GROUP BY partner_id
      ) cm ON cm.partner_id = rp.id
      ORDER BY rp.created_at DESC
    `);
    return partners;
  }

  async getPartner(id: string) {
    const rows = await this.dataSource.query(`
      SELECT
        rp.*,
        COALESCE(ev.click_count, 0)::int       AS click_count,
        COALESCE(ev.signup_count, 0)::int       AS signup_count,
        COALESCE(ev.conversion_count, 0)::int   AS conversion_count,
        COALESCE(cm.total_earned, 0)::numeric   AS total_earned,
        COALESCE(cm.total_accrued, 0)::numeric  AS total_accrued,
        COALESCE(cm.total_paid, 0)::numeric     AS total_paid
      FROM referral_partners rp
      LEFT JOIN (
        SELECT partner_id,
          COUNT(*) FILTER (WHERE event_type = 'click')     AS click_count,
          COUNT(*) FILTER (WHERE event_type = 'signup')    AS signup_count,
          COUNT(*) FILTER (WHERE event_type = 'converted') AS conversion_count
        FROM referral_events
        GROUP BY partner_id
      ) ev ON ev.partner_id = rp.id
      LEFT JOIN (
        SELECT partner_id,
          SUM(commission_amount) AS total_earned,
          SUM(commission_amount) FILTER (WHERE status = 'accrued') AS total_accrued,
          SUM(commission_amount) FILTER (WHERE status = 'paid')    AS total_paid
        FROM referral_commissions
        GROUP BY partner_id
      ) cm ON cm.partner_id = rp.id
      WHERE rp.id = $1
    `, [id]);
    if (!rows.length) throw new NotFoundException('Partner not found');
    return rows[0];
  }

  async createPartner(dto: {
    name: string;
    type: 'bank' | 'accountant' | 'user' | 'community';
    email: string;
    referral_code?: string;
    commission_type?: 'percentage' | 'flat';
    commission_value?: number;
    notes?: string;
  }) {
    const code = (dto.referral_code?.trim().toLowerCase() || this.slugify(dto.name));

    if (code.length < 3 || code.length > 50) {
      throw new BadRequestException('Referral code must be between 3 and 50 characters');
    }
    if (!/^[a-z0-9][a-z0-9-]*[a-z0-9]$/.test(code) && code.length > 2) {
      throw new BadRequestException('Referral code must be URL-safe (lowercase letters, numbers, hyphens). Cannot start or end with a hyphen.');
    }

    const existing = await this.partnerRepo.findOne({ where: { referral_code: code } });
    if (existing) {
      throw new ConflictException(`Referral code "${code}" is already taken`);
    }

    const partner = this.partnerRepo.create({
      name: dto.name.trim(),
      type: dto.type,
      email: dto.email.trim().toLowerCase(),
      referral_code: code,
      commission_type: dto.commission_type ?? 'percentage',
      commission_value: dto.commission_value ?? 0,
      notes: dto.notes?.trim() || null,
      is_active: true,
    });

    const saved = await this.partnerRepo.save(partner);
    return saved;
  }

  async updatePartner(
    id: string,
    dto: {
      commission_type?: 'percentage' | 'flat';
      commission_value?: number;
      is_active?: boolean;
      notes?: string;
      email?: string;
    },
  ) {
    const partner = await this.partnerRepo.findOne({ where: { id } });
    if (!partner) throw new NotFoundException('Partner not found');

    if (dto.commission_type !== undefined) partner.commission_type = dto.commission_type;
    if (dto.commission_value !== undefined) partner.commission_value = dto.commission_value;
    if (dto.is_active !== undefined) partner.is_active = dto.is_active;
    if (dto.notes !== undefined) partner.notes = dto.notes?.trim() || null;
    if (dto.email !== undefined) partner.email = dto.email.trim().toLowerCase();

    return this.partnerRepo.save(partner);
  }

  // ── Helpers ───────────────────────────────────────────────────────────

  private slugify(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 50);
  }
}
