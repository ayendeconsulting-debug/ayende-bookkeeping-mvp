import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { Business } from './business.entity';
import { PlaidAccount } from './plaid-account.entity';
import { PlaidSyncCursor } from './plaid-sync-cursor.entity';

export enum PlaidItemStatus {
  ACTIVE = 'active',
  PENDING_EXPIRATION = 'pending_expiration',
  ERROR = 'error',
  REVOKED = 'revoked',
}

@Entity('plaid_items')
export class PlaidItem {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  business_id: string;

  @ManyToOne(() => Business)
  @JoinColumn({ name: 'business_id' })
  business: Business;

  // Plaid-assigned identifier for this Item
  @Column({ type: 'varchar', length: 255, unique: true })
  item_id: string;

  // access_token is stored AES-256 encrypted — never store plaintext
  @Column({ type: 'text' })
  access_token_encrypted: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  institution_id: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  institution_name: string;

  @Column({
    type: 'enum',
    enum: PlaidItemStatus,
    default: PlaidItemStatus.ACTIVE,
  })
  status: PlaidItemStatus;

  // Error code from Plaid if item enters error state
  @Column({ type: 'varchar', length: 100, nullable: true })
  error_code: string;

  @Column({ type: 'text', nullable: true })
  error_message: string;

  @Column({ type: 'boolean', default: false })
  is_deleted: boolean;

  @Column({ type: 'timestamp', nullable: true })
  deleted_at: Date;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  @OneToMany(() => PlaidAccount, (account) => account.plaid_item)
  accounts: PlaidAccount[];

  @OneToMany(() => PlaidSyncCursor, (cursor) => cursor.plaid_item)
  sync_cursors: PlaidSyncCursor[];
}
