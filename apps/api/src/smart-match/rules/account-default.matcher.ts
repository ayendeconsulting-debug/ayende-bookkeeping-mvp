import { Injectable } from '@nestjs/common';
import { RawTransaction } from '../../entities/raw-transaction.entity';
import {
  IMatcher,
  MatchContext,
  MatchResult,
  NO_MATCH,
} from '../interfaces/matcher.interface';

/**
 * Layer 1 - Priority 6 (lowest): Account-type default.
 *
 * Sets suggested_is_personal ONLY — never resolves a category account.
 * Always returns confidence='low', so the transaction always proceeds to
 * Layer 2 (AI fallback). The is_personal hint is written to raw_transactions
 * so the AI prompt has it as context.
 *
 * Logic:
 *   source_account_type contains 'credit' -> suggested_is_personal = true
 *   All other types -> NO_MATCH (we do not guess for bank/depository/loan).
 */
@Injectable()
export class AccountDefaultMatcher implements IMatcher {
  async match(tx: RawTransaction, _ctx: MatchContext): Promise<MatchResult> {
    if (!tx.source_account_type) return NO_MATCH;

    if (tx.source_account_type.toLowerCase().includes('credit')) {
      return {
        matched: true,
        source: 'rule_account_default',
        confidence: 'low',
        suggested_account_id: null,
        suggested_tax_code_id: null,
        suggested_is_personal: true,
        reasoning: `Credit account source — personal flag pre-set for AI review`,
      };
    }

    return NO_MATCH;
  }
}