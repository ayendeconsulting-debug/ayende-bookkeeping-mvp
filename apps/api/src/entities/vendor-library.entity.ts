import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

/**
 * Phase 34: Pre-seeded vendor library for Smart Match Layer 1.
 *
 * Read-only after seed; NOT per-tenant. Updates ship via seed script
 * (apps/api/src/admin/seed-data/vendor-library-ca.ts).
 *
 * Layer 1's vendor-library matcher does normalized lowercase comparison of
 * raw_transaction.description against vendor_pattern. First match (sorted by
 * match_priority ASC) wins.
 */
@Entity('vendor_library')
@Index(['vendor_pattern'])
@Index(['match_priority'])
export class VendorLibrary {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // Normalized substring or regex pattern that matches the merchant string.
  // Stored lowercase; matcher applies same normalization to the transaction.
  @Column({ type: 'text' })
  vendor_pattern: string;

  // Canonical display name (e.g. "Tim Hortons", "Petro-Canada")
  @Column({ type: 'text' })
  vendor_display: string;

  // Category hint - 'meals' | 'fuel' | 'software' | 'office_supplies' |
  // 'utilities' | 'subscription' | 'travel' | 'lodging' | 'groceries' | etc.
  @Column({ type: 'varchar', length: 50 })
  category_hint: string;

  // Target CoA subtype - matched against accounts.account_subtype during
  // suggestion to find the tenant's matching account.
  @Column({ type: 'varchar', length: 50, nullable: true })
  account_subtype: string | null;

  // True for vendors that are typically personal (e.g. grocery stores when
  // the user is on Personal mode). Layer 1 uses this to pre-set
  // suggested_is_personal on Personal/Pro tier transactions.
  @Column({ type: 'boolean', default: false })
  default_is_personal: boolean;

  // Country scope. Default ['CA']. Future-proofs adding US vendors.
  @Column({ type: 'varchar', length: 2, array: true, default: '{CA}' })
  country_scope: string[];

  // Confidence label written to smart_match_confidence on hit.
  // 'high' | 'medium' | 'low'. Default 'medium' for library entries.
  @Column({ type: 'varchar', length: 10, default: 'medium' })
  confidence: string;

  // Lower = higher priority within the vendor library. Allows demoting
  // ambiguous patterns (e.g. "amazon" - could be groceries, retail, AWS).
  @Column({ type: 'integer', default: 100 })
  match_priority: number;

  @CreateDateColumn({ type: 'timestamp with time zone' })
  created_at: Date;
}