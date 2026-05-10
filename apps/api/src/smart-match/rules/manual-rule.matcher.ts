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
 * Layer 1 - Priority 2: Per-tenant manual rules.
 *
 * Matches against ClassificationRule rows with source='manual'.
 * These are rules created explicitly by the user via Settings > Classification Rules.
 *
 * Confidence: high
 */
@Injectable()
export class ManualRuleMatcher implements IMatcher {
  async match(tx: RawTransaction, ctx: MatchContext): Promise<MatchResult> {
    const rules = ctx.classificationRules
      .filter((r) => r.source === 'manual' && r.is_active)
      .sort((a, b) => a.priority - b.priority);

    for (const rule of rules) {
      if (this.ruleMatches(rule, tx)) {
        return {
          matched: true,
          source: 'rule_manual',
          confidence: 'high',
          suggested_account_id: rule.target_account_id,
          suggested_tax_code_id: rule.tax_code_id ?? null,
          suggested_is_personal: null,
          reasoning: `Matched manual rule: "${rule.name}"`,
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