import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Business } from './business.entity';
import { Account } from './account.entity';

export enum RecurringFrequency {
  DAILY = 'daily',
  WEEKLY = 'weekly',
  MONTHLY = 'monthly',
  QUARTERLY = 'quarterly',
  ANNUALLY = 'annually',
}

export enum RecurringSource {
  USER_DEFINED = 'user_defined',
  AI_DETECTED = 'ai_detected',
  PLAID_DETECTED = 'plaid_detected',
}

export enum RecurringStatus {
  ACTIVE = 'active',
  PAUSED = 'paused',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

@Entity('recurring_transactions')
export class RecurringTransaction {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  business_id: string;

  @Column({ type: 'varchar', length: 255 })
  description: string;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  amount: number;

  @Column({ type: 'varchar', length: 3, default: 'CAD' })
  currency_code: string;

  @Column({ type: 'uuid' })
  debit_account_id: string;

  @Column({ type: 'uuid' })
  credit_account_id: string;

  @Column({
    type: 'enum',
    enum: RecurringFrequency,
    enumName: 'recurring_frequency',
  })
  frequency: RecurringFrequency;

  @Column({ type: 'date' })
  start_date: Date;

  @Column({ type: 'date', nullable: true })
  end_date: Date | null;

  @Column({ type: 'date', nullable: true })
  next_run_date: Date | null;

  @Column({
    type: 'enum',
    enum: RecurringSource,
    enumName: 'recurring_source',
    default: RecurringSource.USER_DEFINED,
  })
  source: RecurringSource;

  @Column({
    type: 'enum',
    enum: RecurringStatus,
    enumName: 'recurring_status',
    default: RecurringStatus.ACTIVE,
  })
  status: RecurringStatus;

  // Freelancer mode: marks this recurring item as fully personal (no journal entry posted)
  @Column({ type: 'boolean', default: false })
  is_personal: boolean;

  /**
   * Freelancer mode: ratio of the amount that is business expense (0.0–1.0).
   * 1.0 = 100% business (default, existing behaviour)
   * 0.0 = 100% personal (same effect as is_personal = true)
   * 0.0 < ratio < 1.0 = split — business portion debits debit_account_id,
   *   personal portion debits Owner Draw, full amount credits credit_account_id.
   */
  @Column({ type: 'decimal', precision: 5, scale: 4, default: 1.0 })
  business_ratio: number;

  @Column({ type: 'timestamp with time zone', nullable: true })
  last_posted_at: Date | null;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @CreateDateColumn({ type: 'timestamp with time zone' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamp with time zone' })
  updated_at: Date;

  // Relationships
  @ManyToOne(() => Business, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'business_id' })
  business: Business;

  @ManyToOne(() => Account, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'debit_account_id' })
  debitAccount: Account;

  @ManyToOne(() => Account, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'credit_account_id' })
  creditAccount: Account;
}
