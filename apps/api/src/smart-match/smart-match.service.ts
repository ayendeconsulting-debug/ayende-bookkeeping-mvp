import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { RawTransaction } from '../entities/raw-transaction.entity';
import { Account } from '../entities/account.entity';
import { ClassificationRule } from '../entities/classification-rule.entity';
import { VendorLibrary } from '../entities/vendor-library.entity';
import { MccCategoryMap } from '../entities/mcc-category-map.entity';
import {
  MatchContext,
  MatchResult,
  NO_MATCH,
} from './interfaces/matcher.interface';
import { LearnedRuleMatcher } from './rules/learned-rule.matcher';
import { ManualRuleMatcher } from './rules/manual-rule.matcher';
import { MccMatcher } from './rules/mcc.matcher';
import { VendorLibraryMatcher } from './rules/vendor-library.matcher';
import { RecurrenceMatcher } from './rules/recurrence.matcher';
import { AccountDefaultMatcher } from './rules/account-default.matcher';
import { SmartMatchAuditService } from './smart-match-audit.service';

export interface Layer1Result {
  /** Raw transaction IDs that received a confident suggestion (confidence >= medium). */
  hits: string[];
  /** Raw transaction IDs that need Layer 2 AI fallback. */
  misses: string[];
}

@Injectable()
export class SmartMatchService {
  private readonly logger = new Logger(SmartMatchService.name);

  constructor(
    @InjectRepository(RawTransaction)
    private readonly rawTxRepo: Repository<RawTransaction>,
    @InjectRepository(Account)
    private readonly accountRepo: Repository<Account>,
    @InjectRepository(ClassificationRule)
    private readonly ruleRepo: Repository<ClassificationRule>,
    @InjectRepository(VendorLibrary)
    private readonly vendorRepo: Repository<VendorLibrary>,
    @InjectRepository(MccCategoryMap)
    private readonly mccRepo: Repository<MccCategoryMap>,
    private readonly learnedMatcher: LearnedRuleMatcher,
    private readonly manualMatcher: ManualRuleMatcher,
    private readonly mccMatcher: MccMatcher,
    private readonly vendorMatcher: VendorLibraryMatcher,
    private readonly recurrenceMatcher: RecurrenceMatcher,
    private readonly accountDefaultMatcher: AccountDefaultMatcher,
    private readonly auditService: SmartMatchAuditService,
  ) {}

  /**
   * Build a shared MatchContext for a business.
   * Loads all reference data in one Promise.all — zero N+1 queries across matchers.
   */
  private async buildContext(businessId: string): Promise<MatchContext> {
    const [accounts, classificationRules, vendorLibrary, mccRows] =
      await Promise.all([
        this.accountRepo.find({
          where: { business_id: businessId, is_active: true },
          order: { account_code: 'ASC' },
        }),
        this.ruleRepo.find({
          where: { business_id: businessId, is_active: true },
        }),
        // Global vendor library sorted by match_priority ASC (first match wins).
        this.vendorRepo.find({ order: { match_priority: 'ASC' } }),
        this.mccRepo.find(),
      ]);

    const mccMap = new Map<string, MccCategoryMap>(
      mccRows.map((m) => [m.mcc, m]),
    );

    return { businessId, accounts, classificationRules, vendorLibrary, mccMap };
  }

  /**
   * Run Layer 1 rules against the given raw transaction IDs.
   *
   * Algorithm:
   *   1. Build MatchContext once (4 DB queries regardless of batch size).
   *   2. For each tx, run P1-P5 matchers in priority order.
   *   3. First confident match (confidence != 'low') writes suggestion columns
   *      and marks the row 'suggested'. Tx goes into hits[].
   *   4. On miss, run P6 (account-default) to pre-set suggested_is_personal
   *      as a hint for the AI prompt. Tx goes into misses[].
   *   5. Write a SmartMatchAudit row for every confident hit.
   *   6. Return { hits, misses } for SmartMatchBatchProcessor (34d) to enqueue
   *      Layer 2 AI jobs from misses[].
   *
   * Errors per-tx are caught and routed to misses[] — never fail the batch.
   */
  async runLayer1(
    businessId: string,
    rawTxIds: string[],
  ): Promise<Layer1Result> {
    if (rawTxIds.length === 0) return { hits: [], misses: [] };

    const txs = await this.rawTxRepo.find({
      where: { id: In(rawTxIds), business_id: businessId },
    });

    if (txs.length === 0) return { hits: [], misses: [] };

    const ctx = await this.buildContext(businessId);
    const hits: string[] = [];
    const misses: string[] = [];

    for (const tx of txs) {
      try {
        const { result, confident } = await this.runConfidentMatchers(tx, ctx);

        if (confident && result.matched) {
          await this.rawTxRepo.update(tx.id, {
            smart_match_status: 'suggested',
            smart_match_source: result.source,
            smart_match_confidence: result.confidence,
            suggested_account_id: result.suggested_account_id,
            suggested_tax_code_id: result.suggested_tax_code_id,
            suggested_is_personal: result.suggested_is_personal,
            smart_match_reasoning: result.reasoning,
            smart_match_at: new Date(),
          });
          await this.auditService.recordSuggestion(
            businessId,
            tx.id,
            result.source!,
            result.confidence!,
            false,
          );
          hits.push(tx.id);
        } else {
          // P6: write is_personal hint for Layer 2 even though tx goes to AI.
          const defaultResult = await this.accountDefaultMatcher.match(tx, ctx);
          if (
            defaultResult.matched &&
            defaultResult.suggested_is_personal !== null
          ) {
            await this.rawTxRepo.update(tx.id, {
              suggested_is_personal: defaultResult.suggested_is_personal,
            });
          }
          misses.push(tx.id);
        }
      } catch (err) {
        this.logger.error(
          `Layer 1 failed for tx ${tx.id}: ${
            err instanceof Error ? err.message : String(err)
          }`,
        );
        misses.push(tx.id);
      }
    }

    this.logger.log(
      `Layer 1 complete [${businessId}]: ${hits.length} hits, ${misses.length} misses / ${txs.length} txs`,
    );

    return { hits, misses };
  }

  /**
   * Run matchers P1-P5 in priority order.
   * Stops and returns on the first match with confidence !== 'low'.
   */
  private async runConfidentMatchers(
    tx: RawTransaction,
    ctx: MatchContext,
  ): Promise<{ result: MatchResult; confident: boolean }> {
    const matchers = [
      this.learnedMatcher,
      this.manualMatcher,
      this.mccMatcher,
      this.vendorMatcher,
      this.recurrenceMatcher,
    ];

    for (const matcher of matchers) {
      const result = await matcher.match(tx, ctx);
      if (result.matched && result.confidence !== 'low') {
        return { result, confident: true };
      }
    }

    return { result: NO_MATCH, confident: false };
  }
}