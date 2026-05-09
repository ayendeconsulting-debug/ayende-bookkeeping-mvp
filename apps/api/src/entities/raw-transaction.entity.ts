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

  // Nullable - Plaid-sourced transactions don't use import_batches
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

  // --- SOURCE TRACKING ---
  @Column({
    type: 'enum',
    enum: RawTransactionSource,
    default: RawTransactionSource.CSV,
  })
  source: RawTransactionSource;

  // --- PLAID-SPECIFIC FIELDS ---
  @Column({ type: 'varchar', length: 255, nullable: true, unique: true })
  plaid_transaction_id: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  plaid_account_id: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  plaid_category: string;

  @Column({ type: 'boolean', default: false })
  plaid_pending: boolean;

  @Column({ type: 'varchar', length: 255, nullable: true })
  plaid_pending_transaction_id: string;

  // --- FILE-IMPORT-SPECIFIC FIELDS ---
  @Column({ type: 'varchar', length: 64, nullable: true })
  hash_signature: string;

  // --- MULTI-CURRENCY (Phase 5) ---
  @Column({ type: 'varchar', length: 3, nullable: true })
  currency_code: string | null;

  @Column({ type: 'decimal', precision: 15, scale: 2, nullable: true })
  original_amount: number | null;

  // --- FREELANCER MODE (Phase 5) ---
  @Column({ type: 'boolean', default: false })
  is_personal: boolean;

  // --- STATUS ---
  @Column({
    type: 'enum',
    enum: RawTransactionStatus,
    default: RawTransactionStatus.PENDING,
  })
  status: RawTransactionStatus;

  @Column({ type: 'text', nullable: true })
  notes: string;

  // --- PHASE 15: AI Anomaly Flags ---
  @Column({ type: 'jsonb', nullable: true })
  anomaly_flags: string[] | null;

  // --- PHASE 17: Personal Budget Category ---
  @Column({ type: 'uuid', nullable: true })
  personal_category_id: string | null;

  // --- PHASE 34: Smart Match suggestion columns ---
  // Status field (rt.status) is INTENTIONALLY untouched. Suggestions live alongside.
  // smart_match_status: NULL | 'queued' | 'suggested' | 'cap_exceeded' | 'failed'
  @Column({ type: 'varchar', length: 20, nullable: true, default: null })
  smart_match_status: string | null;

  // smart_match_source: 'rule_learned' | 'rule_manual' | 'rule_mcc' | 'rule_vendor' | 'rule_recurrence' | 'ai'
  @Column({ type: 'varchar', length: 20, nullable: true, default: null })
  smart_match_source: string | null;

  // 'high' | 'medium' | 'low'
  @Column({ type: 'varchar', length: 10, nullable: true, default: null })
  smart_match_confidence: string | null;

  @Column({ type: 'uuid', nullable: true, default: null })
  suggested_account_id: string | null;

  @Column({ type: 'uuid', nullable: true, default: null })
  suggested_tax_code_id: string | null;

  @Column({ type: 'boolean', nullable: true, default: null })
  suggested_is_personal: boolean | null;

  @Column({ type: 'uuid', nullable: true, default: null })
  suggested_personal_category_id: string | null;

  @Column({ type: 'text', nullable: true, default: null })
  smart_match_reasoning: string | null;

  @Column({ type: 'timestamp with time zone', nullable: true, default: null })
  smart_match_at: Date | null;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}