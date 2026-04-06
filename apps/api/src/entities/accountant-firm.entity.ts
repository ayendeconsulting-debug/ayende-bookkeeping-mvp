import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  Index,
} from 'typeorm';
import { FirmClient } from './firm-client.entity';
import { FirmStaff } from './firm-staff.entity';

@Entity('accountant_firms')
export class AccountantFirm {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // Firm display name — shown in white-label UI and emails
  @Column({ type: 'varchar', length: 255 })
  name: string;

  // Subdomain slug — e.g. "smithco" resolves to smithco.gettempo.ca
  @Column({ type: 'varchar', length: 100, unique: true })
  @Index()
  subdomain: string;

  // Uploaded firm logo URL (Railway volume or S3)
  @Column({ type: 'varchar', length: 500, nullable: true })
  logo_url: string | null;

  // Hex brand colour e.g. #2C4A8C — injected as CSS var on subdomain
  @Column({ type: 'varchar', length: 7, nullable: true })
  brand_colour: string | null;

  // Clerk user ID of the firm owner (firm_owner role in firm_staff)
  @Column({ type: 'varchar', length: 255 })
  owner_clerk_id: string;

  // Stripe customer ID for metered billing
  @Column({ type: 'varchar', length: 255, nullable: true })
  stripe_customer_id: string | null;

  @CreateDateColumn({ type: 'timestamp with time zone' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamp with time zone' })
  updated_at: Date;

  // Relationships
  @OneToMany(() => FirmClient, (fc) => fc.firm)
  firmClients: FirmClient[];

  @OneToMany(() => FirmStaff, (fs) => fs.firm)
  firmStaff: FirmStaff[];
}
