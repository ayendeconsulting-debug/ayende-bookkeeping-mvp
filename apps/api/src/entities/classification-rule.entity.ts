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
import { TaxCode } from './tax-code.entity';

@Entity('classification_rules')
@Index(['business_id', 'priority'])
export class ClassificationRule {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  business_id: string;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  // e.g. 'keyword', 'vendor', 'account'
  @Column({ type: 'varchar', length: 20 })
  match_type: string;

  @Column({ type: 'text' })
  match_value: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  match_pattern: string;

  @Column({ type: 'uuid' })
  target_account_id: string;

  @Column({ type: 'uuid', nullable: true })
  tax_code_id: string;

  // Lower number = higher priority
  @Column({ type: 'integer', default: 100 })
  priority: number;

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
  @JoinColumn({ name: 'target_account_id' })
  targetAccount: Account;

  @ManyToOne(() => TaxCode, { nullable: true, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'tax_code_id' })
  taxCode: TaxCode;
}
