import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Business } from './business.entity';

export enum ImportStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
}

@Entity('import_batches')
export class ImportBatch {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  business_id: string;

  @Column({ type: 'varchar', length: 255 })
  file_name: string;

  @Column({ type: 'varchar', length: 10 })
  file_type: string;

  @Column({ type: 'bigint' })
  file_size: number;

  @Column({ type: 'varchar', length: 500 })
  s3_key: string;

  @Column({ type: 'varchar', length: 255 })
  s3_bucket: string;

  @Column({
    type: 'enum',
    enum: ImportStatus,
    enumName: 'import_status',
    default: ImportStatus.PENDING,
  })
  status: ImportStatus;

  @Column({ type: 'integer', default: 0 })
  total_rows: number;

  @Column({ type: 'integer', default: 0 })
  processed_rows: number;

  @Column({ type: 'integer', default: 0 })
  error_rows: number;

  @Column({ type: 'uuid' })
  uploaded_by: string;

  @CreateDateColumn({ type: 'timestamp with time zone' })
  created_at: Date;

  @Column({ type: 'timestamp with time zone', nullable: true })
  started_at: Date;

  @Column({ type: 'timestamp with time zone', nullable: true })
  completed_at: Date;

  @Column({ type: 'text', nullable: true })
  error_message: string;

  @Column({ type: 'jsonb', nullable: true })
  error_details: Record<string, any>;

  // Relationships
  @ManyToOne(() => Business, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'business_id' })
  business: Business;
}
