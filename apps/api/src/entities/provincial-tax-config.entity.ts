import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

@Entity('provincial_tax_configs')
@Index(['province_code', 'effective_date'], { unique: true })
export class ProvincialTaxConfig {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // ISO 3166-2 CA province code: ON, BC, AB, QC, NS, NB, PE, NL, MB, SK, NT, NU, YT
  @Column({ type: 'varchar', length: 2 })
  province_code: string;

  @Column({ type: 'varchar', length: 100 })
  province_name: string;

  // Combined HST rate for HST provinces (e.g. 0.13 for Ontario). NULL for GST-only provinces.
  @Column({ type: 'numeric', precision: 5, scale: 4, nullable: true })
  hst_rate: number | null;

  // Federal GST rate — always 0.05 for all provinces
  @Column({ type: 'numeric', precision: 5, scale: 4 })
  gst_rate: number;

  // Provincial portion for non-HST provinces. NULL for HST provinces. Reserved — Phase 9b.
  @Column({ type: 'numeric', precision: 5, scale: 4, nullable: true })
  pst_rate: number | null;

  // true if province uses harmonised HST (ON, NB, NS, PE, NL)
  @Column({ type: 'boolean' })
  is_hst_province: boolean;

  // Date this rate became effective — supports future rate changes
  @Column({ type: 'date' })
  effective_date: string;

  @CreateDateColumn({ type: 'timestamp with time zone' })
  created_at: Date;
}
