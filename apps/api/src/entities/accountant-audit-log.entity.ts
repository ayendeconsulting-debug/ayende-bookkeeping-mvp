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
import { Business } from './business.entity';

@Entity('accountant_audit_log')
@Index(['business_id'])
@Index(['firm_id'])
@Index(['business_id', 'performed_at']) // for date range filtering
export class AccountantAuditLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // The client business that was modified
  @Column({ type: 'uuid' })
  business_id: string;

  // The firm whose staff member performed the action
  @Column({ type: 'uuid' })
  firm_id: string;

  // Clerk user ID of the accountant who performed the action
  @Column({ type: 'varchar', length: 255 })
  actor_clerk_id: string;

  // Display name of the accountant at the time of the action
  @Column({ type: 'varchar', length: 255 })
  actor_name: string;

  // Action performed — e.g. classify_transaction, edit_journal_entry
  @Column({ type: 'varchar', length: 100 })
  action: string;

  // Type of entity modified — e.g. transaction, journal_entry, classification
  @Column({ type: 'varchar', length: 100 })
  entity_type: string;

  // ID of the specific record modified
  @Column({ type: 'uuid' })
  entity_id: string;

  // State of the record before the change (null for create actions)
  @Column({ type: 'jsonb', nullable: true })
  before_snapshot: Record<string, unknown> | null;

  // State of the record after the change (null for delete actions)
  @Column({ type: 'jsonb', nullable: true })
  after_snapshot: Record<string, unknown> | null;

  @CreateDateColumn({ type: 'timestamp with time zone' })
  performed_at: Date;

  // Relationships — used for joins when building audit views
  @ManyToOne(() => AccountantFirm, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'firm_id' })
  firm: AccountantFirm;

  @ManyToOne(() => Business, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'business_id' })
  business: Business;
}
