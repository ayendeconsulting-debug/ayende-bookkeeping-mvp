import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
export type LeadStatus = 'new' | 'contacted' | 'nurturing' | 'converted' | 'lost';
export type LeadType   = 'inbound' | 'cold' | 'partnership';
export type EnrichmentStatus = 'pending' | 'complete' | 'failed' | 'skipped';
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
  @Column({ length: 100, nullable: true })
  title: string;
  @Column({ length: 50, nullable: true })
  phone: string;
  @Column({ length: 100, default: 'manual' })
  source: string;
  @Column({ type: 'enum', enum: ['inbound', 'cold', 'partnership'], default: 'inbound' })
  type: LeadType;
  @Column({ type: 'enum', enum: ['new', 'contacted', 'nurturing', 'converted', 'lost'], default: 'new' })
  status: LeadStatus;
  @Column({ type: 'text', nullable: true })
  notes: string;
  @Column({ length: 100, nullable: true })
  utm_source: string;
  @Column({ length: 100, nullable: true })
  utm_medium: string;
  @Column({ length: 100, nullable: true })
  utm_campaign: string;
  // -- Phase 36: Lead Enrichment Engine -------------------------------------
  @Column({ type: 'int', nullable: true })
  score: number | null;
  @Column({ length: 500, nullable: true })
  score_reason: string | null;
  @Column({ length: 50, nullable: true })
  intent: string | null;
  @Column({ length: 50, nullable: true })
  urgency: string | null;
  @Column({ length: 255, nullable: true })
  recommended_action: string | null;
  @Column({ length: 255, nullable: true })
  enriched_company: string | null;
  @Column({ length: 255, nullable: true })
  enriched_title: string | null;
  @Column({ length: 100, nullable: true })
  enriched_size: string | null;
  @Column({ length: 255, nullable: true })
  enriched_location: string | null;
  @Column({ length: 500, nullable: true })
  enriched_linkedin: string | null;
  @Column({ type: 'timestamptz', nullable: true })
  enriched_at: Date | null;
  @Column({ type: 'enum', enum: ['pending', 'complete', 'failed', 'skipped'], nullable: true })
  enrichment_status: EnrichmentStatus | null;
  @Column({ length: 500, nullable: true })
  enrichment_error: string | null;
  // -- End Phase 36 additions -----------------------------------------------
  @Column({ type: 'timestamptz', nullable: true })
  converted_at: Date | null;
  @Column({ type: 'timestamptz', nullable: true })
  deleted_at: Date | null;
  @CreateDateColumn()
  created_at: Date;
  @UpdateDateColumn()
  updated_at: Date;
}
