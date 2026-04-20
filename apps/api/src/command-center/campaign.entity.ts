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

  // -- Phase 25: Per-campaign template variable values ---------------------
  // Stored at create time; injected into every email sent for this campaign.
  // Shape: { contact_name: 'John', organization_name: 'BOF', ... }
  @Column({ type: 'jsonb', nullable: true })
  template_variables: Record<string, string> | null;

  // -- Phase 25: Optional recipient filter ----------------------------------
  // When set, send() restricts the resolved segment to only these emails.
  // Null = send to entire segment.
  @Column({ type: 'jsonb', nullable: true })
  recipient_filter: string[] | null;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
