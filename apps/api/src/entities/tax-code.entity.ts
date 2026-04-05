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
import { Account } from './account.entity';

export enum TaxType {
  INPUT = 'input',
  OUTPUT = 'output',
}

export enum TaxCategory {
  HST = 'hst',
  GST = 'gst',
  HST_ZERO_RATED = 'hst_zero_rated',
  HST_EXEMPT = 'hst_exempt',
  INPUT_TAX_CREDIT = 'input_tax_credit',
}

@Entity('tax_codes')
@Index(['business_id', 'code'], { unique: true })
export class TaxCode {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  business_id: string;

  @Column({ type: 'varchar', length: 20 })
  code: string;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({
    type: 'enum',
    enum: TaxType,
    enumName: 'tax_type',
  })
  tax_type: TaxType;

  // Stored as decimal, e.g. 0.13 = 13%
  @Column({ type: 'numeric', precision: 8, scale: 6 })
  rate: number;

  // Must reference an account with subtype = tax_payable
  @Column({ type: 'uuid' })
  tax_account_id: string;

  @Column({ type: 'boolean', default: true })
  is_active: boolean;

  // ── Phase 9: ITC fields ───────────────────────────────────────────────────

  // Whether input tax on this code qualifies as an ITC
  @Column({ type: 'boolean', default: true, nullable: true })
  itc_eligible: boolean;

  // ITC recovery rate: 1.0 = 100% recoverable, 0.5 = 50% (meals), 0.0 = non-recoverable
  @Column({ type: 'numeric', precision: 5, scale: 4, default: 1.0, nullable: true })
  itc_rate: number;

  // Province this tax code applies to — NULL means applies to all provinces
  @Column({ type: 'varchar', length: 2, nullable: true })
  province_code: string | null;

  // Semantic category used by ITC engine
  @Column({
    type: 'enum',
    enum: TaxCategory,
    enumName: 'tax_category',
    nullable: true,
  })
  tax_category: TaxCategory | null;

  @CreateDateColumn({ type: 'timestamp with time zone' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamp with time zone' })
  updated_at: Date;

  // Relationships
  @ManyToOne(() => Business, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'business_id' })
  business: Business;

  @ManyToOne(() => Account, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'tax_account_id' })
  taxAccount: Account;
}
