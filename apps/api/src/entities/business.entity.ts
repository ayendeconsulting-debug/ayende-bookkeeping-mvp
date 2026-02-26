import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { BusinessUser } from './business-user.entity';
import { Account } from './account.entity';

@Entity('businesses')
export class Business {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  legal_name: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  tax_id: string;

  @Column({ type: 'varchar', length: 3, default: 'USD' })
  currency_code: string;

  @Column({ type: 'date', default: '2024-12-31' })
  fiscal_year_end: Date;

  @CreateDateColumn({ type: 'timestamp with time zone' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamp with time zone' })
  updated_at: Date;

  @Column({ type: 'timestamp with time zone', nullable: true })
  deleted_at: Date;

  @Column({ type: 'jsonb', default: {} })
  settings: Record<string, any>;

  // Relationships
  @OneToMany(() => BusinessUser, (businessUser) => businessUser.business)
  businessUsers: BusinessUser[];

  @OneToMany(() => Account, (account) => account.business)
  accounts: Account[];
}
