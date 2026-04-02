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
import { Account } from './account.entity';

export enum SavingsGoalStatus {
  ACTIVE = 'active',
  PAUSED = 'paused',
  COMPLETED = 'completed',
}

@Entity('savings_goals')
export class SavingsGoal {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  business_id: string;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  target_amount: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  current_amount: number;

  // Optional target completion date — used to calculate required monthly contribution
  @Column({ type: 'date', nullable: true })
  target_date: Date | null;

  // Optional Plaid-connected savings account — deposits auto-tracked against goal
  @Column({ type: 'uuid', nullable: true })
  linked_account_id: string | null;

  @Column({
    type: 'enum',
    enum: SavingsGoalStatus,
    enumName: 'savings_goal_status',
    default: SavingsGoalStatus.ACTIVE,
  })
  status: SavingsGoalStatus;

  @CreateDateColumn({ type: 'timestamp with time zone' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamp with time zone' })
  updated_at: Date;

  // Relationships
  @ManyToOne(() => Business, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'business_id' })
  business: Business;

  @ManyToOne(() => Account, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'linked_account_id' })
  linkedAccount: Account | null;
}
