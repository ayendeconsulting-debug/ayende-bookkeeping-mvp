import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Business } from './business.entity';

@Entity('mileage_logs')
export class MileageLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  business_id: string;

  // Clerk user ID — varchar, not uuid (matches Phase 4 pattern)
  @Column({ type: 'varchar', length: 255 })
  user_id: string;

  @Column({ type: 'date' })
  trip_date: Date;

  @Column({ type: 'varchar', length: 500 })
  start_location: string;

  @Column({ type: 'varchar', length: 500 })
  end_location: string;

  @Column({ type: 'varchar', length: 500 })
  purpose: string;

  @Column({ type: 'decimal', precision: 8, scale: 2 })
  distance_km: number;

  // CRA or IRS standard rate per km at time of entry
  @Column({ type: 'decimal', precision: 6, scale: 4 })
  rate_per_km: number;

  // Computed: distance_km × rate_per_km, stored for reporting
  @Column({ type: 'decimal', precision: 10, scale: 2 })
  deduction_value: number;

  // CA = CRA rate; US = IRS rate
  @Column({ type: 'varchar', length: 2, default: 'CA' })
  country: string;

  @CreateDateColumn({ type: 'timestamp with time zone' })
  created_at: Date;

  // Relationships
  @ManyToOne(() => Business, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'business_id' })
  business: Business;
}
