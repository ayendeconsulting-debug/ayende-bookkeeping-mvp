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
  TrialType,
} from '../entities/subscription.entity';
import { CreateCheckoutSessionDto } from './dto/billing.dto';
import { EmailService } from '../email/email.service';
import { ReferralsService } from '../referrals/referrals.service';

// -- Price ID helpers --------------------------------------------------------
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

/**
 * Compute normalised monthly revenue in cents from a Stripe price object.
 * Annual plans are divided by 12.
 */
function computeMonthlyAmountCents(price: Stripe.Price | undefined): number {
  if (!price) return 0;
  const unitAmount = price.unit_amount ?? 0;
  const interval   = price.recurring?.interval;
  return interval === 'year' ? Math.round(unitAmount / 12) : unitAmount;
}

/**
 * Phase 27.2 A-6: Safely parse a trial_type string from Stripe metadata.
 * Returns the parsed value if it matches the known enum set, otherwise null.
 * Used in webhook handlers to harvest trial_type written by A-2 signup pipelines.
 */
function parseTrialTypeFromMetadata(raw: string | undefined): TrialType | null {
  if (raw === 'none' || raw === 'no_card_14d' || raw === 'mbg_30d') {
    return raw;
  }
  return null;
}

/**
 * Phase 27.2 A-6: Safely parse an ISO-8601 timestamp string from Stripe metadata.
 * Returns a Date if the input is parseable, otherwise null. Used to harvest
 * mbg_ends_at written by buildAccountantCheckoutSession().
 */
function parseTimestampFromMetadata(raw: string | undefined): Date | null {
  if (!raw) return null;
  const d = new Date(raw);
  return Number.isNaN(d.getTime()) ? null : d;
}

// -- Service -----------------------------------------------------------------
@Injectable()
export class BillingService {
  private readonly logger = new Logger(BillingService.name);
  private readonly stripe: Stripe;

  constructor(
    @InjectRepository(Subscription)
    private readonly subscriptionRepo: Repository<Subscription>,
    private readonly emailService: EmailService,
    private readonly referralsService: ReferralsService,
  ) {
    const secretKey = process.env.STRIPE_SECRET_KEY;
    if (!secretKey) {
      this.logger.warn('STRIPE_SECRET_KEY not set - billing features disabled');
    }
    this.stripe = new Stripe(secretKey ?? 'sk_test_placeholder', {
      apiVersion: '2023-10-16',
    });
  }

  // ==========================================================================
  // Phase 27.2 A-2: createCheckoutSession is now a router by plan tier.
  //
  // Starter/Pro -> createTrialSubscriptionRecord() : no Stripe, local 14-day trial
  // Accountant  -> buildAccountantCheckoutSession() : Stripe Checkout, immediate billing
  //
  // Both pipelines return { url } so the controller and frontend callers
  // are unchanged. For the no-card trial pipeline the URL skips Stripe and
  // points directly to the success page with ?trial=true.
  // ==========================================================================
  async createCheckoutSession(
    businessId: string,
    userId: string,
    dto: CreateCheckoutSessionDto,
  ): Promise<{ url: string }> {
    if (dto.plan === 'accountant') {
      return this.buildAccountantCheckoutSession(businessId, userId, dto);
    }
    return this.createTrialSubscriptionRecord(businessId, userId, dto);
  }

  /**
   * Phase 27.2 A-2 : No-card 14-day trial pipeline (Starter, Pro).
   *
   * Creates or updates a subscriptions row with trial_type='no_card_14d'.
   * No Stripe customer, no Stripe subscription. Billing is deferred until
   * the user explicitly subscribes via the in-app trial banner or settings.
   *
   * Idempotent behaviour: if a prior subscription row exists (legacy 60-day
   * trial, cancelled, or partial state), we reset it to a fresh 14-day trial
   * with all Phase 27.2 columns cleared. Stripe linkage is explicitly nulled.
   */
  private async createTrialSubscriptionRecord(
    businessId: string,
    userId: string,
    dto: CreateCheckoutSessionDto,
  ): Promise<{ url: string }> {
    const frontendUrl = process.env.FRONTEND_URL || 'https://gettempo.ca';
    const now         = new Date();
    const trialEndsAt = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);

    const existing = await this.subscriptionRepo.findOne({
      where: { business_id: businessId },
    });

