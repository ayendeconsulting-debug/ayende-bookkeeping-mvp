import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

export type LeadStatus = 'new' | 'contacted' | 'nurturing' | 'converted' | 'lost';

@Entity('leads')
export class Lead {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 100 })
  first_name: string;

  @Column({ length: 100 })
  last_name: string;

  @Column({ length: 255, unique: true })
  email: string;

  @Column({ length: 255, nullable: true })
  company: string;

  @Column({ length: 50, nullable: true })
  phone: string;

  @Column({ length: 100, default: 'manual' })
  source: string;

  @Column({
    type: 'enum',
    enum: ['new', 'contacted', 'nurturing', 'converted', 'lost'],
    default: 'new',
  })
  status: LeadStatus;

  @Column({ type: 'text', nullable: true })
  notes: string;

  @Column({ length: 100, nullable: true })
  utm_source: string;

  @Column({ length: 100, nullable: true })
  utm_medium: string;

  @Column({ length: 100, nullable: true })
  utm_campaign: string;

  @Column({ type: 'timestamptz', nullable: true })
  converted_at: Date | null;

  @Column({ type: 'timestamptz', nullable: true })
  deleted_at: Date | null;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
