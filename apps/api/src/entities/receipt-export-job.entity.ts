import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export enum ReceiptExportStatus {
  QUEUED = 'queued',
  RUNNING = 'running',
  COMPLETE = 'complete',
  FAILED = 'failed',
}

@Entity('receipt_export_jobs')
@Index(['business_id', 'created_at'])
export class ReceiptExportJob {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  business_id: string;

  // Clerk user ID -- varchar not uuid (matches AuditLog and AiUsageLog convention)
  @Column({ type: 'varchar', length: 255 })
  user_id: string;

  @Column({
    type: 'enum',
    enum: ReceiptExportStatus,
    enumName: 'receipt_export_status',
    default: ReceiptExportStatus.QUEUED,
  })
  status: ReceiptExportStatus;

  @Column({ type: 'date' })
  start_date: Date;

  @Column({ type: 'date' })
  end_date: Date;

  @Column({ type: 'integer', default: 0 })
  receipts_total: number;

  @Column({ type: 'integer', default: 0 })
  extracts_required: number;

  @Column({ type: 'integer', default: 0 })
  extracts_completed: number;

  @Column({ type: 'integer', default: 0 })
  extracts_failed: number;

  @Column({ type: 'integer', default: 0 })
  extracts_cap_exceeded: number;

  // S3 object key -- nullable until job completes successfully
  @Column({ type: 'varchar', length: 1000, nullable: true })
  download_key: string | null;

  // Cross-reference to BullMQ job ID for status polling
  @Column({ type: 'varchar', length: 255, nullable: true })
  bullmq_job_id: string | null;

  @Column({ type: 'text', nullable: true })
  error_message: string | null;

  // Phase 31b.6 - User email captured at submit time. Used by 31b.5 receipt
  // export emails. Currently always null pending email-source decision
  // (JWT enrichment vs Clerk SDK lookup vs subscription.customer_email
  // fallback). 31b.5 will finalize the source.
  @Column({ type: 'varchar', length: 255, nullable: true, default: null })
  user_email: string | null;

  @CreateDateColumn({ type: 'timestamp with time zone' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamp with time zone' })
  updated_at: Date;

  // Set on transition to status complete or failed
  @Column({ type: 'timestamp with time zone', nullable: true })
  completed_at: Date | null;

  // completed_at + 7 days; nullable until completion. Used for UI Expired state.
  @Column({ type: 'timestamp with time zone', nullable: true })
  expires_at: Date | null;
}