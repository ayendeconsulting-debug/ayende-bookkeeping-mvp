import { RawTransaction } from '../../entities/raw-transaction.entity';
import { Account } from '../../entities/account.entity';
import { ClassificationRule } from '../../entities/classification-rule.entity';
import { VendorLibrary } from '../../entities/vendor-library.entity';
import { MccCategoryMap } from '../../entities/mcc-category-map.entity';

export interface MatchResult {
  matched: boolean;
  source: string | null;
  confidence: 'high' | 'medium' | 'low' | null;
  suggested_account_id: string | null;
  suggested_tax_code_id: string | null;
  suggested_is_personal: boolean | null;
  reasoning: string | null;
}

/**
 * Shared context built once per Smart Match batch.
 * Passed to every matcher so each call avoids redundant DB hits.
 */
export interface MatchContext {
  businessId: string;
  accounts: Account[];
  /** All active classification rules for this business (manual + user_learned). */
  classificationRules: ClassificationRule[];
  /** Pre-seeded vendor library (global, not per-tenant). Sorted by match_priority ASC. */
  vendorLibrary: VendorLibrary[];
  /** MCC code -> MccCategoryMap row. */
  mccMap: Map<string, MccCategoryMap>;
}

/** Sentinel returned when a matcher finds no match. */
export const NO_MATCH: MatchResult = {
  matched: false,
  source: null,
  confidence: null,
  suggested_account_id: null,
  suggested_tax_code_id: null,
  suggested_is_personal: null,
  reasoning: null,
};

export interface IMatcher {
  match(tx: RawTransaction, ctx: MatchContext): Promise<MatchResult>;
}