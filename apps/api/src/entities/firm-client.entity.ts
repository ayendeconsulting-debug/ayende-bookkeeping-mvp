import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
  Unique,
} from 'typeorm';
import { AccountantFirm } from './accountant-firm.entity';
import { Business } from './business.entity';

export enum FirmClientStatus {
  ACTIVE = 'active',
  ARCHIVED = 'archived',
}

@Entity('firm_clients')
@Index(['firm_id'])
@Index(['business_id'])
@Unique(['firm_id', 'business_id'])
export class FirmClient {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  firm_id: string;

  @Column({ type: 'uuid' })
  business_id: string;

  @Column({
    type: 'enum',
    enum: FirmClientStatus,
    enumName: 'firm_client_status',
    default: FirmClientStatus.ACTIVE,
  })
  status: FirmClientStatus;

  @CreateDateColumn({ type: 'timestamp with time zone' })
  added_at: Date;

  // Relationships
  @ManyToOne(() => AccountantFirm, (firm) => firm.firmClients, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'firm_id' })
  firm: AccountantFirm;

  @ManyToOne(() => Business, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'business_id' })
  business: Business;
}
