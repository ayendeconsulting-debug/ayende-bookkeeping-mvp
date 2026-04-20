import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, In } from 'typeorm';
import { ReferralPartner } from '../entities/referral-partner.entity';
import { ReferralEvent } from '../entities/referral-event.entity';
import { ReferralCommission } from '../entities/referral-commission.entity';

@Injectable()
export class ReferralsService {
  private readonly logger = new Logger(ReferralsService.name);

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
    return this.dataSource.query(`
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
        FROM referral_events GROUP BY partner_id
      ) ev ON ev.partner_id = rp.id
      LEFT JOIN (
        SELECT partner_id, SUM(commission_amount) AS total_earned
        FROM referral_commissions GROUP BY partner_id
      ) cm ON cm.partner_id = rp.id
      ORDER BY rp.created_at DESC
    `);
  }

  async getPartner(id: string) {
    const rows = await this.dataSource.query(`
      SELECT rp.*,
        COALESCE(ev.click_count, 0)::int AS click_count,
        COALESCE(ev.signup_count, 0)::int AS signup_count,
        COALESCE(ev.conversion_count, 0)::int AS conversion_count,
        COALESCE(cm.total_earned, 0)::numeric AS total_earned,
        COALESCE(cm.total_accrued, 0)::numeric AS total_accrued,
        COALESCE(cm.total_paid, 0)::numeric AS total_paid
      FROM referral_partners rp
      LEFT JOIN (
        SELECT partner_id,
          COUNT(*) FILTER (WHERE event_type = 'click') AS click_count,
          COUNT(*) FILTER (WHERE event_type = 'signup') AS signup_count,
          COUNT(*) FILTER (WHERE event_type = 'converted') AS conversion_count
        FROM referral_events GROUP BY partner_id
      ) ev ON ev.partner_id = rp.id
      LEFT JOIN (
        SELECT partner_id,
          SUM(commission_amount) AS total_earned,
          SUM(commission_amount) FILTER (WHERE status = 'accrued') AS total_accrued,
          SUM(commission_amount) FILTER (WHERE status = 'paid') AS total_paid
        FROM referral_commissions GROUP BY partner_id
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
    const code = dto.referral_code?.trim().toLowerCase() || this.slugify(dto.name);
    if (code.length < 3 || code.length > 50)
      throw new BadRequestException('Referral code must be between 3 and 50 characters');
    if (!/^[a-z0-9][a-z0-9-]*[a-z0-9]$/.test(code) && code.length > 2)
      throw new BadRequestException('Referral code must be URL-safe lowercase. Cannot start or end with a hyphen.');
    const existing = await this.partnerRepo.findOne({ where: { referral_code: code } });
    if (existing) throw new ConflictException(`Referral code "${code}" is already taken`);
    return this.partnerRepo.save(this.partnerRepo.create({
      name: dto.name.trim(), type: dto.type, email: dto.email.trim().toLowerCase(),
      referral_code: code, commission_type: dto.commission_type ?? 'percentage',
      commission_value: dto.commission_value ?? 0, notes: dto.notes?.trim() || null, is_active: true,
    }));
  }

  async updatePartner(id: string, dto: {
    commission_type?: 'percentage' | 'flat'; commission_value?: number;
    is_active?: boolean; notes?: string; email?: string;
  }) {
    const partner = await this.partnerRepo.findOne({ where: { id } });
    if (!partner) throw new NotFoundException('Partner not found');
    if (dto.commission_type !== undefined) partner.commission_type = dto.commission_type;
    if (dto.commission_value !== undefined) partner.commission_value = dto.commission_value;
    if (dto.is_active !== undefined) partner.is_active = dto.is_active;
    if (dto.notes !== undefined) partner.notes = dto.notes?.trim() || null;
    if (dto.email !== undefined) partner.email = dto.email.trim().toLowerCase();
    return this.partnerRepo.save(partner);
  }

  // ── Referral Attribution ──────────────────────────────────────────────

  async trackClick(referralCode: string, metadata?: Record<string, any>): Promise<{ tracked: boolean }> {
    const partner = await this.partnerRepo.findOne({ where: { referral_code: referralCode, is_active: true } });
    if (!partner) { this.logger.warn('Click for unknown/inactive code: ' + referralCode); return { tracked: false }; }
    await this.eventRepo.save(this.eventRepo.create({
      partner_id: partner.id, event_type: 'click', user_id: null, metadata: metadata ?? null,
    }));
    this.logger.log('Referral click — partner: ' + partner.name);
    return { tracked: true };
  }

  async attributeSignup(userId: string, referralCode: string): Promise<{ attributed: boolean; reason?: string }> {
    const existing = await this.eventRepo.findOne({ where: { user_id: userId, event_type: 'signup' } });
    if (existing) return { attributed: false, reason: 'already_attributed' };
    const partner = await this.partnerRepo.findOne({ where: { referral_code: referralCode, is_active: true } });
    if (!partner) return { attributed: false, reason: 'invalid_code' };
    await this.eventRepo.save(this.eventRepo.create({ partner_id: partner.id, event_type: 'signup', user_id: userId }));
    this.logger.log('Referral signup — user: ' + userId + ' partner: ' + partner.name);
    return { attributed: true };
  }

  // ── Commission Engine ─────────────────────────────────────────────────

  /**
   * Called from billing webhook on invoice.payment_succeeded.
   * FR-31: calculate commission per successful payment.
   * FR-32: percentage = mrr * rate/100, flat = commission_value per period.
   * FR-33: only while partner is active AND subscriber is paid.
   */
  async processPaymentCommission(
    businessId: string,
    monthlyAmountCents: number,
    periodStart: Date,
    periodEnd: Date,
  ): Promise<void> {
    // Find clerk user IDs for this business
    const userRows: { clerk_user_id: string }[] = await this.dataSource.query(
      `SELECT clerk_user_id FROM business_users WHERE business_id = $1`, [businessId],
    );
    if (!userRows.length) return;
    const userIds = userRows.map((r) => r.clerk_user_id);

    // Find referral signup event for any of these users
    const signupRows: { id: string; partner_id: string; user_id: string }[] =
      await this.dataSource.query(
        `SELECT id, partner_id, user_id FROM referral_events
         WHERE user_id = ANY($1) AND event_type = 'signup' LIMIT 1`, [userIds],
      );
    if (!signupRows.length) return;
    const signupEvent = signupRows[0];

    // Check partner is active
    const partner = await this.partnerRepo.findOne({ where: { id: signupEvent.partner_id } });
    if (!partner || !partner.is_active) return;

    // Ensure converted event exists (first payment = conversion)
    let convertedEvent = await this.eventRepo.findOne({
      where: { partner_id: partner.id, user_id: signupEvent.user_id, event_type: 'converted' },
    });
    if (!convertedEvent) {
      const subRows: { id: string }[] = await this.dataSource.query(
        `SELECT id FROM subscriptions WHERE business_id = $1 LIMIT 1`, [businessId],
      );
      convertedEvent = await this.eventRepo.save(this.eventRepo.create({
        partner_id: partner.id, event_type: 'converted',
        user_id: signupEvent.user_id, subscription_id: subRows[0]?.id ?? null,
      }));
      this.logger.log('Referral conversion — partner: ' + partner.name + ' user: ' + signupEvent.user_id);
    }

    // Duplicate check for this billing period
    const pStart = periodStart.toISOString().split('T')[0];
    const pEnd = periodEnd.toISOString().split('T')[0];
    const dupRows: { id: string }[] = await this.dataSource.query(
      `SELECT id FROM referral_commissions
       WHERE partner_id = $1 AND referral_event_id = $2 AND period_start = $3 AND period_end = $4`,
      [partner.id, convertedEvent.id, pStart, pEnd],
    );
    if (dupRows.length) return;

    // Calculate commission
    const mrrDollars = monthlyAmountCents / 100;
    const rate = parseFloat(String(partner.commission_value));
    const commissionAmount = partner.commission_type === 'percentage'
      ? Math.round(mrrDollars * rate) / 100
      : rate;

    // Save
    await this.commissionRepo.save(this.commissionRepo.create({
      partner_id: partner.id, referral_event_id: convertedEvent.id,
      period_start: pStart, period_end: pEnd,
      mrr_amount: mrrDollars, commission_amount: commissionAmount, status: 'accrued',
    }));

    this.logger.log(
      'Commission accrued — partner: ' + partner.name +
      ' MRR: $' + mrrDollars.toFixed(2) + ' commission: $' + commissionAmount.toFixed(2),
    );
  }

  /** List commissions, optionally filtered by partner (FR-35). */
  async listCommissions(partnerId?: string) {
    let query = `
      SELECT rc.*, rp.name AS partner_name, rp.referral_code
      FROM referral_commissions rc
      JOIN referral_partners rp ON rp.id = rc.partner_id`;
    const params: string[] = [];
    if (partnerId) { query += ` WHERE rc.partner_id = $1`; params.push(partnerId); }
    query += ` ORDER BY rc.created_at DESC`;
    return this.dataSource.query(query, params);
  }

  /** Bulk mark commissions as paid or voided (FR-34, FR-46). */
  async bulkUpdateCommissions(ids: string[], status: 'paid' | 'voided', paidAt?: string): Promise<{ updated: number }> {
    if (!ids.length) return { updated: 0 };
    const updateData: Record<string, any> = { status };
    if (status === 'paid') updateData.paid_at = paidAt ? new Date(paidAt) : new Date();
    const result = await this.commissionRepo.createQueryBuilder().update().set(updateData).where({ id: In(ids) }).execute();
    this.logger.log('Commissions bulk updated — count: ' + (result.affected ?? 0) + ' status: ' + status);
    return { updated: result.affected ?? 0 };
  }

  // ── Helpers ───────────────────────────────────────────────────────────

  private slugify(name: string): string {
    return name.toLowerCase().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '').slice(0, 50);
  }
}
