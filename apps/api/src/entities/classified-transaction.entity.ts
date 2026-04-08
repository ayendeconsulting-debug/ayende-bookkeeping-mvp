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
import { RawTransaction } from './raw-transaction.entity';
import { Account } from './account.entity';
import { TaxCode } from './tax-code.entity';
import { JournalEntry } from './journal-entry.entity';

export enum ClassificationMethod {
  AUTO = 'auto',
  MANUAL = 'manual',
  SPLIT = 'split',
}

@Entity('classified_transactions')
@Index(['business_id', 'raw_transaction_id'])
export class ClassifiedTransaction {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  business_id: string;

  @Column({ type: 'uuid' })
  raw_transaction_id: string;

  @Column({
    type: 'enum',
    enum: ClassificationMethod,
    enumName: 'classification_method',
  })
  classification_method: ClassificationMethod;

  @Column({ type: 'uuid', nullable: true })
  applied_rule_id: string;

  @Column({ type: 'uuid' })
  account_id: string;

  @Column({ type: 'uuid', nullable: true })
  tax_code_id: string;

  @Column({ type: 'numeric', precision: 15, scale: 2, nullable: true })
  override_amount: number;

  // varchar — stores Clerk user IDs (user_xxx) or 'system' for auto-classification
  @Column({ type: 'varchar', length: 255 })
  classified_by: string;

  @Column({ type: 'boolean', default: false })
  is_posted: boolean;

  @Column({ type: 'uuid', nullable: true })
  posted_journal_entry_id: string;

  @CreateDateColumn({ type: 'timestamp with time zone' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamp with time zone' })
  updated_at: Date;

  // Relationships
  @ManyToOne(() => Business, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'business_id' })
  business: Business;

  @ManyToOne(() => RawTransaction, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'raw_transaction_id' })
  rawTransaction: RawTransaction;

  @ManyToOne(() => Account, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'account_id' })
  account: Account;

  @ManyToOne(() => TaxCode, { nullable: true, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'tax_code_id' })
  taxCode: TaxCode;

  @ManyToOne(() => JournalEntry, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'posted_journal_entry_id' })
  postedJournalEntry: JournalEntry;
}