    if (existing) {
      await this.subscriptionRepo.update(existing.id, {
        plan:                   dto.plan,
        billing_cycle:          dto.billing_cycle,
        status:                 'trialing',
        trial_type:             'no_card_14d',
        trial_ends_at:          trialEndsAt,
        trial_reminder_sent_at: null,
        // Fresh trial: clear any prior Stripe linkage and Phase 27.2 state
        stripe_customer_id:     null,
        stripe_subscription_id: null,
        card_collected_at:      null,
        mbg_ends_at:            null,
        readonly_started_at:    null,
        archived_at:            null,
        currency:               'cad',
      });
    } else {
      await this.subscriptionRepo.save(
        this.subscriptionRepo.create({
          business_id:   businessId,
          plan:          dto.plan,
          billing_cycle: dto.billing_cycle,
          status:        'trialing',
          trial_type:    'no_card_14d',
          trial_ends_at: trialEndsAt,
          currency:      'cad',
        }),
      );
    }

    this.logger.log(
      'No-card trial started - business: ' + businessId +
      ' plan: ' + dto.plan + ' cycle: ' + dto.billing_cycle +
      ' user: ' + userId +
      ' ends: ' + trialEndsAt.toISOString(),
    );

    // The frontend redirects to this URL. The success page will be updated
    // in A-11 to render trial-specific copy when ?trial=true is present.
    return { url: frontendUrl + '/billing/success?trial=true' };
  }

  /**
   * Phase 27.2 A-2 : Accountant paid pipeline (Accountant monthly, annual).
   *
   * Stripe Checkout with immediate billing - no trial_period_days.
   * Subscription metadata carries Phase 27.2 safety-net signals:
   *   - monthly : trial_type='mbg_30d', mbg_starts_at, mbg_ends_at
   *   - annual  : trial_type='none',    is_annual_commitment='true'
   *
   * A-6 webhook updates harvest this metadata into the local row.
   *
   * Launch coupon (STRIPE_LAUNCH_COUPON_ID) is Starter/Pro only per the
   * Pricing Amendment v1.0 - not applied to Accountant.
   */
  private async buildAccountantCheckoutSession(
    businessId: string,
    userId: string,
    dto: CreateCheckoutSessionDto,
  ): Promise<{ url: string }> {
    const frontendUrl = process.env.FRONTEND_URL || 'https://gettempo.ca';
    const priceId     = getPriceId(dto.plan, dto.billing_cycle);

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

    const now       = new Date();
    const mbgEndsAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    // Metadata written onto the Stripe Subscription object itself.
    // A-6 webhook reads these and persists to the local subscriptions row.
    const subMetadata: Record<string, string> = {
      business_id:   businessId,
      clerk_user_id: userId,
      plan:          dto.plan,
      billing_cycle: dto.billing_cycle,
    };
    if (dto.billing_cycle === 'monthly') {
      subMetadata.trial_type    = 'mbg_30d';
      subMetadata.mbg_starts_at = now.toISOString();
      subMetadata.mbg_ends_at   = mbgEndsAt.toISOString();
    } else {
      // Annual Accountant: non-refundable 12-month commitment.
      subMetadata.trial_type            = 'none';
      subMetadata.is_annual_commitment  = 'true';
    }

    const sessionParams: Stripe.Checkout.SessionCreateParams = {
      customer: customerId,
      mode:     'subscription',
      line_items: [{ price: priceId, quantity: 1 }],
      // No trial_period_days - card is charged immediately on checkout completion.
      subscription_data: {
        metadata: subMetadata,
      },
      metadata: {
        business_id:   businessId,
        clerk_user_id: userId,
        plan:          dto.plan,
        billing_cycle: dto.billing_cycle,
      },
      success_url: frontendUrl + '/billing/success?session_id={CHECKOUT_SESSION_ID}',
      cancel_url:  frontendUrl + '/pricing',
      currency:    'cad',
    };

    const session = await this.stripe.checkout.sessions.create(sessionParams);
    if (!session.url) {
      throw new InternalServerErrorException('Failed to create Stripe Checkout session');
    }

    this.logger.log(
      'Accountant checkout created - business: ' + businessId +
      ' cycle: ' + dto.billing_cycle +
      ' mbg: ' + (dto.billing_cycle === 'monthly' ? 'yes' : 'no'),
    );

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
        mbg_ends_at: null,
        readonly_started_at: null,
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
      mbg_ends_at: subscription.mbg_ends_at,
      readonly_started_at: subscription.readonly_started_at,
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
      case 'invoice.payment_succeeded':
        await this.handlePaymentSucceeded(event.data.object as Stripe.Invoice);
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

  // -- Webhook handlers -------------------------------------------------------

  /**
   * Phase 27.2 A-6: checkout.session.completed handler.
   *
   * Behaviour (changed from pre-A-6):
   *   - status is now derived from Stripe subscription state via mapStripeStatus()
   *     instead of hardcoded 'trialing'. This is correct for:
   *       - Starter/Pro (late card collection via Portal): Stripe reports the
   *         real subscription state (trialing or active); we mirror it.
   *       - Accountant Monthly: Stripe reports 'active' immediately (no
   *         trial_period_days); local status becomes 'active', not 'trialing'.
   *       - Accountant Annual: same as monthly - straight to 'active'.
   *   - card_collected_at is populated with the current timestamp, since a
   *     successful checkout session means a payment method was attached.
   *   - trial_type is harvested from Stripe subscription metadata if present.
   *     D-4-A safety: metadata-absence does NOT overwrite an existing value
   *     to null - TypeORM's update() skips undefined fields.
   *   - mbg_ends_at is harvested from Stripe subscription metadata if present
   *     (populated by A-2's buildAccountantCheckoutSession for monthly only).
   *
   * Event-ordering note (D-1-B): This handler is the authoritative source of
   * A-1 column population. customer.subscription.updated is update-only and
   * will NOT create a row, so handleSubscriptionUpdated silently no-ops if
   * it arrives before this handler. Stripe guarantees checkout.session.completed
   * as the terminal event of a checkout flow, so this ordering is safe in practice.
   */
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

    // Defaults - overridden from Stripe subscription retrieve below.
    let mappedStatus:       SubscriptionStatus = 'trialing';
    let trialEnd:           Date | null = null;
    let periodEnd:          Date | null = null;
    let monthlyAmountCents: number | null = null;

    // Phase 27.2 A-6: safety-net signals harvested from Stripe subscription metadata.
    // Set to undefined (not null) so TypeORM's update() skips them on absence,
    // preserving any pre-existing local value (D-4-A safety).
    let trialTypeFromMeta: TrialType | undefined;
    let mbgEndsAtFromMeta: Date | null | undefined;

    if (stripeSubscriptionId) {
      try {
        const stripeSub = await this.stripe.subscriptions.retrieve(stripeSubscriptionId);
        mappedStatus = this.mapStripeStatus(stripeSub.status);
        trialEnd     = stripeSub.trial_end          ? new Date(stripeSub.trial_end * 1000)          : null;
        periodEnd    = stripeSub.current_period_end ? new Date(stripeSub.current_period_end * 1000) : null;
        // Phase 26: capture normalised monthly revenue for Insights dashboard
        monthlyAmountCents = computeMonthlyAmountCents(stripeSub.items.data[0]?.price);

        // Phase 27.2 A-6: harvest metadata signals written by A-2 signup pipelines.
        const metaTrialType = parseTrialTypeFromMetadata(stripeSub.metadata?.trial_type);
        if (metaTrialType !== null) {
          trialTypeFromMeta = metaTrialType;
        }
        const metaMbgEndsAt = parseTimestampFromMetadata(stripeSub.metadata?.mbg_ends_at);
        if (metaMbgEndsAt !== null) {
          mbgEndsAtFromMeta = metaMbgEndsAt;
        }
      } catch (err) {
        this.logger.error('Failed to retrieve Stripe subscription', err);
      }
    }

    const cardCollectedAt = new Date();

    const basePatch = {
      stripe_customer_id:     stripeCustomerId,
      stripe_subscription_id: stripeSubscriptionId,
      plan,
      billing_cycle:          billingCycle,
      status:                 mappedStatus,
      trial_ends_at:          trialEnd,
      current_period_end:     periodEnd,
      currency:               'cad',
      customer_email:         customerEmail,
      monthly_amount_cents:   monthlyAmountCents,
      card_collected_at:      cardCollectedAt,
      // trial_type and mbg_ends_at applied conditionally below to avoid
      // overwriting pre-existing values with null/undefined (D-4-A).
    };

    const existing = await this.subscriptionRepo.findOne({ where: { business_id: businessId } });
    if (existing) {
      const updatePatch: Record<string, unknown> = { ...basePatch };
      if (trialTypeFromMeta !== undefined) {
        updatePatch.trial_type = trialTypeFromMeta;
      }
      if (mbgEndsAtFromMeta !== undefined) {
        updatePatch.mbg_ends_at = mbgEndsAtFromMeta;
      }
      await this.subscriptionRepo.update(existing.id, updatePatch);
    } else {
      // Insert path: metadata-absence is OK to write as null explicitly
      // since there is no prior value to preserve.
      await this.subscriptionRepo.save(
        this.subscriptionRepo.create({
          business_id:            businessId,
          ...basePatch,
          trial_type:             trialTypeFromMeta ?? null,
          mbg_ends_at:            mbgEndsAtFromMeta ?? null,
        }),
      );
    }

    this.logger.log(
      'Subscription created - business: ' + businessId +
      ' plan: ' + plan +
      ' status: ' + mappedStatus +
      ' trial_type: ' + (trialTypeFromMeta ?? 'unset') +
      ' card_collected: yes' +
      ' mbg_ends_at: ' + (mbgEndsAtFromMeta ? mbgEndsAtFromMeta.toISOString() : 'none'),
    );

    // Phase 27.2 A-8: send MBG receipt email for Accountant Monthly signups.
    // Fires only for trial_type='mbg_30d' (Accountant Monthly specifically).
    // Accountant Annual (trial_type='none') does not receive this email.
    if (
      trialTypeFromMeta === 'mbg_30d' &&
      customerEmail &&
      mbgEndsAtFromMeta
    ) {
      try {
        const frontendUrl = process.env.FRONTEND_URL || 'https://gettempo.ca';
        const amountCharged = monthlyAmountCents !== null
          ? formatAmount(monthlyAmountCents, 'cad')
          : 'your subscription amount';
        await this.emailService.sendMbgReceipt(customerEmail, {
          firstName:     'there',
          planName:      'Accountant Monthly',
          amountCharged,
          mbgEndDate:    formatDate(mbgEndsAtFromMeta),
          portalUrl:     frontendUrl + '/settings/billing',
        });
      } catch (err: any) {
        this.logger.warn(
          `MBG receipt email failed for ${businessId}: ${err?.message ?? err}`,
        );
      }
    }
  }

  /**
   * Phase 27.2 A-6: checkout.session.expired handler.
   *
   * Behaviour (changed from pre-A-6):
   *   - Abandoned-cart recovery no longer injects trial_period_days: 60.
   *     Under the new model there is no universal 60-day trial. The regenerated
   *     checkout is now a straight paid subscription. In practice this path
   *     is primarily triggered by abandoned Accountant flows (Starter/Pro do
   *     not reach Stripe Checkout via A-2), so paid recovery is the correct
   *     default.
   */
  private async handleCheckoutExpired(
    session: Stripe.Checkout.Session,
  ): Promise<void> {
    if (process.env.NODE_ENV !== 'production') {
      this.logger.log('checkout.session.expired - skipping abandoned cart email in non-production');
      return;
    }
    const customerEmail = session.customer_details?.email ?? session.customer_email;
    if (!customerEmail) {
      this.logger.warn('checkout.session.expired - no customer email, skipping abandoned cart');
      return;
    }
    const originalPriceId = session.line_items?.data?.[0]?.price?.id
      ?? process.env.STRIPE_ACCOUNTANT_MONTHLY_PRICE_ID;
    try {
      const frontendUrl = process.env.FRONTEND_URL || 'https://gettempo.ca';
      const newSession  = await this.stripe.checkout.sessions.create({
        mode: 'subscription',
        payment_method_collection: 'always',
        line_items: [{ price: originalPriceId, quantity: 1 }],
        // Phase 27.2 A-6: no trial_period_days under new model.
        success_url: frontendUrl + '/billing/success?session_id={CHECKOUT_SESSION_ID}',
        cancel_url:  frontendUrl + '/pricing',
        currency:    'cad',
        expires_at:  Math.floor(Date.now() / 1000) + 86400,
      });
      if (newSession.url) {
        void this.emailService.sendAbandonedCart(customerEmail, { checkoutUrl: newSession.url });
        this.logger.log('Abandoned cart email sent -> ' + customerEmail);
      }
    } catch (err) {
      this.logger.error('Failed to create abandoned cart checkout session', err);
    }
  }

  /**
   * Phase 27.2 A-6: customer.subscription.updated handler.
   *
   * Behaviour (changed from pre-A-6):
   *   - If card_collected_at is NULL on the local row, populate it with the
   *     current timestamp (D-2-A self-healing). Any successful Stripe
   *     subscription update implies a payment method is attached.
   *
   * Deliberately NOT changed (D-1-B):
   *   - This remains an update-only handler. No row is created here. If the
   *     row does not yet exist (Accountant signup with out-of-order events),
   *     the update silently no-ops. handleCheckoutCompleted is the insert path.
   */
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
    // Phase 26: keep monthly revenue in sync on plan changes
    const monthlyAmountCents = computeMonthlyAmountCents(stripeSub.items.data[0]?.price);

    // Phase 27.2 A-6: self-healing card_collected_at population.
    const existing = await this.subscriptionRepo.findOne({ where: { business_id: businessId } });
    if (!existing) {
      this.logger.log('customer.subscription.updated - no local row yet, skipping (will be created by checkout.session.completed)');
      return;
    }

    const updatePatch: Record<string, unknown> = {
      plan,
      status,
      trial_ends_at:        trialEnd,
      current_period_end:   periodEnd,
      monthly_amount_cents: monthlyAmountCents,
    };
    if (!existing.card_collected_at) {
      updatePatch.card_collected_at = new Date();
    }

    await this.subscriptionRepo.update({ business_id: businessId }, updatePatch);
    this.logger.log(
      'Subscription updated - business: ' + businessId +
      ' plan: ' + plan +
      ' status: ' + status +
      (updatePatch.card_collected_at ? ' (card_collected_at backfilled)' : ''),
    );
  }

  private async handleSubscriptionDeleted(
    stripeSub: Stripe.Subscription,
  ): Promise<void> {
    const businessId = stripeSub.metadata?.business_id;
    if (!businessId) return;
    await this.subscriptionRepo.update({ business_id: businessId }, { status: 'cancelled' });
    this.logger.log('Subscription cancelled - business: ' + businessId);

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
    this.logger.log('Payment failed - Stripe customer: ' + customerId);
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

  // Phase 26: invoice.payment_succeeded - referral commission accrual
  private async handlePaymentSucceeded(invoice: Stripe.Invoice): Promise<void> {
    const customerId = invoice.customer as string;
    if (!customerId) return;

    const subscription = await this.subscriptionRepo.findOne({
      where: { stripe_customer_id: customerId },
    });
    if (!subscription) return;

    const periodStart = invoice.period_start
      ? new Date(invoice.period_start * 1000)
      : new Date();
    const periodEnd = invoice.period_end
      ? new Date(invoice.period_end * 1000)
      : new Date();

    try {
      await this.referralsService.processPaymentCommission(
        subscription.business_id,
        subscription.monthly_amount_cents ?? 0,
        periodStart,
        periodEnd,
      );
    } catch (err) {
      this.logger.error('Failed to process referral commission', err);
    }
  }

  // Phase 13: invoice.upcoming - send renewal reminder
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
      this.logger.log('Upcoming payment email sent -> ' + email);
    } catch (err) {
      this.logger.error('Failed to send upcoming payment email', err);
    }
  }

  // Phase 10: invoice.updated
  private async handleInvoiceUpdated(invoice: Stripe.Invoice): Promise<void> {
    if (invoice.status !== 'open' && invoice.status !== 'paid') return;
    const customerId = invoice.customer as string;
    if (!customerId) return;
    const lineItems    = invoice.lines?.data ?? [];
    const meteredLines = lineItems.filter((l) => l.type === 'invoiceitem' || l.proration === false);
    if (meteredLines.length === 0) return;
    this.logger.log(
      'invoice.updated - customer: ' + customerId +
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
      'Trial ending soon - business: ' + (businessId ?? 'unknown') +
      ' ends: ' + (trialEnd?.toISOString() ?? 'unknown'),
    );
    if (!trialEnd) return;
    const msRemaining   = trialEnd.getTime() - Date.now();
    const daysRemaining = Math.max(0, Math.ceil(msRemaining / (1000 * 60 * 60 * 24)));
    const validThresholds = [14, 3, 0];
    if (!validThresholds.includes(daysRemaining)) {
      this.logger.log('Trial ending in ' + daysRemaining + ' days - no email threshold matched, skipping');
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
      this.logger.log('Trial ending email (' + daysRemaining + 'd) sent -> ' + email);
    } catch (err) {
      this.logger.error('Failed to send trial ending email', err);
    }
  }

  // -- Helpers ----------------------------------------------------------------

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
