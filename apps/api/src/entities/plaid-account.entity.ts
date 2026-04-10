import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Business } from './business.entity';
import { PlaidItem } from './plaid-item.entity';

export enum PlaidAccountType {
  DEPOSITORY = 'depository',
  CREDIT = 'credit',
  LOAN = 'loan',
  INVESTMENT = 'investment',
  OTHER = 'other',
}

export enum PlaidAccountSubtype {
  CHECKING = 'checking',
  SAVINGS = 'savings',
  CREDIT_CARD = 'credit card',
  MONEY_MARKET = 'money market',
  PAYPAL = 'paypal',
  OTHER = 'other',
}

@Entity('plaid_accounts')
export class PlaidAccount {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  plaid_item_id: string;

  @ManyToOne(() => PlaidItem, (item) => item.accounts)
  @JoinColumn({ name: 'plaid_item_id' })
  plaid_item: PlaidItem;

  @Column({ type: 'uuid' })
  business_id: string;

  @ManyToOne(() => Business)
  @JoinColumn({ name: 'business_id' })
  business: Business;

  @Column({ type: 'varchar', length: 255, unique: true })
  account_id: string;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  official_name: string;

  @Column({
    type: 'enum',
    enum: PlaidAccountType,
    nullable: true,
  })
  type: PlaidAccountType;

  @Column({ type: 'varchar', length: 100, nullable: true })
  subtype: string;

  @Column({ type: 'varchar', length: 10, nullable: true })
  mask: string;

  @Column({ type: 'varchar', length: 3, default: 'USD' })
  iso_currency_code: string;

  // ── Balances ─────────────────────────────────────────────────────────────
  @Column({ type: 'decimal', precision: 18, scale: 2, nullable: true })
  current_balance: number | null;

  @Column({ type: 'decimal', precision: 18, scale: 2, nullable: true })
  available_balance: number | null;

  @Column({ type: 'boolean', default: true })
  is_active: boolean;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
