import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Business } from './business.entity';

@Entity('budget_categories')
export class BudgetCategory {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  business_id: string;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  // null = tracking only (no budget cap enforced)
  @Column({ type: 'decimal', precision: 12, scale: 2, nullable: true })
  monthly_target: number | null;

  // Hex color for UI display (e.g. '#0F6E56')
  @Column({ type: 'varchar', length: 7, default: '#6B7280' })
  color: string;

  // Icon identifier for UI (e.g. 'home', 'car', 'coffee')
  @Column({ type: 'varchar', length: 50, nullable: true })
  icon: string | null;

  // true = seeded by system on mode provisioning; false = user-created
  @Column({ type: 'boolean', default: false })
  is_system: boolean;

  @Column({ type: 'boolean', default: true })
  is_active: boolean;

  @Column({ type: 'integer', default: 0 })
  sort_order: number;

  @CreateDateColumn({ type: 'timestamp with time zone' })
  created_at: Date;

  // Relationships
  @ManyToOne(() => Business, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'business_id' })
  business: Business;
}
