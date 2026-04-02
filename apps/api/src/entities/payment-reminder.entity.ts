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
import { RecurringTransaction } from './recurring-transaction.entity';
import { RawTransaction } from './raw-transaction.entity';

export enum PaymentReminderStatus {
  PENDING = 'pending',
  PAID = 'paid',
  DISMISSED = 'dismissed',
  SNOOZED = 'snoozed',
}

@Entity('payment_reminders')
export class PaymentReminder {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  business_id: string;

  @Column({ type: 'uuid' })
  recurring_transaction_id: string;

  @Column({ type: 'date' })
  due_date: Date;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  estimated_amount: number;

  @Column({
    type: 'enum',
    enum: PaymentReminderStatus,
    enumName: 'payment_reminder_status',
    default: PaymentReminderStatus.PENDING,
  })
  status: PaymentReminderStatus;

  // Set when user snoozes the reminder
  @Column({ type: 'date', nullable: true })
  snoozed_until: Date | null;

  // Auto-matched when a Plaid transaction arrives that fulfils this reminder
  @Column({ type: 'uuid', nullable: true })
  matched_raw_transaction_id: string | null;

  @CreateDateColumn({ type: 'timestamp with time zone' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamp with time zone' })
  updated_at: Date;

  // Relationships
  @ManyToOne(() => Business, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'business_id' })
  business: Business;

  @ManyToOne(() => RecurringTransaction, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'recurring_transaction_id' })
  recurringTransaction: RecurringTransaction;

  @ManyToOne(() => RawTransaction, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'matched_raw_transaction_id' })
  matchedRawTransaction: RawTransaction | null;
}
