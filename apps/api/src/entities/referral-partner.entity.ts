import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export type ReferralPartnerType = 'bank' | 'accountant' | 'user' | 'community';
export type CommissionType = 'percentage' | 'flat';

@Entity('referral_partners')
export class ReferralPartner {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({
    type: 'enum',
    enum: ['bank', 'accountant', 'user', 'community'],
  })
  type: ReferralPartnerType;

  @Column({ type: 'varchar', length: 255 })
  email: string;

  @Index({ unique: true })
  @Column({ type: 'varchar', length: 50 })
  referral_code: string;

  @Column({
    type: 'enum',
    enum: ['percentage', 'flat'],
    default: 'percentage',
  })
  commission_type: CommissionType;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  commission_value: number;

  @Column({ type: 'boolean', default: true })
  is_active: boolean;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @CreateDateColumn({ type: 'timestamp with time zone' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamp with time zone' })
  updated_at: Date;
}
