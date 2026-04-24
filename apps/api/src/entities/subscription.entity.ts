import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export type SubscriptionPlan    = 'starter' | 'pro' | 'accountant';
export type SubscriptionStatus  =
  | 'trialing'
  | 'active'
  | 'past_due'
  | 'cancelled'
  | 'trial_expired_readonly'
  | 'archived';
export type BillingCycle        = 'monthly' | 'annual';

/**
 * Trial type — identifies which safety-net mechanic applies to this subscription.
 * - 'none'          : no trial, no MBG (Accountant Annual)
 * - 'no_card_14d'   : 14-day no-card trial (Starter, Pro — both monthly and annual)
 * - 'mbg_30d'       : 30-day money-back guarantee from signup (Accountant Monthly)
 *
 * NULL on rows that predate Phase 27.2 (legacy 60-day trial founder testing accounts).
 */
export type TrialType = 'none' | 'no_card_14d' | 'mbg_30d';

@Entity('subscriptions')
export class Subscription {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index({ unique: true })
  @Column({ type: 'uuid' })
  business_id: string;

  @Index()
  @Column({ type: 'varchar', length: 255, nullable: true })
  stripe_customer_id: string;

  @Index()
  @Column({ type: 'varchar', length: 255, nullable: true })
  stripe_subscription_id: string;

  @Column({
    type: 'enum',
    enum: ['starter', 'pro', 'accountant'],
    default: 'starter',
  })
  plan: SubscriptionPlan;

  @Column({
    type: 'enum',
    enum: [
      'trialing',
      'active',
      'past_due',
      'cancelled',
      'trial_expired_readonly',
      'archived',
    ],
    default: 'trialing',
  })
  status: SubscriptionStatus;

  @Column({
    type: 'enum',
    enum: ['monthly', 'annual'],
    default: 'monthly',
  })
  billing_cycle: BillingCycle;

  @Column({ type: 'varchar', length: 3, default: 'cad' })
  currency: string;

  @Column({ type: 'timestamp with time zone', nullable: true })
  trial_ends_at: Date | null;

  /**
   * Phase 27.2 — Trial Restructure.
   * Identifies the safety-net mechanic for this subscription. Set on signup
   * by BillingService. NULL on legacy rows (pre-Phase 27.2).
   */
  @Column({
    type: 'enum',
    enum: ['none', 'no_card_14d', 'mbg_30d'],
    nullable: true,
    default: null,
  })
  trial_type: TrialType | null;

  /**
   * Phase 27.2 — Trial Restructure.
   * Timestamp the user first added a payment method via Stripe Checkout.
   * NULL during no-card trial. Populated when checkout.session.completed
   * webhook fires.
   */
  @Column({ type: 'timestamp with time zone', nullable: true, default: null })
  card_collected_at: Date | null;

  /**
   * Phase 27.2 — Trial Restructure.
   * End of money-back guarantee window. Populated for Accountant Monthly only.
   * Equals signup_timestamp + 30 days (counted from signup, not first charge).
   */
  @Column({ type: 'timestamp with time zone', nullable: true, default: null })
  mbg_ends_at: Date | null;

  /**
   * Phase 27.2 — Trial Restructure.
   * Timestamp business transitioned to trial_expired_readonly status.
   * Set by the daily trial-transition cron job. Drives the 90-day archive countdown.
   */
  @Column({ type: 'timestamp with time zone', nullable: true, default: null })
  readonly_started_at: Date | null;

  /**
   * Phase 27.2 — Trial Restructure.
   * Timestamp business transitioned to archived status.
   * Set by the daily cron when readonly_started_at exceeds 90 days.
   * On archive, all Plaid items are disconnected.
   */
  @Column({ type: 'timestamp with time zone', nullable: true, default: null })
  archived_at: Date | null;

  @Column({ type: 'timestamp with time zone', nullable: true })
  current_period_end: Date | null;

  /**
   * Customer email stored on checkout completion.
   * Used by TrialMonitorProcessor to send reminder emails without a Stripe API call.
   */
  @Column({ type: 'varchar', length: 255, nullable: true, default: null })
  customer_email: string | null;

  /**
   * Tracks which trial reminder emails have already been sent.
   * Values are day-thresholds as strings: '14', '7', '3', '1'.
   * Used by TrialMonitorProcessor to prevent duplicate sends.
   *
   * NOTE: Phase 27.2 changes the cadence to '3', '1', '0' (see Step A-9).
   * The column structure is unchanged — only the values written to it differ.
   */
  @Column({ type: 'simple-array', nullable: true, default: null })
  trial_reminder_sent_at: string[] | null;

  /**
   * Normalized monthly revenue in cents CAD.
   * For monthly plans: equals Stripe unit_amount.
   * For annual plans: equals Math.round(unit_amount / 12).
   * Set from Stripe webhooks (checkout.session.completed, customer.subscription.updated).
   */
  @Column({ type: 'integer', nullable: true, default: null })
  monthly_amount_cents: number | null;

  @CreateDateColumn({ type: 'timestamp with time zone' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamp with time zone' })
  updated_at: Date;
}
