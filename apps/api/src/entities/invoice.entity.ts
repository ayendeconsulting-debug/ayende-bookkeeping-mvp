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

  // Auto-generated: INV-YYYY-NNN, user can override
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

  // balance_due = total - amount_paid (computed in service layer, stored for query convenience)
  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  balance_due: number;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  // Set when invoice is marked as paid — links to the posted journal entry
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

  @OneToMany(() => InvoiceLineItem, (item) => item.invoice, { cascade: true })
  lineItems: InvoiceLineItem[];
}
