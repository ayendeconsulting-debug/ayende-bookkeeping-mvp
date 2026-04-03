import {
  Injectable,
  BadRequestException,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import Stripe from 'stripe';
import {
  Subscription,
  SubscriptionPlan,
  SubscriptionStatus,
} from '../entities/subscription.entity';
import { CreateCheckoutSessionDto } from './dto/billing.dto';

// â”€â”€ Price ID helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function getPriceId(
  plan: 'starter' | 'pro' | 'accountant',
  cycle: 'monthly' | 'annual',
): string {
  const map: Record<string, string | undefined> = {
    starter_monthly:    process.env.STRIPE_STARTER_MONTHLY_PRICE_ID,
    starter_annual:     process.env.STRIPE_STARTER_ANNUAL_PRICE_ID,
    pro_monthly:        process.env.STRIPE_PRO_MONTHLY_PRICE_ID,
    pro_annual:         process.env.STRIPE_PRO_ANNUAL_PRICE_ID,
    accountant_monthly: process.env.STRIPE_ACCOUNTANT_MONTHLY_PRICE_ID,
    accountant_annual:  process.env.STRIPE_ACCOUNTANT_ANNUAL_PRICE_ID,
  };
  const priceId = map[`${plan}_${cycle}`];
  if (!priceId) {
    throw new InternalServerErrorException(
      `Stripe price ID not configured for ${plan} ${cycle}`,
    );
  }
  return priceId;
}

function planFromPriceId(priceId: string): SubscriptionPlan {
  const starterIds = [
    process.env.STRIPE_STARTER_MONTHLY_PRICE_ID,
    process.env.STRIPE_STARTER_ANNUAL_PRICE_ID,
  ];
  const proIds = [
    process.env.STRIPE_PRO_MONTHLY_PRICE_ID,
    process.env.STRIPE_PRO_ANNUAL_PRICE_ID,
  ];
  const accountantIds = [
    process.env.STRIPE_ACCOUNTANT_MONTHLY_PRICE_ID,
    process.env.STRIPE_ACCOUNTANT_ANNUAL_PRICE_ID,
  ];

  if (starterIds.includes(priceId))    return 'starter';
  if (proIds.includes(priceId))        return 'pro';
  if (accountantIds.includes(priceId)) return 'accountant';
  return 'starter';
}

// â”€â”€ Service â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
@Injectable()
export class BillingService {
  private readonly logger = new Logger(BillingService.name);
  private readonly stripe: Stripe;

  constructor(
    @InjectRepository(Subscription)
    private readonly subscriptionRepo: Repository<Subscription>,
  ) {
    const secretKey = process.env.STRIPE_SECRET_KEY;
    if (!secretKey) {
      this.logger.warn('STRIPE_SECRET_KEY not set â€” billing features disabled');
    }
    this.stripe = new Stripe(secretKey ?? 'sk_test_placeholder', {
      apiVersion: '2023-10-16',
    });
  }

