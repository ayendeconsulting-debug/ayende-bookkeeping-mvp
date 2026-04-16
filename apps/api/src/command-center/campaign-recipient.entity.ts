import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Campaign } from './campaign.entity';

export type RecipientStatus = 'pending' | 'sent' | 'failed';

@Entity('campaign_recipients')
export class CampaignRecipient {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  campaign_id: string;

  @ManyToOne(() => Campaign, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'campaign_id' })
  campaign: Campaign;

  @Column({ length: 255 })
  email: string;

  @Column({ length: 255, nullable: true })
  business_name: string;

  @Column({
    type: 'enum',
    enum: ['pending', 'sent', 'failed'],
    default: 'pending',
  })
  status: RecipientStatus;

  @Column({ type: 'timestamptz', nullable: true })
  sent_at: Date | null;

  @Column({ length: 500, nullable: true })
  error_message: string;
}
