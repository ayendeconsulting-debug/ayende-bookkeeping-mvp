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

export enum RawTransactionSource {
  PLAID = 'plaid',
  CSV = 'csv',
  PDF = 'pdf',
}

export enum RawTransactionStatus {
  PENDING = 'pending',
  CLASSIFIED = 'classified',
  POSTED = 'posted',
  IGNORED = 'ignored',
  DUPLICATE = 'duplicate',
}

@Entity('raw_transactions')
export class RawTransaction {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  business_id: string;

  @ManyToOne(() => Business)
  @JoinColumn({ name: 'business_id' })
  business: Business;

  // Nullable — Plaid-sourced transactions don't use import_batches
  @Column({ type: 'uuid', nullable: true })
  import_batch_id: string;

  @Column({ type: 'date' })
  transaction_date: Date;

  @Column({ type: 'text' })
  description: string;

  @Column({ type: 'decimal', precision: 15, scale: 2 })
  amount: number;

  @Column({ type: 'varchar', length: 255, nullable: true })
  source_account_name: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  source_account_type: string;

  // ─── SOURCE TRACKING ──────────────────────────────────────────
  // Identifies whether this transaction came from Plaid or file upload
  @Column({
    type: 'enum',
    enum: RawTransactionSource,
    default: RawTransactionSource.CSV,
  })
  source: RawTransactionSource;

  // ─── PLAID-SPECIFIC FIELDS ────────────────────────────────────
  // Plaid's stable transaction identifier — used for deduplication
  // Only populated for source = 'plaid'
  @Column({ type: 'varchar', length: 255, nullable: true, unique: true })
  plaid_transaction_id: string;

  // Plaid's account_id for the account this transaction belongs to
  @Column({ type: 'varchar', length: 255, nullable: true })
  plaid_account_id: string;

  // Plaid transaction category info
  @Column({ type: 'varchar', length: 255, nullable: true })
  plaid_category: string;

  // Whether Plaid has marked this as pending (not yet cleared)
  @Column({ type: 'boolean', default: false })
  plaid_pending: boolean;

  // If this transaction is a cleared version of a pending transaction,
  // this stores the original pending plaid_transaction_id
  @Column({ type: 'varchar', length: 255, nullable: true })
  plaid_pending_transaction_id: string;

  // ─── FILE-IMPORT-SPECIFIC FIELDS ─────────────────────────────
  // Hash signature for deduplication of file-imported transactions
  // Only populated for source = 'csv' or 'pdf'
  @Column({ type: 'varchar', length: 64, nullable: true })
  hash_signature: string;

  // ─── STATUS ───────────────────────────────────────────────────
  @Column({
    type: 'enum',
    enum: RawTransactionStatus,
    default: RawTransactionStatus.PENDING,
  })
  status: RawTransactionStatus;

  @Column({ type: 'text', nullable: true })
  notes: string;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
