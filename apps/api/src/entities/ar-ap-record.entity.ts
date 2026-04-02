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
import { JournalEntry } from './journal-entry.entity';

export enum ArApType {
  RECEIVABLE = 'receivable',
  PAYABLE = 'payable',
}

export enum ArApStatus {
  OUTSTANDING = 'outstanding',
  PARTIALLY_PAID = 'partially_paid',
  PAID = 'paid',
  OVERDUE = 'overdue',
  VOID = 'void',
}

@Entity('ar_ap_records')
export class ArApRecord {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  business_id: string;

  @Column({
    type: 'enum',
    enum: ArApType,
    enumName: 'ar_ap_type',
  })
  type: ArApType;

  // Customer name (receivable) or supplier name (payable)
  @Column({ type: 'varchar', length: 255 })
  party_name: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  party_email: string | null;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  amount: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  amount_paid: number;

  @Column({ type: 'date' })
  due_date: Date;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({
    type: 'enum',
    enum: ArApStatus,
    enumName: 'ar_ap_status',
    default: ArApStatus.OUTSTANDING,
  })
  status: ArApStatus;

  // Set when marked as paid — links to the journal entry that records the payment
  @Column({ type: 'uuid', nullable: true })
  linked_journal_entry_id: string | null;

  @CreateDateColumn({ type: 'timestamp with time zone' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamp with time zone' })
  updated_at: Date;

  // Relationships
  @ManyToOne(() => Business, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'business_id' })
  business: Business;

  @ManyToOne(() => JournalEntry, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'linked_journal_entry_id' })
  linkedJournalEntry: JournalEntry | null;
}
