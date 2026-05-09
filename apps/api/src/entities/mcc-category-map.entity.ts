import {
  Entity,
  PrimaryColumn,
  Column,
} from 'typeorm';

/**
 * Phase 34: Plaid Merchant Category Code -> CoA category map.
 *
 * Static seed table. Populated once via seed script. Not modifiable from
 * tenant context. Used by Smart Match Layer 1 mcc.matcher when Plaid
 * provides an MCC on the raw transaction.
 *
 * MCC is the merchant's payment-network category code (4-digit string).
 * This table is the bridge between Plaid's category vocabulary and Tempo's
 * CoA subtypes.
 */
@Entity('mcc_category_map')
export class MccCategoryMap {
  // 4-digit MCC code. Acts as primary key; one row per MCC.
  @PrimaryColumn({ type: 'varchar', length: 4 })
  mcc: string;

  // Same vocabulary as VendorLibrary.category_hint
  @Column({ type: 'varchar', length: 50 })
  category_hint: string;

  // Target CoA subtype hint
  @Column({ type: 'varchar', length: 50, nullable: true })
  account_subtype: string | null;

  // True if MCC typically indicates personal spending (e.g. grocery stores)
  @Column({ type: 'boolean', default: false })
  default_is_personal: boolean;

  // Human-readable description for admin UI / debugging
  @Column({ type: 'text', nullable: true })
  description: string | null;
}