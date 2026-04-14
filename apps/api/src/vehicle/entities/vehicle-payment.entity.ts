import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Business } from '../../entities/business.entity';
import { FinancedVehicle } from './financed-vehicle.entity';

@Entity('vehicle_payments')
@Index(['business_id'])
@Index(['vehicle_id'])
export class VehiclePayment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  vehicle_id: string;

  @Column({ type: 'uuid' })
  business_id: string;

  @Column({ type: 'date' })
  payment_date: Date;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  total_payment: number;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  principal_amount: number;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  interest_amount: number;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  balance_after: number;

  @Column({ type: 'uuid', nullable: true })
  journal_entry_id: string | null;

  @CreateDateColumn({ type: 'timestamp with time zone' })
  created_at: Date;

  // Relationships
  @ManyToOne(() => Business, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'business_id' })
  business: Business;

  @ManyToOne(() => FinancedVehicle, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'vehicle_id' })
  vehicle: FinancedVehicle;
}
