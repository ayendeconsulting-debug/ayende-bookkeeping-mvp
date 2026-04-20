import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
export type SubscriptionPlan    = 'starter' | 'pro' | 'accountant';
export type SubscriptionStatus  = 'trialing' | 'active' | 'past_due' | 'cancelled';
export type BillingCycle        = 'monthly' | 'annual';
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
    enum: ['trialing', 'active', 'past_due', 'cancelled'],
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
