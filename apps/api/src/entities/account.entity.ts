import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  OneToMany,
  Index,
} from 'typeorm';
import { Business } from './business.entity';
import { JournalLine } from './journal-line.entity';

export enum AccountType {
  ASSET = 'asset',
  LIABILITY = 'liability',
  EQUITY = 'equity',
  REVENUE = 'revenue',
  EXPENSE = 'expense',
}

export enum AccountSubtype {
  BANK = 'bank',
  CREDIT_CARD = 'credit_card',
  ACCOUNTS_RECEIVABLE = 'accounts_receivable',
  ACCOUNTS_PAYABLE = 'accounts_payable',
  FIXED_ASSET = 'fixed_asset',
  OWNER_CONTRIBUTION = 'owner_contribution',
  OWNER_DRAW = 'owner_draw',
  RETAINED_EARNINGS = 'retained_earnings',
  TAX_PAYABLE = 'tax_payable',
  COST_OF_GOODS_SOLD = 'cost_of_goods_sold',
  OPERATING_EXPENSE = 'operating_expense',
  OTHER_INCOME = 'other_income',
  OTHER_EXPENSE = 'other_expense',
  GENERAL = 'general',
}

@Entity('accounts')
@Index(['business_id', 'code'], { unique: true })
export class Account {
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
    enum: AccountType,
  })
  account_type: AccountType;

  @Column({
    type: 'enum',
    enum: AccountSubtype,
    default: AccountSubtype.GENERAL,
  })
  account_subtype: AccountSubtype;

  @Column({ type: 'uuid', nullable: true })
  parent_account_id: string;

  @Column({ type: 'boolean', default: true })
  is_active: boolean;

  @Column({ type: 'boolean', default: false })
  is_system: boolean;

  @CreateDateColumn({ type: 'timestamp with time zone' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamp with time zone' })
  updated_at: Date;

  // Relationships
  @ManyToOne(() => Business, (business) => business.accounts, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'business_id' })
  business: Business;

  @ManyToOne(() => Account, (account) => account.childAccounts, {
    onDelete: 'RESTRICT',
    nullable: true,
  })
  @JoinColumn({ name: 'parent_account_id' })
  parentAccount: Account;

  @OneToMany(() => Account, (account) => account.parentAccount)
  childAccounts: Account[];

  @OneToMany(() => JournalLine, (journalLine) => journalLine.account)
  journalLines: JournalLine[];
}
