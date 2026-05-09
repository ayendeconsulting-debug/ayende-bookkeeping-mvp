import { Injectable } from '@nestjs/common';
import { RawTransaction } from '../../entities/raw-transaction.entity';
import {
  IMatcher,
  MatchContext,
  MatchResult,
  NO_MATCH,
} from '../interfaces/matcher.interface';

/**
 * Layer 1 - Priority 3: Plaid Merchant Category Code (MCC) mapping.
 *
 * Plaid stores a 4-digit numeric MCC in raw_transaction.plaid_category
 * when the field is a pure 4-digit digit string. This matcher looks it up
 * in mcc_category_map and resolves a tenant CoA account by account_subtype.
 *
 * Confidence: medium
 */
@Injectable()
export class MccMatcher implements IMatcher {
  private static readonly MCC_PATTERN = /^\d{4}$/;

  async match(tx: RawTransaction, ctx: MatchContext): Promise<MatchResult> {
    if (
      !tx.plaid_category ||
      !MccMatcher.MCC_PATTERN.test(tx.plaid_category.trim())
    ) {
      return NO_MATCH;
    }

    const mccRow = ctx.mccMap.get(tx.plaid_category.trim());
    if (!mccRow) return NO_MATCH;

    const account = mccRow.account_subtype
      ? ctx.accounts.find(
          (a) =>
            String(a.account_subtype) === mccRow.account_subtype &&
            a.is_active,
        )
      : null;

    if (!account) return NO_MATCH;

    return {
      matched: true,
      source: 'rule_mcc',
      confidence: 'medium',
      suggested_account_id: account.id,
      suggested_tax_code_id: null,
      suggested_is_personal: mccRow.default_is_personal ?? null,
      reasoning: `Matched Plaid MCC ${tx.plaid_category} (${mccRow.description ?? mccRow.category_hint})`,
    };
  }
}