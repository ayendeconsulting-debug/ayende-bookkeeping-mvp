import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
  Unique,
} from 'typeorm';

export type LegalDocumentType =
  | 'terms_of_service'
  | 'terms_of_use'
  | 'privacy_policy'
  | 'cookie_policy';

export type AcceptanceSource = 'signup' | 'onboarding' | 're_acceptance';

@Entity('user_agreements')
@Unique(['user_id', 'document_type', 'document_version'])
export class UserAgreement {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ type: 'varchar', length: 255 })
  user_id: string; // Clerk user ID (auth_provider_id)

  @Index()
  @Column({
    type: 'enum',
    enum: ['terms_of_service', 'terms_of_use', 'privacy_policy', 'cookie_policy'],
  })
  document_type: LegalDocumentType;

  @Column({ type: 'varchar', length: 20 })
  document_version: string; // e.g. "1.0.0"

  @Column({
    type: 'enum',
    enum: ['signup', 'onboarding', 're_acceptance'],
  })
  acceptance_source: AcceptanceSource;

  @CreateDateColumn({ type: 'timestamp with time zone' })
  accepted_at: Date;

  @CreateDateColumn({ type: 'timestamp with time zone' })
  created_at: Date;
}
