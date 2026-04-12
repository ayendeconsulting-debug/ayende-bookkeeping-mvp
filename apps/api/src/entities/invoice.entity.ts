import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { Business } from './business.entity';
import { JournalEntry } from './journal-entry.entity';
import { InvoiceLineItem } from './invoice-line-item.entity';

export enum InvoiceStatus {
  DRAFT = 'draft',
  SENT = 'sent',
  VIEWED = 'viewed',
  PARTIALLY_PAID = 'partially_paid',
  PAID = 'paid',
  OVERDUE = 'overdue',
  VOID = 'void',
}

@Entity('invoices')
export class Invoice {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  business_id: string;

  @Column({ type: 'varchar', length: 50 })
  invoice_number: string;

  @Column({ type: 'varchar', length: 255 })
  client_name: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  client_email: string | null;

  @Column({ type: 'date' })
  issue_date: Date;

  @Column({ type: 'date' })
  due_date: Date;

  @Column({
    type: 'enum',
    enum: InvoiceStatus,
    enumName: 'invoice_status',
    default: InvoiceStatus.DRAFT,
  })
  status: InvoiceStatus;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  subtotal: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  tax_amount: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  total: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  amount_paid: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  balance_due: number;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @Column({ type: 'uuid', nullable: true })
  linked_journal_entry_id: string | null;

  // ── Phase 18: Recurring Invoice Automation ──────────────────────────────

  // When true, the daily job will auto-generate a new invoice on recurring_next_date
  @Column({ type: 'boolean', default: false })
  is_recurring: boolean;

  // 'weekly' | 'monthly' | 'quarterly' — null if not recurring
  @Column({ type: 'varchar', length: 20, nullable: true })
  recurring_frequency: string | null;

  // Date when the next auto-generated invoice should be created
  @Column({ type: 'date', nullable: true })
  recurring_next_date: Date | null;

  // When true, auto-send the invoice via email when generated
  @Column({ type: 'boolean', default: false })
  auto_send: boolean;

  // Optional Stripe payment link URL included in invoice emails
  @Column({ type: 'varchar', length: 500, nullable: true })
  stripe_payment_link: string | null;

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

  @OneToMany(() => InvoiceLineItem, (item) => item.invoice, { cascade: true })
  lineItems: InvoiceLineItem[];
}
