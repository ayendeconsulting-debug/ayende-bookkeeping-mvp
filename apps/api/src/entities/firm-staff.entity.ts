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

export enum FirmStaffRole {
  FIRM_OWNER = 'firm_owner',
  STAFF = 'staff',
}

@Entity('firm_staff')
@Index(['firm_id'])
// One user may belong to at most one firm
@Unique(['clerk_user_id'])
export class FirmStaff {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  firm_id: string;

  // Clerk user ID of the staff member
  @Column({ type: 'varchar', length: 255 })
  clerk_user_id: string;

  @Column({
    type: 'enum',
    enum: FirmStaffRole,
    enumName: 'firm_staff_role',
    default: FirmStaffRole.STAFF,
  })
  role: FirmStaffRole;

  // Email stored at invite time — used before Clerk account is created
  @Column({ type: 'varchar', length: 255, nullable: true })
  invited_email: string | null;

  @CreateDateColumn({ type: 'timestamp with time zone' })
  invited_at: Date;

  // Set on first login post-invite — null means invite not yet accepted
  @Column({ type: 'timestamp with time zone', nullable: true })
  accepted_at: Date | null;

  // Relationship
  @ManyToOne(() => AccountantFirm, (firm) => firm.firmStaff, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'firm_id' })
  firm: AccountantFirm;
}
