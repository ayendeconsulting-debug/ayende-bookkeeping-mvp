import { Injectable } from '@nestjs/common';
import { RawTransaction } from '../../entities/raw-transaction.entity';
import { ClassificationRule } from '../../entities/classification-rule.entity';
import {
  IMatcher,
  MatchContext,
  MatchResult,
  NO_MATCH,
} from '../interfaces/matcher.interface';

/**
 * Layer 1 - Priority 1: Tenant-learned vendor map.
 *
 * Matches against ClassificationRule rows with source='user_learned'.
 * These are rules auto-created when the user corrects a Smart Match suggestion
 * (Phase 34f override flow). Highest-priority engine — user corrections win.
 *
 * Confidence: high
 */
@Injectable()
export class LearnedRuleMatcher implements IMatcher {
  async match(tx: RawTransaction, ctx: MatchContext): Promise<MatchResult> {
    const rules = ctx.classificationRules
      .filter((r) => r.source === 'user_learned' && r.is_active)
      .sort((a, b) => a.priority - b.priority);

    for (const rule of rules) {
      if (this.ruleMatches(rule, tx)) {
        return {
          matched: true,
          source: 'rule_learned',
          confidence: 'high',
          suggested_account_id: rule.target_account_id,
          suggested_tax_code_id: rule.tax_code_id ?? null,
          suggested_is_personal: null,
          reasoning: `Matched user-learned rule: "${rule.name}"`,
        };
      }
    }
    return NO_MATCH;
  }

  private ruleMatches(rule: ClassificationRule, tx: RawTransaction): boolean {
    switch (rule.match_type) {
      case 'keyword':
        return tx.description.toLowerCase().includes(rule.match_value.toLowerCase());
      case 'vendor':
        return (
          tx.description.toLowerCase().trim() ===
          rule.match_value.toLowerCase().trim()
        );
      case 'account':
        return tx.plaid_account_id === rule.match_value;
      default:
        return false;
    }
  }
}