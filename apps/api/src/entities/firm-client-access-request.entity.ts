import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { AccountantFirm } from './accountant-firm.entity';
import { Business } from './business.entity';

export enum AccessRequestType {
  READ = 'read',
  EDIT = 'edit',
}

export enum AccessRequestStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  DENIED = 'denied',
  EXPIRED = 'expired',
}

@Entity('firm_client_access_requests')
@Index(['firm_id'])
@Index(['business_id'])
@Index(['status'])
export class FirmClientAccessRequest {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  firm_id: string;

  // The client business this request is for
  @Column({ type: 'uuid' })
  business_id: string;

  // Clerk user ID of the accountant who made the request
  @Column({ type: 'varchar', length: 255 })
  requested_by_clerk_id: string;

  @Column({
    type: 'enum',
    enum: AccessRequestType,
    enumName: 'access_request_type',
    default: AccessRequestType.EDIT,
  })
  access_type: AccessRequestType;

  @Column({
    type: 'enum',
    enum: AccessRequestStatus,
    enumName: 'access_request_status',
    default: AccessRequestStatus.PENDING,
  })
  status: AccessRequestStatus;

  // Reason provided by the accountant — required on submission
  @Column({ type: 'varchar', length: 500, nullable: true })
  access_note: string | null;

  // Set when the client responds (approve or deny)
  @Column({ type: 'timestamp with time zone', nullable: true })
  responded_at: Date | null;

  // Default expiry: responded_at + 90 days — set on approval
  @Column({ type: 'timestamp with time zone', nullable: true })
  expires_at: Date | null;

  // Client-set custom expiry date (overrides default 90-day window)
  @Column({ type: 'timestamp with time zone', nullable: true })
  custom_expires_at: Date | null;

  @CreateDateColumn({ type: 'timestamp with time zone' })
  requested_at: Date;

  // Relationships
  @ManyToOne(() => AccountantFirm, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'firm_id' })
  firm: AccountantFirm;

  @ManyToOne(() => Business, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'business_id' })
  business: Business;
}
