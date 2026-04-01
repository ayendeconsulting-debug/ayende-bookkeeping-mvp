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
