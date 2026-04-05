import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Business } from './business.entity';

export enum HstPeriodStatus {
  OPEN = 'open',
  FILED = 'filed',
  LOCKED = 'locked',
}

export enum HstPeriodFrequency {
  MONTHLY = 'monthly',
  QUARTERLY = 'quarterly',
  ANNUAL = 'annual',
}

@Entity('hst_periods')
@Index(['business_id', 'period_start'])
export class HstPeriod {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  business_id: string;

  // First day of the reporting period
  @Column({ type: 'date' })
  period_start: string;

  // Last day of the reporting period
  @Column({ type: 'date' })
  period_end: string;

  @Column({
    type: 'enum',
    enum: HstPeriodFrequency,
    enumName: 'hst_period_frequency',
  })
  frequency: HstPeriodFrequency;

  @Column({
    type: 'enum',
    enum: HstPeriodStatus,
    enumName: 'hst_period_status',
    default: HstPeriodStatus.OPEN,
  })
  status: HstPeriodStatus;

  // Computed on report generation — total output tax in period (Line 103)
  @Column({ type: 'numeric', precision: 15, scale: 2, nullable: true })
  total_hst_collected: number | null;

  // Computed on report generation — total eligible input tax credits (Line 106)
  @Column({ type: 'numeric', precision: 15, scale: 2, nullable: true })
  total_itc_claimed: number | null;

  // total_hst_collected - total_itc_claimed (Line 109)
  @Column({ type: 'numeric', precision: 15, scale: 2, nullable: true })
  net_tax_owing: number | null;

  // Set when status transitions to filed
  @Column({ type: 'timestamp with time zone', nullable: true })
  filed_at: Date | null;

  // Clerk user ID who filed the period
  @Column({ type: 'varchar', length: 255, nullable: true })
  filed_by: string | null;

  // Set when status transitions to locked
  @Column({ type: 'timestamp with time zone', nullable: true })
  locked_at: Date | null;

  @CreateDateColumn({ type: 'timestamp with time zone' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamp with time zone' })
  updated_at: Date;

  // Relationships
  @ManyToOne(() => Business, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'business_id' })
  business: Business;
}
