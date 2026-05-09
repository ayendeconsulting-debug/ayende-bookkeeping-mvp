import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { RawTransaction } from '../../entities/raw-transaction.entity';
import {
  IMatcher,
  MatchContext,
  MatchResult,
  NO_MATCH,
} from '../interfaces/matcher.interface';

interface RecurrenceRow {
  account_id: string;
  tax_code_id: string | null;
}

/**
 * Layer 1 - Priority 5: Recurrence pattern detection.
 *
 * If the same business classified a transaction with an identical normalized
 * description within a rolling 35-day window, re-use that account assignment.
 * Catches recurring charges (SaaS subscriptions, payroll, rent) not covered
 * by the vendor library.
 *
 * Uses raw SQL via DataSource to avoid importing ClassifiedTransaction as a
 * TypeORM dependency (prevents circular module graph).
 *
 * Confidence: medium
 */
@Injectable()
export class RecurrenceMatcher implements IMatcher {
  constructor(private readonly dataSource: DataSource) {}

  async match(tx: RawTransaction, ctx: MatchContext): Promise<MatchResult> {
    const normalizedDesc = tx.description.trim().toLowerCase();

    const rows = await this.dataSource.query<RecurrenceRow[]>(
      `SELECT ct.account_id, ct.tax_code_id
       FROM classified_transactions ct
       JOIN raw_transactions rt ON rt.id = ct.raw_transaction_id
       WHERE rt.business_id = $1
         AND LOWER(TRIM(rt.description)) = $2
         AND rt.transaction_date >= (CURRENT_DATE - INTERVAL '35 days')
         AND rt.status IN ('classified', 'posted')
       ORDER BY rt.transaction_date DESC
       LIMIT 1`,
      [ctx.businessId, normalizedDesc],
    );

    if (!rows || rows.length === 0) return NO_MATCH;

    const row = rows[0];
    const account = ctx.accounts.find(
      (a) => a.id === row.account_id && a.is_active,
    );
    if (!account) return NO_MATCH;

    return {
      matched: true,
      source: 'rule_recurrence',
      confidence: 'medium',
      suggested_account_id: account.id,
      suggested_tax_code_id: row.tax_code_id ?? null,
      suggested_is_personal: null,
      reasoning: `Recurring transaction — matched a classified entry within the last 35 days`,
    };
  }
}