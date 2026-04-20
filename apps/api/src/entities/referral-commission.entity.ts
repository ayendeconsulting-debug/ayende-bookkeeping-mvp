import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

export type CommissionStatus = 'accrued' | 'paid' | 'voided';

@Entity('referral_commissions')
@Index(['partner_id', 'status'])
export class ReferralCommission {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  partner_id: string;

  /** FK to the converted event in referral_events */
  @Column({ type: 'uuid' })
  referral_event_id: string;

  @Column({ type: 'date' })
  period_start: string;

  @Column({ type: 'date' })
  period_end: string;

  /** MRR for this subscriber in this period (CAD) */
  @Column({ type: 'decimal', precision: 10, scale: 2 })
  mrr_amount: number;

  /** Calculated commission (CAD) */
  @Column({ type: 'decimal', precision: 10, scale: 2 })
  commission_amount: number;

  @Column({
    type: 'enum',
    enum: ['accrued', 'paid', 'voided'],
    default: 'accrued',
  })
  status: CommissionStatus;

  /** Set when manually marked as paid */
  @Column({ type: 'timestamp with time zone', nullable: true })
  paid_at: Date | null;

  @CreateDateColumn({ type: 'timestamp with time zone' })
  created_at: Date;
}
