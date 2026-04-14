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
import { Business } from '../../entities/business.entity';
import { Account } from '../../entities/account.entity';

@Entity('financed_vehicles')
@Index(['business_id'])
export class FinancedVehicle {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  business_id: string;

  @Column({ type: 'varchar', length: 100 })
  name: string;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  purchase_price: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  down_payment: number;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  loan_amount: number;

  @Column({ type: 'decimal', precision: 5, scale: 4, default: 0 })
  interest_rate: number;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  monthly_payment: number;

  @Column({ type: 'date' })
  loan_start_date: Date;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  remaining_balance: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  business_use_pct: number;

  @Column({ type: 'uuid' })
  asset_account_id: string;

  @Column({ type: 'uuid' })
  loan_account_id: string;

  @Column({ type: 'varchar', length: 20, default: 'active' })
  status: string;

  @CreateDateColumn({ type: 'timestamp with time zone' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamp with time zone' })
  updated_at: Date;

  // Relationships
  @ManyToOne(() => Business, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'business_id' })
  business: Business;

  @ManyToOne(() => Account, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'asset_account_id' })
  assetAccount: Account;

  @ManyToOne(() => Account, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'loan_account_id' })
  loanAccount: Account;
}
