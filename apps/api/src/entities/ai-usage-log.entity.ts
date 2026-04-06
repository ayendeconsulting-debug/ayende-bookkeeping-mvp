import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

export enum AiFeature {
  EXPLAINER = 'explainer',
  ANOMALY = 'anomaly',
  CLASSIFY = 'classify',
  YEAR_END = 'year_end',
}

@Entity('ai_usage_log')
@Index(['business_id'])
@Index(['business_id', 'used_at']) // for monthly cap queries
export class AiUsageLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // The business that triggered the AI feature
  @Column({ type: 'uuid' })
  business_id: string;

  // Clerk user ID of the user who triggered the feature
  @Column({ type: 'varchar', length: 255 })
  clerk_user_id: string;

  // Which AI feature was used
  @Column({
    type: 'enum',
    enum: AiFeature,
    enumName: 'ai_feature',
  })
  feature: AiFeature;

  // Approximate token count — 0 placeholder on insert, updated after Claude responds
  @Column({ type: 'integer', default: 0 })
  tokens_used: number;

  // BullMQ job ID — used to update tokens_used on completion
  @Column({ type: 'varchar', length: 255, nullable: true })
  job_id: string | null;

  @CreateDateColumn({ type: 'timestamp with time zone' })
  used_at: Date;
}
