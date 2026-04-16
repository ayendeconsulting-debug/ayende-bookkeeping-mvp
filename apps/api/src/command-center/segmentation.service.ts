import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Subscription } from '../entities/subscription.entity';
import { Business } from '../entities/business.entity';
import { PlaidItem } from '../entities/plaid-item.entity';
import { Lead } from './lead.entity';

export interface SegmentRecipient {
  email: string;
  businessName: string;
  businessId: string;
}

export interface SegmentInfo {
  key: string;
  label: string;
  description: string;
  count: number;
}

const SEGMENT_META: Omit<SegmentInfo, 'count'>[] = [
  { key: 'all_users',          label: 'All Users',                description: 'Every user with a valid email' },
  { key: 'all_active',         label: 'Active Subscribers',       description: 'Paid subscriptions (status = active)' },
  { key: 'trial_active',       label: 'Active Trials',            description: 'Users currently in trial' },
  { key: 'trial_expiring_7d',  label: 'Trial Expiring (7 days)',  description: 'Trials ending within 7 days' },
  { key: 'trial_expiring_3d',  label: 'Trial Expiring (3 days)',  description: 'Trials ending within 3 days' },
  { key: 'plan_starter',       label: 'Starter Plan',             description: 'All Starter subscribers' },
  { key: 'plan_pro',           label: 'Pro Plan',                 description: 'All Pro subscribers' },
  { key: 'plan_accountant',    label: 'Accountant Plan',          description: 'All Accountant subscribers' },
  { key: 'no_bank_connected',  label: 'No Bank Connected',        description: 'Signed up but no Plaid connection' },
  { key: 'payment_failed',     label: 'Payment Failed',           description: 'Subscriptions with past_due status' },
  { key: 'cold_leads',         label: 'Cold Leads',               description: 'Manually added cold leads not yet converted' },
];

@Injectable()
export class SegmentationService {
  constructor(
    @InjectRepository(Subscription)
    private readonly subRepo: Repository<Subscription>,
    @InjectRepository(Business)
    private readonly bizRepo: Repository<Business>,
    @InjectRepository(PlaidItem)
    private readonly plaidRepo: Repository<PlaidItem>,
    @InjectRepository(Lead)
    private readonly leadRepo: Repository<Lead>,
  ) {}

  // ── Public: resolve a segment key into a recipient list ──────────────────
  async resolve(segmentKey: string): Promise<SegmentRecipient[]> {
    switch (segmentKey) {
      case 'all_users':         return this.querySubs([]);
      case 'all_active':        return this.querySubs([], 'active');
      case 'trial_active':      return this.querySubs([], 'trialing');
      case 'trial_expiring_7d': return this.queryTrialExpiring(7);
      case 'trial_expiring_3d': return this.queryTrialExpiring(3);
      case 'plan_starter':      return this.queryByPlan('starter');
      case 'plan_pro':          return this.queryByPlan('pro');
      case 'plan_accountant':   return this.queryByPlan('accountant');
      case 'no_bank_connected': return this.queryNoBankConnected();
      case 'payment_failed':    return this.querySubs([], 'past_due');
      case 'cold_leads':        return this.queryColdLeads();
      default:                  return [];
    }
  }

  // ── Public: return all segments with live counts ──────────────────────────
  async getSegmentInfos(): Promise<SegmentInfo[]> {
    const results = await Promise.all(
      SEGMENT_META.map(async (meta) => {
        const recipients = await this.resolve(meta.key);
        return { ...meta, count: recipients.length };
      }),
    );
    return results;
  }

  // ── Cold leads — manually added, type=cold, not yet converted ─────────────
  private async queryColdLeads(): Promise<SegmentRecipient[]> {
    const leads = await this.leadRepo
      .createQueryBuilder('lead')
      .where('lead.type = :type', { type: 'cold' })
      .andWhere('lead.status != :status', { status: 'converted' })
      .andWhere('lead.deleted_at IS NULL')
      .select(['lead.email', 'lead.first_name', 'lead.last_name', 'lead.company'])
      .getMany();

    return leads.map((l) => ({
      email:        l.email,
      businessName: l.company ?? `${l.first_name} ${l.last_name}`,
      businessId:   '',
    }));
  }

  // ── Base query — subs joined to businesses ────────────────────────────────
  private async querySubs(
    plans: string[],
    status?: string,
  ): Promise<SegmentRecipient[]> {
    const qb = this.subRepo
      .createQueryBuilder('sub')
      .innerJoin(Business, 'biz', 'biz.id::text = sub.business_id::text')
      .where('sub.customer_email IS NOT NULL')
      .andWhere('biz.deleted_at IS NULL')
      .select('sub.customer_email', 'email')
      .addSelect('biz.name', 'businessName')
      .addSelect('sub.business_id', 'businessId');

    if (status) {
      qb.andWhere('sub.status = :status', { status });
    }
    if (plans.length > 0) {
      qb.andWhere('sub.plan IN (:...plans)', { plans });
    }

    const rows = await qb.getRawMany<{
      email: string;
      businessName: string;
      businessId: string;
    }>();
    return rows;
  }

  private async queryByPlan(plan: string): Promise<SegmentRecipient[]> {
    const qb = this.subRepo
      .createQueryBuilder('sub')
      .innerJoin(Business, 'biz', 'biz.id::text = sub.business_id::text')
      .where('sub.customer_email IS NOT NULL')
      .andWhere('biz.deleted_at IS NULL')
      .andWhere('sub.plan = :plan', { plan })
      .andWhere('sub.status IN (:...statuses)', { statuses: ['active', 'trialing'] })
      .select('sub.customer_email', 'email')
      .addSelect('biz.name', 'businessName')
      .addSelect('sub.business_id', 'businessId');

    return qb.getRawMany();
  }

  private async queryTrialExpiring(days: number): Promise<SegmentRecipient[]> {
    const now = new Date();
    const future = new Date();
    future.setDate(future.getDate() + days);

    const qb = this.subRepo
      .createQueryBuilder('sub')
      .innerJoin(Business, 'biz', 'biz.id::text = sub.business_id::text')
      .where('sub.customer_email IS NOT NULL')
      .andWhere('biz.deleted_at IS NULL')
      .andWhere('sub.status = :status', { status: 'trialing' })
      .andWhere('sub.trial_ends_at BETWEEN :now AND :future', { now, future })
      .select('sub.customer_email', 'email')
      .addSelect('biz.name', 'businessName')
      .addSelect('sub.business_id', 'businessId');

    return qb.getRawMany();
  }

  private async queryNoBankConnected(): Promise<SegmentRecipient[]> {
    const qb = this.subRepo
      .createQueryBuilder('sub')
      .innerJoin(Business, 'biz', 'biz.id::text = sub.business_id::text')
      .where('sub.customer_email IS NOT NULL')
      .andWhere('biz.deleted_at IS NULL')
      .andWhere('sub.status IN (:...statuses)', { statuses: ['active', 'trialing'] })
      .andWhere(
        `NOT EXISTS (
          SELECT 1 FROM plaid_items pi
          WHERE pi.business_id::text = sub.business_id::text
          AND pi.is_deleted = false
        )`,
      )
      .select('sub.customer_email', 'email')
      .addSelect('biz.name', 'businessName')
      .addSelect('sub.business_id', 'businessId');

    return qb.getRawMany();
  }
}
