import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { BusinessUser } from './business-user.entity';
import { Account } from './account.entity';

export enum BusinessMode {
  BUSINESS = 'business',
  FREELANCER = 'freelancer',
  PERSONAL = 'personal',
}

export enum HstReportingFrequency {
  MONTHLY = 'monthly',
  QUARTERLY = 'quarterly',
  ANNUAL = 'annual',
}

@Entity('businesses')
export class Business {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  legal_name: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  tax_id: string;

  @Column({ type: 'varchar', length: 3, default: 'USD' })
  currency_code: string;

  @Column({ type: 'date', default: '2024-12-31' })
  fiscal_year_end: Date;

  // Clerk Organization ID -- links Clerk org to this business record
  @Column({ name: 'clerk_org_id', type: 'varchar', length: 255, nullable: true, unique: true })
  clerk_org_id: string | null;

  // Phase 5: Platform mode -- determines UI experience and available features
  @Column({
    type: 'enum',
    enum: BusinessMode,
    enumName: 'business_mode',
    default: BusinessMode.BUSINESS,
  })
  mode: BusinessMode;

  // Phase 5: Country code -- drives tax rate calculations and mileage rates (CA or US)
  @Column({ type: 'varchar', length: 2, default: 'CA' })
  country: string;

  @CreateDateColumn({ type: 'timestamp with time zone' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamp with time zone' })
  updated_at: Date;

  @Column({ type: 'timestamp with time zone', nullable: true })
  deleted_at: Date;

  @Column({ type: 'jsonb', default: {} })
  settings: Record<string, any>;

  // -- Phase 9: Canadian Tax Settings --------------------------------------

  // Province/territory where the business operates (ISO 3166-2 CA code: ON, BC, AB, etc.)
  @Column({ type: 'varchar', length: 2, nullable: true })
  province_code: string | null;

  // CRA-issued HST/GST registration number (9-digit BN + RT0001)
  @Column({ type: 'varchar', length: 20, nullable: true })
  hst_registration_number: string | null;

  // HST/GST reporting frequency -- determines default period length
  @Column({
    type: 'enum',
    enum: HstReportingFrequency,
    enumName: 'hst_reporting_frequency',
    default: HstReportingFrequency.QUARTERLY,
    nullable: true,
  })
  hst_reporting_frequency: HstReportingFrequency | null;

  // -- Phase 10: Accountant Portal -----------------------------------------

  // Soft reference to the accountant firm that created this business.
  // Null for self-onboarded businesses. Used by metered billing job to
  // count active client businesses per firm.
  @Column({ type: 'uuid', nullable: true })
  created_by_firm_id: string | null;

  // -- Phase 12: Business Recurring Detection ------------------------------

  // Stores confirmed and dismissed detection keys so the detection panel
  // does not re-surface patterns the user has already acted on.
  // Shape: { confirmed: string[], dismissed: string[] }
  @Column({ type: 'jsonb', nullable: true })
  recurring_detection_settings: { confirmed: string[]; dismissed: string[] } | null;

  // -- Phase 20: Mobile Push Notifications ---------------------------------

  // Expo push token for the mobile app. Upserted on every app launch after
  // the user grants notification permission. Null when permission is denied
  // or the user has never signed in from the mobile app.
  @Column({ type: 'varchar', length: 255, nullable: true })
  expo_push_token: string | null;

  // Relationships
  @OneToMany(() => BusinessUser, (businessUser) => businessUser.business)
  businessUsers: BusinessUser[];

  @OneToMany(() => Account, (account) => account.business)
  accounts: Account[];
}
