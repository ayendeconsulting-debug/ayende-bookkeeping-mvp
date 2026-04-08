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
import { EmailService } from '../email/email.service';

// â”€â”€ Price ID helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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

function billingCycleFromPriceId(priceId: string): 'monthly' | 'annual' {
  const annualIds = [
    process.env.STRIPE_STARTER_ANNUAL_PRICE_ID,
    process.env.STRIPE_PRO_ANNUAL_PRICE_ID,
    process.env.STRIPE_ACCOUNTANT_ANNUAL_PRICE_ID,
  ];
  return annualIds.includes(priceId) ? 'annual' : 'monthly';
}

function formatAmount(unitAmount: number | null, currency: string): string {
  if (unitAmount === null) return 'your plan rate';
  const dollars = unitAmount / 100;
  const currencyUpper = (currency || 'cad').toUpperCase();
  return '$' + dollars.toLocaleString('en-CA', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' ' + currencyUpper;
}

function formatDate(date: Date): string {
  return date.toLocaleDateString('en-CA', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

function planLabel(plan: SubscriptionPlan): string {
  const labels: Record<SubscriptionPlan, string> = {
    starter:    'Starter',
    pro:        'Pro',
    accountant: 'Accountant',
  };
  return labels[plan] ?? 'Starter';
}

// â”€â”€ Service â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
@Injectable()
export class BillingService {
  private readonly logger = new Logger(BillingService.name);
  private readonly stripe: Stripe;

  constructor(
    @InjectRepository(Subscription)
    private readonly subscriptionRepo: Repository<Subscription>,
    private readonly emailService: EmailService,
  ) {
    const secretKey = process.env.STRIPE_SECRET_KEY;
    if (!secretKey) {
      this.logger.warn('STRIPE_SECRET_KEY not set â€” billing features disabled');
    }
    this.stripe = new Stripe(secretKey ?? 'sk_test_placeholder', {
      apiVersion: '2023-10-16',
    });
  }

  async createCheckoutSession(
    businessId: string,
    userId: string,
    dto: CreateCheckoutSessionDto,
  ): Promise<{ url: string }> {
    const frontendUrl = process.env.FRONTEND_URL || 'https://gettempo.ca';
    const priceId     = getPriceId(dto.plan, dto.billing_cycle);
    const couponId    = process.env.STRIPE_LAUNCH_COUPON_ID;

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
      success_url: frontendUrl + '/billing/success?session_id={CHECKOUT_SESSION_ID}',
      cancel_url:  frontendUrl + '/pricing',
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

  async createPortalSession(
    businessId: string,
    returnUrl: string,
  ): Promise<{ url: string }> {
    const frontendUrl = process.env.FRONTEND_URL || 'https://gettempo.ca';

    const subscription = await this.subscriptionRepo.findOne({
      where: { business_id: businessId },
    });

    if (!subscription?.stripe_customer_id) {
      return { url: frontendUrl + '/pricing' };
    }

    const session = await this.stripe.billingPortal.sessions.create({
      customer:   subscription.stripe_customer_id,
      return_url: returnUrl || frontendUrl + '/settings',
    });
    return { url: session.url };
  }

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

    this.logger.log('Stripe webhook received: ' + event.type);

    switch (event.type) {
      case 'checkout.session.completed':
        await this.handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session);
        break;
      case 'checkout.session.expired':
        await this.handleCheckoutExpired(event.data.object as Stripe.Checkout.Session);
        break;
      case 'customer.subscription.updated':
        await this.handleSubscriptionUpdated(event.data.object as Stripe.Subscription);
        break;
      case 'customer.subscription.deleted':
        await this.handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
        break;
      case 'invoice.payment_failed':
        await this.handlePaymentFailed(event.data.object as Stripe.Invoice);
        break;
      case 'invoice.updated':
        await this.handleInvoiceUpdated(event.data.object as Stripe.Invoice);
        break;
      case 'invoice.upcoming':
        await this.handleInvoiceUpcoming(event.data.object as Stripe.Invoice);
        break;
      case 'customer.subscription.trial_will_end':
        await this.handleTrialWillEnd(event.data.object as Stripe.Subscription);
        break;
      default:
        this.logger.log('Unhandled Stripe event: ' + event.type);
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

    // Phase 13: capture customer email for trial reminder CRON
    const customerEmail = session.customer_details?.email ?? null;

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
    const existing = await this.subscriptionRepo.findOne({ where: { business_id: businessId } });
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
        customer_email:         customerEmail,
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
          customer_email:         customerEmail,
        }),
      );
    }
    this.logger.log('Subscription created â€” business: ' + businessId + ' plan: ' + plan);
  }

  private async handleCheckoutExpired(
    session: Stripe.Checkout.Session,
  ): Promise<void> {
    if (process.env.NODE_ENV !== 'production') {
      this.logger.log('checkout.session.expired â€” skipping abandoned cart email in non-production');
      return;
    }
    const customerEmail = session.customer_details?.email ?? session.customer_email;
    if (!customerEmail) {
      this.logger.warn('checkout.session.expired â€” no customer email, skipping abandoned cart');
      return;
    }
    const originalPriceId = session.line_items?.data?.[0]?.price?.id
      ?? process.env.STRIPE_STARTER_ANNUAL_PRICE_ID;
    try {
      const frontendUrl = process.env.FRONTEND_URL || 'https://gettempo.ca';
      const newSession  = await this.stripe.checkout.sessions.create({
        mode: 'subscription',
        payment_method_collection: 'always',
        line_items: [{ price: originalPriceId, quantity: 1 }],
        subscription_data: { trial_period_days: 60 },
        success_url: frontendUrl + '/billing/success?session_id={CHECKOUT_SESSION_ID}',
        cancel_url:  frontendUrl + '/pricing',
        currency:    'cad',
        expires_at:  Math.floor(Date.now() / 1000) + 86400,
      });
      if (newSession.url) {
        void this.emailService.sendAbandonedCart(customerEmail, { checkoutUrl: newSession.url });
        this.logger.log('Abandoned cart email sent â†’ ' + customerEmail);
      }
    } catch (err) {
      this.logger.error('Failed to create abandoned cart checkout session', err);
    }
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
    this.logger.log('Subscription updated â€” business: ' + businessId + ' plan: ' + plan + ' status: ' + status);
  }

  private async handleSubscriptionDeleted(
    stripeSub: Stripe.Subscription,
  ): Promise<void> {
    const businessId = stripeSub.metadata?.business_id;
    if (!businessId) return;
    await this.subscriptionRepo.update({ business_id: businessId }, { status: 'cancelled' });
    this.logger.log('Subscription cancelled â€” business: ' + businessId);

    // Phase 13: send cancellation confirmation email
    try {
      const customerId = stripeSub.customer as string;
      const customer   = await this.stripe.customers.retrieve(customerId);
      if (customer.deleted) return;
      const email = (customer as Stripe.Customer).email;
      if (!email) return;
      const frontendUrl   = process.env.FRONTEND_URL || 'https://gettempo.ca';
      const priceId       = stripeSub.items.data[0]?.price?.id ?? '';
      const plan          = planFromPriceId(priceId);
      const accessEndDate = stripeSub.current_period_end
        ? formatDate(new Date(stripeSub.current_period_end * 1000))
        : 'the end of your billing period';
      void this.emailService.sendCancellationConfirmation(email, {
        planName:       planLabel(plan),
        accessEndDate,
        resubscribeUrl: frontendUrl + '/pricing',
      });
    } catch (err) {
      this.logger.error('Failed to send cancellation confirmation email', err);
    }
  }

  private async handlePaymentFailed(invoice: Stripe.Invoice): Promise<void> {
    const customerId = invoice.customer as string;
    if (!customerId) return;
    await this.subscriptionRepo.update({ stripe_customer_id: customerId }, { status: 'past_due' });
    this.logger.log('Payment failed â€” Stripe customer: ' + customerId);
    try {
      const customer = await this.stripe.customers.retrieve(customerId);
      if (customer.deleted) return;
      const email = (customer as Stripe.Customer).email;
      if (!email) return;
      const subscription  = await this.subscriptionRepo.findOne({ where: { stripe_customer_id: customerId } });
      const frontendUrl   = process.env.FRONTEND_URL || 'https://gettempo.ca';
      const portalUrl     = frontendUrl + '/settings/billing';
      const amountStr     = formatAmount(invoice.amount_due, invoice.currency ?? 'cad');
      const nextRetryDate = invoice.next_payment_attempt
        ? formatDate(new Date(invoice.next_payment_attempt * 1000))
        : undefined;
      void this.emailService.sendPaymentFailed(email, {
        firstName:     'there',
        amount:        amountStr,
        planName:      planLabel(subscription?.plan ?? 'starter'),
        nextRetryDate,
        portalUrl,
      });
    } catch (err) {
      this.logger.error('Failed to send payment failed email', err);
    }
  }

  // â”€â”€ Phase 13: invoice.upcoming â€” send renewal reminder â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  private async handleInvoiceUpcoming(invoice: Stripe.Invoice): Promise<void> {
    const customerId = invoice.customer as string;
    if (!customerId) return;
    try {
      const customer = await this.stripe.customers.retrieve(customerId);
      if (customer.deleted) return;
      const email = (customer as Stripe.Customer).email;
      if (!email) return;
      const subscription  = await this.subscriptionRepo.findOne({ where: { stripe_customer_id: customerId } });
      const frontendUrl   = process.env.FRONTEND_URL || 'https://gettempo.ca';
      const amountStr     = formatAmount(invoice.amount_due, invoice.currency ?? 'cad');
      const renewalDate   = invoice.period_end
        ? formatDate(new Date(invoice.period_end * 1000))
        : 'your next billing date';
      void this.emailService.sendUpcomingPayment(email, {
        amount:      amountStr,
        renewalDate,
        planName:    planLabel(subscription?.plan ?? 'starter'),
        portalUrl:   frontendUrl + '/settings',
      });
      this.logger.log('Upcoming payment email sent â†’ ' + email);
    } catch (err) {
      this.logger.error('Failed to send upcoming payment email', err);
    }
  }

  // â”€â”€ Phase 10: invoice.updated â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  private async handleInvoiceUpdated(invoice: Stripe.Invoice): Promise<void> {
    if (invoice.status !== 'open' && invoice.status !== 'paid') return;
    const customerId = invoice.customer as string;
    if (!customerId) return;
    const lineItems    = invoice.lines?.data ?? [];
    const meteredLines = lineItems.filter((l) => l.type === 'invoiceitem' || l.proration === false);
    if (meteredLines.length === 0) return;
    this.logger.log(
      'invoice.updated â€” customer: ' + customerId +
      ' status: ' + invoice.status +
      ' amount: ' + invoice.amount_due +
      ' lines: ' + meteredLines.length,
    );
  }

  private async handleTrialWillEnd(
    stripeSub: Stripe.Subscription,
  ): Promise<void> {
    const businessId = stripeSub.metadata?.business_id;
    const trialEnd   = stripeSub.trial_end ? new Date(stripeSub.trial_end * 1000) : null;
    this.logger.log(
      'Trial ending soon â€” business: ' + (businessId ?? 'unknown') +
      ' ends: ' + (trialEnd?.toISOString() ?? 'unknown'),
    );
    if (!trialEnd) return;
    const msRemaining   = trialEnd.getTime() - Date.now();
    const daysRemaining = Math.max(0, Math.ceil(msRemaining / (1000 * 60 * 60 * 24)));
    const validThresholds = [14, 3, 0];
    if (!validThresholds.includes(daysRemaining)) {
      this.logger.log('Trial ending in ' + daysRemaining + ' days â€” no email threshold matched, skipping');
      return;
    }
    try {
      const customerId = stripeSub.customer as string;
      const customer   = await this.stripe.customers.retrieve(customerId);
      if (customer.deleted) return;
      const email = (customer as Stripe.Customer).email;
      if (!email) return;
      const priceItem    = stripeSub.items.data[0];
      const priceId      = priceItem?.price?.id ?? '';
      const unitAmount   = priceItem?.price?.unit_amount ?? null;
      const currency     = priceItem?.price?.currency ?? 'cad';
      const billingCycle = billingCycleFromPriceId(priceId);
      const plan         = planFromPriceId(priceId);
      const frontendUrl  = process.env.FRONTEND_URL || 'https://gettempo.ca';
      let portalUrl = frontendUrl + '/settings/billing';
      try {
        const portalSession = await this.stripe.billingPortal.sessions.create({
          customer:   customerId,
          return_url: frontendUrl + '/settings/billing',
        });
        portalUrl = portalSession.url;
      } catch (err) {
        this.logger.warn('Could not create portal session for trial email, using fallback URL');
      }
      void this.emailService.sendTrialEnding(email, {
        firstName:     'there',
        daysRemaining,
        trialEndDate:  formatDate(trialEnd),
        planName:      planLabel(plan),
        planPrice:     formatAmount(unitAmount, currency),
        billingCycle,
        portalUrl,
      });
      this.logger.log('Trial ending email (' + daysRemaining + 'd) sent â†’ ' + email);
    } catch (err) {
      this.logger.error('Failed to send trial ending email', err);
    }
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

