import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Business } from './business.entity';
import { RawTransaction } from './raw-transaction.entity';
import { Account } from './account.entity';
import { TaxCode } from './tax-code.entity';

@Entity('transaction_splits')
export class TransactionSplit {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  business_id: string;

  @Column({ type: 'uuid' })
  raw_transaction_id: string;

  @Column({ type: 'integer' })
  split_number: number;

  @Column({ type: 'numeric', precision: 15, scale: 2 })
  amount: number;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'uuid' })
  account_id: string;

  @Column({ type: 'uuid', nullable: true })
  tax_code_id: string;

  @CreateDateColumn({ type: 'timestamp with time zone' })
  created_at: Date;

  // Relationships
  @ManyToOne(() => Business, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'business_id' })
  business: Business;

  @ManyToOne(() => RawTransaction, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'raw_transaction_id' })
  rawTransaction: RawTransaction;

  @ManyToOne(() => Account, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'account_id' })
  account: Account;

  @ManyToOne(() => TaxCode, { nullable: true, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'tax_code_id' })
  taxCode: TaxCode;
}
