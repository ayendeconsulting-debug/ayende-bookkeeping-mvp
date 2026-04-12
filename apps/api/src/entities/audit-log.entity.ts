import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Business } from './business.entity';

@Entity('audit_logs')
@Index(['business_id', 'entity_type', 'entity_id'])
@Index(['user_id'])
export class AuditLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', nullable: true })
  business_id: string;

  // Clerk user ID — varchar not uuid
  @Column({ type: 'varchar', length: 255 })
  user_id: string;

  @Column({ type: 'varchar', length: 50 })
  action: string;

  @Column({ type: 'varchar', length: 50 })
  entity_type: string;

  // varchar to support both UUIDs and string IDs
  @Column({ type: 'varchar', length: 255 })
  entity_id: string;

  @Column({ type: 'jsonb', nullable: true })
  old_values: Record<string, any> | null;

  @Column({ type: 'jsonb', nullable: true })
  new_values: Record<string, any> | null;

  @Column({ type: 'inet', nullable: true })
  ip_address: string | null;

  @Column({ type: 'text', nullable: true })
  user_agent: string | null;

  @CreateDateColumn({ type: 'timestamp with time zone' })
  created_at: Date;

  @ManyToOne(() => Business, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'business_id' })
  business: Business;
}
