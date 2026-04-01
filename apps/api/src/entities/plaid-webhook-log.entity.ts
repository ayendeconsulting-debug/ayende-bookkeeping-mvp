import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';

export enum WebhookProcessingStatus {
  RECEIVED = 'received',
  QUEUED = 'queued',
  PROCESSED = 'processed',
  FAILED = 'failed',
  IGNORED = 'ignored',
}

@Entity('plaid_webhook_logs')
export class PlaidWebhookLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // item_id from Plaid payload — may be null for non-item webhooks
  @Column({ type: 'varchar', length: 255, nullable: true })
  item_id: string;

  // business_id resolved from item_id lookup (nullable if item not found)
  @Column({ type: 'uuid', nullable: true })
  business_id: string;

  // e.g. TRANSACTIONS, ITEM, AUTH
  @Column({ type: 'varchar', length: 100 })
  webhook_type: string;

  // e.g. SYNC_UPDATES_AVAILABLE, ERROR, PENDING_EXPIRATION
  @Column({ type: 'varchar', length: 100 })
  webhook_code: string;

  // Full raw payload stored for debugging and replay
  @Column({ type: 'jsonb' })
  payload: Record<string, any>;

  @Column({
    type: 'enum',
    enum: WebhookProcessingStatus,
    default: WebhookProcessingStatus.RECEIVED,
  })
  status: WebhookProcessingStatus;

  // BullMQ job ID if queued
  @Column({ type: 'varchar', length: 255, nullable: true })
  job_id: string;

  @Column({ type: 'text', nullable: true })
  error_message: string;

  @Column({ type: 'timestamp', nullable: true })
  processed_at: Date;

  @CreateDateColumn()
  created_at: Date;
}
