import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { PlaidItem } from './plaid-item.entity';

@Entity('plaid_sync_cursors')
export class PlaidSyncCursor {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', unique: true })
  plaid_item_id: string;

  @ManyToOne(() => PlaidItem, (item) => item.sync_cursors)
  @JoinColumn({ name: 'plaid_item_id' })
  plaid_item: PlaidItem;

  // Plaid cursor string for /transactions/sync incremental fetching
  // NULL means this item has never been synced — do a full initial sync
  @Column({ type: 'text', nullable: true })
  cursor: string;

  @Column({ type: 'timestamp', nullable: true })
  last_synced_at: Date;

  // Count of transactions added in last sync
  @Column({ type: 'int', default: 0 })
  last_sync_added: number;

  // Count of transactions modified in last sync
  @Column({ type: 'int', default: 0 })
  last_sync_modified: number;

  // Count of transactions removed in last sync
  @Column({ type: 'int', default: 0 })
  last_sync_removed: number;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
