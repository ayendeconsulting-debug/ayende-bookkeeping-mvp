import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { EmailTemplate } from './email-template.entity';

export type CampaignStatus = 'draft' | 'scheduled' | 'sending' | 'sent' | 'cancelled';

@Entity('email_campaigns')
export class Campaign {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 255 })
  name: string;

  @Column({ type: 'uuid' })
  template_id: string;

  @ManyToOne(() => EmailTemplate, { eager: false })
  @JoinColumn({ name: 'template_id' })
  template: EmailTemplate;

  @Column({ length: 100 })
  segment_key: string;

  @Column({
    type: 'enum',
    enum: ['draft', 'scheduled', 'sending', 'sent', 'cancelled'],
    default: 'draft',
  })
  status: CampaignStatus;

  @Column({ type: 'timestamptz', nullable: true })
  scheduled_at: Date | null;

  @Column({ type: 'timestamptz', nullable: true })
  sent_at: Date | null;

  @Column({ default: 0 })
  recipient_count: number;

  @Column({ length: 255, nullable: true })
  created_by: string;

  // -- Phase 25: Campaign-level fallback variable values --------------------
  // Used for non-lead-based campaigns (generic variable step).
  @Column({ type: 'jsonb', nullable: true })
  template_variables: Record<string, string> | null;

  // -- Phase 25: Per-recipient variable values (lead-based campaigns) -------
  // Keyed by recipient email. Each email gets its own personalised variable
  // set derived from the lead record at campaign creation time.
  // Shape: { "john@bof.ca": { contact_name: "John Smith", organization_name: "BOF" } }
  @Column({ type: 'jsonb', nullable: true })
  recipient_variables: Record<string, Record<string, string>> | null;

  // -- Phase 25: Optional recipient allowlist -------------------------------
  // When set, send() restricts the resolved segment to only these emails.
  @Column({ type: 'jsonb', nullable: true })
  recipient_filter: string[] | null;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
