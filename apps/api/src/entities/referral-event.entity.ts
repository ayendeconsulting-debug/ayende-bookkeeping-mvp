import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

export type ReferralEventType =
  | 'click'
  | 'signup'
  | 'trial_start'
  | 'converted'
  | 'churned';

@Entity('referral_events')
@Index(['partner_id'])
@Index(['user_id'])
export class ReferralEvent {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  partner_id: string;

  @Column({
    type: 'enum',
    enum: ['click', 'signup', 'trial_start', 'converted', 'churned'],
  })
  event_type: ReferralEventType;

  /** Clerk user ID — null for click events */
  @Column({ type: 'varchar', length: 255, nullable: true })
  user_id: string | null;

  /** FK to subscriptions table — set on converted event */
  @Column({ type: 'uuid', nullable: true })
  subscription_id: string | null;

  /** UTM params, landing page, IP country, etc. */
  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any> | null;

  @CreateDateColumn({ type: 'timestamp with time zone' })
  created_at: Date;
}
