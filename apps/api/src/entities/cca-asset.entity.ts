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

export const CCA_CLASSES: Record<string, { label: string; rate: number; description: string }> = {
  '10':   { label: 'Class 10',   rate: 0.30,  description: 'Motor vehicles (30% declining balance)' },
  '12':   { label: 'Class 12',   rate: 1.00,  description: 'Software, tools under $500 (100% — 2-year half-year rule)' },
  '14.1': { label: 'Class 14.1', rate: 0.05,  description: 'Goodwill, customer lists, franchises (5% declining balance)' },
  '50':   { label: 'Class 50',   rate: 0.55,  description: 'Computer equipment (55% declining balance)' },
};

@Entity('cca_assets')
@Index(['business_id'])
export class CcaAsset {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  business_id: string;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  // CCA class identifier: '10', '12', '14.1', '50'
  @Column({ type: 'varchar', length: 10 })
  cca_class: string;

  // Rate stored as decimal (e.g. 0.30 for 30%)
  @Column({ type: 'decimal', precision: 5, scale: 4 })
  rate: number;

  @Column({ type: 'decimal', precision: 14, scale: 2 })
  original_cost: number;

  @Column({ type: 'date' })
  acquisition_date: string;

  // Business use percentage (1-100). For rideshare vehicle: e.g. 80
  @Column({ type: 'decimal', precision: 5, scale: 2, default: 100 })
  business_use_percent: number;

  // Optional: override starting UCC (e.g. asset brought in mid-way)
  @Column({ type: 'decimal', precision: 14, scale: 2, nullable: true })
  ucc_opening_balance: number | null;

  // Optional: link to the raw transaction that was the purchase
  @Column({ type: 'uuid', nullable: true })
  linked_transaction_id: string | null;

  @Column({ type: 'boolean', default: true })
  is_active: boolean;

  @CreateDateColumn({ type: 'timestamp with time zone' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamp with time zone' })
  updated_at: Date;

  @ManyToOne(() => Business, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'business_id' })
  business: Business;
}
