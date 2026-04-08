import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Subscription, SubscriptionPlan } from '../entities/subscription.entity';
import { AiUsageLog } from '../entities/ai-usage-log.entity';

export type AlertSeverity = 'info' | 'warning' | 'danger';

export interface AlertState {
  type: string;
  severity: AlertSeverity;
  message: string;
  ctaLabel: string;
  ctaUrl: string;
}

const PLAN_AI_CAPS: Record<SubscriptionPlan, number> = {
  starter:    50,
  pro:        200,
  accountant: 500,
};

@Injectable()
export class BillingAlertService {
  constructor(
    @InjectRepository(Subscription)
    private readonly subscriptionRepo: Repository<Subscription>,
    @InjectRepository(AiUsageLog)
    private readonly aiUsageLogRepo: Repository<AiUsageLog>,
  ) {}

  async computeAlerts(businessId: string): Promise<AlertState[]> {
    const alerts: AlertState[] = [];

    const subscription = await this.subscriptionRepo.findOne({
      where: { business_id: businessId },
    });

    // No subscription record yet â€” nothing to alert on.
    if (!subscription) return alerts;

    const frontendUrl = process.env.FRONTEND_URL || 'https://gettempo.ca';
    const portalUrl   = `${frontendUrl}/settings`;
    const pricingUrl  = `${frontendUrl}/pricing`;

    // â”€â”€ Trial ending alerts â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    if (subscription.status === 'trialing' && subscription.trial_ends_at) {
      const msRemaining   = subscription.trial_ends_at.getTime() - Date.now();
      const daysRemaining = Math.max(0, Math.ceil(msRemaining / (1000 * 60 * 60 * 24)));

      if (daysRemaining <= 1) {
        alerts.push({
          type:     'trial_ending_1',
          severity: 'danger',
          message:  'Your free trial ends today. Add a payment method to keep access.',
          ctaLabel: 'Manage Subscription',
          ctaUrl:   portalUrl,
        });
      } else if (daysRemaining <= 3) {
        alerts.push({
          type:     'trial_ending_3',
          severity: 'warning',
          message:  `Your free trial ends in ${daysRemaining} days.`,
          ctaLabel: 'Manage Subscription',
          ctaUrl:   portalUrl,
        });
      } else if (daysRemaining <= 7) {
        alerts.push({
          type:     'trial_ending_7',
          severity: 'warning',
          message:  `Your free trial ends in ${daysRemaining} days.`,
          ctaLabel: 'Manage Subscription',
          ctaUrl:   portalUrl,
        });
      } else if (daysRemaining <= 14) {
        alerts.push({
          type:     'trial_ending_14',
          severity: 'info',
          message:  `Your free trial ends in ${daysRemaining} days.`,
          ctaLabel: 'View Plans',
          ctaUrl:   pricingUrl,
        });
      }
    }

    // â”€â”€ Payment failed â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    if (subscription.status === 'past_due') {
      alerts.push({
        type:     'payment_failed',
        severity: 'danger',
        message:  'Your last payment failed. Update your payment method to avoid losing access.',
        ctaLabel: 'Update Payment',
        ctaUrl:   portalUrl,
      });
    }

    // â”€â”€ Subscription cancelled â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    if (subscription.status === 'cancelled') {
      alerts.push({
        type:     'subscription_cancelled',
        severity: 'danger',
        message:  'Your subscription has been cancelled.',
        ctaLabel: 'Resubscribe',
        ctaUrl:   pricingUrl,
      });
    }

    // â”€â”€ AI usage alerts (Starter and Pro only) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    if (subscription.plan === 'starter' || subscription.plan === 'pro') {
      const cap        = PLAN_AI_CAPS[subscription.plan];
      const now        = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

      const usageCount = await this.aiUsageLogRepo
        .createQueryBuilder('log')
        .where('log.business_id = :businessId', { businessId })
        .andWhere('log.used_at >= :monthStart', { monthStart })
        .getCount();

      const usagePct = cap > 0 ? usageCount / cap : 0;

      if (usagePct >= 1) {
        alerts.push({
          type:     'ai_cap_reached',
          severity: 'danger',
          message:  `You've used all ${cap} AI credits for this month. Upgrade to Pro for more.`,
          ctaLabel: 'Upgrade Plan',
          ctaUrl:   pricingUrl,
        });
      } else if (usagePct >= 0.8) {
        alerts.push({
          type:     'ai_cap_warning',
          severity: 'warning',
          message:  `You've used ${usageCount} of ${cap} AI credits this month (${Math.round(usagePct * 100)}%).`,
          ctaLabel: 'Upgrade Plan',
          ctaUrl:   pricingUrl,
        });
      }
    }

    // Sort: danger first, then warning, then info.
    const order: Record<AlertSeverity, number> = { danger: 0, warning: 1, info: 2 };
    alerts.sort((a, b) => order[a.severity] - order[b.severity]);

    return alerts;
  }
}