  /**
   * Create a Stripe Checkout session for a new subscription trial.
   * Card is collected upfront â€” no charge during 60-day trial.
   * After trial, Stripe auto-charges the Starter plan unless cancelled.
   */
  async createCheckoutSession(
    businessId: string,
    userId: string,
    dto: CreateCheckoutSessionDto,
  ): Promise<{ url: string }> {
    const frontendUrl = process.env.FRONTEND_URL || 'https://gettempo.ca';
    const priceId     = getPriceId(dto.plan, dto.billing_cycle);
    const couponId    = process.env.STRIPE_LAUNCH_COUPON_ID;

    // Get or create Stripe customer
    let customerId: string | undefined;
    const existing = await this.subscriptionRepo.findOne({
      where: { business_id: businessId },
    });
    if (existing?.stripe_customer_id) {
      customerId = existing.stripe_customer_id;
    } else {
      const customer = await this.stripe.customers.create({
        metadata: { business_id: businessId, clerk_user_id: userId },
      });
      customerId = customer.id;
    }

    const sessionParams: Stripe.Checkout.SessionCreateParams = {
      customer: customerId,
      mode: 'subscription',
      payment_method_collection: 'always',
      line_items: [{ price: priceId, quantity: 1 }],
      subscription_data: {
        trial_period_days: 60,
        metadata: {
          business_id:   businessId,
          clerk_user_id: userId,
          plan:          dto.plan,
          billing_cycle: dto.billing_cycle,
        },
      },
      metadata: {
        business_id:   businessId,
        clerk_user_id: userId,
        plan:          dto.plan,
        billing_cycle: dto.billing_cycle,
      },
      success_url: `${frontendUrl}/billing/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url:  `${frontendUrl}/pricing`,
      currency: 'cad',
    };

    if (couponId) {
      sessionParams.discounts = [{ coupon: couponId }];
    }

    const session = await this.stripe.checkout.sessions.create(sessionParams);

    if (!session.url) {
      throw new InternalServerErrorException('Failed to create Stripe Checkout session');
    }

    return { url: session.url };
  }

  /**
   * Create a Stripe Customer Portal session for subscription management.
   */
  async createPortalSession(
    businessId: string,
    returnUrl: string,
  ): Promise<{ url: string }> {
    const subscription = await this.subscriptionRepo.findOne({
      where: { business_id: businessId },
    });

    if (!subscription?.stripe_customer_id) {
      throw new BadRequestException('No Stripe customer found for this business');
    }

    const session = await this.stripe.billingPortal.sessions.create({
      customer:   subscription.stripe_customer_id,
      return_url: returnUrl || `${process.env.FRONTEND_URL || 'https://gettempo.ca'}/settings`,
    });

    return { url: session.url };
  }

  /**
   * Return current subscription status for a business.
   */
  async getSubscription(businessId: string) {
    const subscription = await this.subscriptionRepo.findOne({
      where: { business_id: businessId },
    });

    if (!subscription) {
      return {
        status:             'none',
        plan:               null,
        trial_ends_at:      null,
        current_period_end: null,
        days_remaining:     null,
      };
    }

    let daysRemaining: number | null = null;
    if (subscription.status === 'trialing' && subscription.trial_ends_at) {
      const diff = subscription.trial_ends_at.getTime() - Date.now();
      daysRemaining = Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
    }

    return {
      status:             subscription.status,
      plan:               subscription.plan,
      billing_cycle:      subscription.billing_cycle,
      trial_ends_at:      subscription.trial_ends_at,
      current_period_end: subscription.current_period_end,
      days_remaining:     daysRemaining,
    };
  }

  /**
   * Handle incoming Stripe webhook events.
   * Validates Stripe-Signature header before processing.
   */
  async handleWebhook(rawBody: Buffer, signature: string): Promise<void> {
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    let event: Stripe.Event;
    try {
      event = webhookSecret
        ? this.stripe.webhooks.constructEvent(rawBody, signature, webhookSecret)
        : JSON.parse(rawBody.toString()) as Stripe.Event;
    } catch (err) {
      this.logger.error('Stripe webhook signature verification failed', err);
      throw new BadRequestException('Invalid Stripe webhook signature');
    }

    this.logger.log(`Stripe webhook received: ${event.type}`);

    switch (event.type) {
      case 'checkout.session.completed':
        await this.handleCheckoutCompleted(
          event.data.object as Stripe.Checkout.Session,
        );
        break;
      case 'customer.subscription.updated':
        await this.handleSubscriptionUpdated(
          event.data.object as Stripe.Subscription,
        );
        break;
      case 'customer.subscription.deleted':
        await this.handleSubscriptionDeleted(
          event.data.object as Stripe.Subscription,
        );
        break;
      case 'invoice.payment_failed':
        await this.handlePaymentFailed(
          event.data.object as Stripe.Invoice,
        );
        break;
      case 'customer.subscription.trial_will_end':
        await this.handleTrialWillEnd(
          event.data.object as Stripe.Subscription,
        );
        break;
      default:
        this.logger.log(`Unhandled Stripe event: ${event.type}`);
    }
  }

  // â”€â”€ Webhook handlers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  private async handleCheckoutCompleted(
    session: Stripe.Checkout.Session,
  ): Promise<void> {
    const businessId   = session.metadata?.business_id;
    const plan         = (session.metadata?.plan ?? 'starter') as SubscriptionPlan;
    const billingCycle = (session.metadata?.billing_cycle ?? 'monthly') as 'monthly' | 'annual';

    if (!businessId) {
      this.logger.warn('checkout.session.completed missing business_id');
      return;
    }

    const stripeCustomerId     = session.customer as string;
    const stripeSubscriptionId = session.subscription as string;

    let trialEnd:  Date | null = null;
    let periodEnd: Date | null = null;
    if (stripeSubscriptionId) {
      try {
        const stripeSub = await this.stripe.subscriptions.retrieve(stripeSubscriptionId);
        trialEnd  = stripeSub.trial_end          ? new Date(stripeSub.trial_end * 1000)          : null;
        periodEnd = stripeSub.current_period_end ? new Date(stripeSub.current_period_end * 1000) : null;
      } catch (err) {
        this.logger.error('Failed to retrieve Stripe subscription', err);
      }
    }

    const existing = await this.subscriptionRepo.findOne({
      where: { business_id: businessId },
    });

    if (existing) {
      await this.subscriptionRepo.update(existing.id, {
        stripe_customer_id:     stripeCustomerId,
        stripe_subscription_id: stripeSubscriptionId,
        plan,
        billing_cycle:          billingCycle,
        status:                 'trialing',
        trial_ends_at:          trialEnd,
        current_period_end:     periodEnd,
        currency:               'cad',
      });
    } else {
      await this.subscriptionRepo.save(
        this.subscriptionRepo.create({
          business_id:            businessId,
          stripe_customer_id:     stripeCustomerId,
          stripe_subscription_id: stripeSubscriptionId,
          plan,
          billing_cycle:          billingCycle,
          status:                 'trialing',
          trial_ends_at:          trialEnd,
          current_period_end:     periodEnd,
          currency:               'cad',
        }),
      );
    }

    this.logger.log(`Subscription created â€” business: ${businessId} plan: ${plan}`);
  }

  private async handleSubscriptionUpdated(
    stripeSub: Stripe.Subscription,
  ): Promise<void> {
    const businessId = stripeSub.metadata?.business_id;
    if (!businessId) return;

    const priceId   = stripeSub.items.data[0]?.price?.id ?? '';
    const plan      = planFromPriceId(priceId);
    const status    = this.mapStripeStatus(stripeSub.status);
    const trialEnd  = stripeSub.trial_end          ? new Date(stripeSub.trial_end * 1000)          : null;
    const periodEnd = stripeSub.current_period_end ? new Date(stripeSub.current_period_end * 1000) : null;

    await this.subscriptionRepo.update(
      { business_id: businessId },
      { plan, status, trial_ends_at: trialEnd, current_period_end: periodEnd },
    );

    this.logger.log(`Subscription updated â€” business: ${businessId} plan: ${plan} status: ${status}`);
  }

  private async handleSubscriptionDeleted(
    stripeSub: Stripe.Subscription,
  ): Promise<void> {
    const businessId = stripeSub.metadata?.business_id;
    if (!businessId) return;

    await this.subscriptionRepo.update(
      { business_id: businessId },
      { status: 'cancelled' },
    );

    this.logger.log(`Subscription cancelled â€” business: ${businessId}`);
  }

  private async handlePaymentFailed(invoice: Stripe.Invoice): Promise<void> {
    const customerId = invoice.customer as string;
    if (!customerId) return;

    await this.subscriptionRepo.update(
      { stripe_customer_id: customerId },
      { status: 'past_due' },
    );

    this.logger.log(`Payment failed â€” Stripe customer: ${customerId}`);
  }

  private async handleTrialWillEnd(
    stripeSub: Stripe.Subscription,
  ): Promise<void> {
    const businessId = stripeSub.metadata?.business_id;
    const trialEnd   = stripeSub.trial_end
      ? new Date(stripeSub.trial_end * 1000).toISOString()
      : 'unknown';
    this.logger.log(
      `Trial ending soon â€” business: ${businessId ?? 'unknown'} ends: ${trialEnd}`,
    );
    // TODO Phase 8: trigger engagement email
  }

  // â”€â”€ Helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  private mapStripeStatus(
    stripeStatus: Stripe.Subscription.Status,
  ): SubscriptionStatus {
    switch (stripeStatus) {
      case 'trialing':           return 'trialing';
      case 'active':             return 'active';
      case 'past_due':           return 'past_due';
      case 'canceled':           return 'cancelled';
      case 'unpaid':             return 'past_due';
      case 'incomplete':         return 'past_due';
      case 'incomplete_expired': return 'cancelled';
      default:                   return 'active';
    }
  }
}

