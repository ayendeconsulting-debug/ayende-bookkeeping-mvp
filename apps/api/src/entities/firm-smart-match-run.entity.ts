import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { AccountantFirm } from './accountant-firm.entity';

export enum FirmSmartMatchRunStatus {
  RUNNING = 'running',
  COMPLETE = 'complete',
  FAILED = 'failed',
}

/**
 * Phase 34: Firm-wide Smart Match run tracking.
 *
 * Created when an accountant clicks "Run Smart Match for all clients" in the
 * Accountant Portal. One row per firm-wide trigger; tracks fan-out progress
 * across all active client businesses under the firm.
 *
 * The actual smart-match-batch jobs are enqueued per client and run
 * independently. This entity is purely for accountant-facing progress UI
 * and audit/support purposes.
 */
@Entity('firm_smart_match_runs')
@Index(['firm_id', 'started_at'])
export class FirmSmartMatchRun {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  firm_id: string;

  // Clerk user ID of the accountant who triggered the run
  @Column({ type: 'varchar', length: 255 })
  initiated_by_user_id: string;

  @Column({ type: 'integer' })
  client_count: number;

  @Column({ type: 'integer', default: 0 })
  clients_complete: number;

  @Column({
    type: 'enum',
    enum: FirmSmartMatchRunStatus,
    enumName: 'firm_smart_match_run_status',
    default: FirmSmartMatchRunStatus.RUNNING,
  })
  status: FirmSmartMatchRunStatus;

  @CreateDateColumn({ type: 'timestamp with time zone' })
  started_at: Date;

  @Column({ type: 'timestamp with time zone', nullable: true })
  completed_at: Date | null;

  // Relationship - cascade delete with firm (firm closure removes run history)
  @ManyToOne(() => AccountantFirm, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'firm_id' })
  firm: AccountantFirm;
}