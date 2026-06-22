import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, ILike } from 'typeorm';
import { DataSource } from 'typeorm';
import {
  RawTransaction,
  RawTransactionStatus,
} from '../entities/raw-transaction.entity';
import { Account, AccountSubtype } from '../entities/account.entity';
import { ClassificationRule } from '../entities/classification-rule.entity';
import { VendorLibrary } from '../entities/vendor-library.entity';
import { MccCategoryMap } from '../entities/mcc-category-map.entity';
import { ClassificationMethod } from '../entities/classified-transaction.entity';
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
import { ClassificationService } from '../reports/services/classification.service';
import {
  SmartMatchOverrideDto,
  SmartMatchBulkConfirmDto,
} from './dto/smart-match.dto';

export interface Layer1Result {
  hits: string[];
  misses: string[];
}

export interface SmartMatchCounts {
  suggested: number;
  cap_exceeded: number;
  failed: number;
  manual: number;
}

export interface BulkConfirmResult {
  confirmed: number;
  skipped: number;
  errors: number;
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
    private readonly dataSource: DataSource,
    private readonly learnedMatcher: LearnedRuleMatcher,
    private readonly manualMatcher: ManualRuleMatcher,
    private readonly mccMatcher: MccMatcher,
    private readonly vendorMatcher: VendorLibraryMatcher,
    private readonly recurrenceMatcher: RecurrenceMatcher,
    private readonly accountDefaultMatcher: AccountDefaultMatcher,
    private readonly auditService: SmartMatchAuditService,
    private readonly classificationService: ClassificationService,
  ) {}

  // ── Context builder ────────────────────────────────────────────────────────

  private async buildContext(businessId: string): Promise<MatchContext> {
    const [accounts, classificationRules, vendorLibrary, mccRows] =
      await Promise.all([
        this.accountRepo.find({
          where: { business_id: businessId, is_active: true },
          order: { account_code: 'ASC' },
        }),
        this.ruleRepo.find({ where: { business_id: businessId, is_active: true } }),
        this.vendorRepo.find({ order: { match_priority: 'ASC' } }),
        this.mccRepo.find(),
      ]);

    const mccMap = new Map<string, MccCategoryMap>(mccRows.map((m) => [m.mcc, m]));
    return { businessId, accounts, classificationRules, vendorLibrary, mccMap };
  }

  // ── Layer 1 ────────────────────────────────────────────────────────────────

  async runLayer1(businessId: string, rawTxIds: string[]): Promise<Layer1Result> {
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
            businessId, tx.id, result.source!, result.confidence!, false,
          );
          hits.push(tx.id);
        } else {
          const defaultResult = await this.accountDefaultMatcher.match(tx, ctx);
          if (defaultResult.matched && defaultResult.suggested_is_personal !== null) {
            await this.rawTxRepo.update(tx.id, {
              suggested_is_personal: defaultResult.suggested_is_personal,
            });
          }
          misses.push(tx.id);
        }
      } catch (err) {
        this.logger.error(`Layer 1 failed for tx ${tx.id}: ${err instanceof Error ? err.message : String(err)}`);
        misses.push(tx.id);
      }
    }

    this.logger.log(`Layer 1 [${businessId}]: ${hits.length} hits, ${misses.length} misses`);
    return { hits, misses };
  }

  private async runConfidentMatchers(
    tx: RawTransaction,
    ctx: MatchContext,
  ): Promise<{ result: MatchResult; confident: boolean }> {
    for (const matcher of [
      this.learnedMatcher,
      this.manualMatcher,
      this.mccMatcher,
      this.vendorMatcher,
      this.recurrenceMatcher,
    ]) {
      const result = await matcher.match(tx, ctx);
      if (result.matched && result.confidence !== 'low') {
        return { result, confident: true };
      }
    }
    return { result: NO_MATCH, confident: false };
  }

  // ── Query methods ──────────────────────────────────────────────────────────

  async getCounts(businessId: string): Promise<SmartMatchCounts> {
    const rows = await this.dataSource.query<{ status: string; count: string }[]>(
      `SELECT smart_match_status AS status, COUNT(*) AS count
       FROM raw_transactions
       WHERE business_id = $1
         AND status = 'pending'
         AND smart_match_status IS NOT NULL
       GROUP BY smart_match_status`,
      [businessId],
    );

    const map: Record<string, number> = {};
    for (const r of rows) map[r.status] = Number(r.count);

    // manual = pending rows with NO smart match attempt
    const manualCount = await this.rawTxRepo.count({
      where: {
        business_id: businessId,
        status: RawTransactionStatus.PENDING,
        smart_match_status: undefined as any,
      },
    });

    return {
      suggested:    map['suggested']    ?? 0,
      cap_exceeded: map['cap_exceeded'] ?? 0,
      failed:       map['failed']       ?? 0,
      manual:       manualCount,
    };
  }

  async getSuggested(
    businessId: string,
    page: number,
    limit: number,
  ): Promise<{ data: RawTransaction[]; total: number }> {
    const [data, total] = await this.rawTxRepo.findAndCount({
      where: {
        business_id: businessId,
        smart_match_status: 'suggested',
        status: RawTransactionStatus.PENDING,
      },
      order: { smart_match_at: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });
    return { data, total };
  }

  // ── Source account resolution ──────────────────────────────────────────────

  private async resolveSourceAccount(
    businessId: string,
    rawTx: RawTransaction,
    suppliedId?: string,
  ): Promise<string | null> {
    if (suppliedId) return suppliedId;

    if (rawTx.source_account_name) {
      const match = await this.accountRepo.findOne({
        where: {
          business_id: businessId,
          account_name: ILike(`%${rawTx.source_account_name}%`),
          is_active: true,
        },
      });
      if (match) return match.id;
    }

    // Fallback: first active bank or credit_card account
    const fallback = await this.accountRepo.findOne({
      where: [
        { business_id: businessId, account_subtype: AccountSubtype.BANK, is_active: true },
        { business_id: businessId, account_subtype: AccountSubtype.CREDIT_CARD, is_active: true },
      ],
      order: { account_code: 'ASC' },
    });

    return fallback?.id ?? null;
  }

  // ── Confirm ────────────────────────────────────────────────────────────────

  async confirm(
    businessId: string,
    rawTransactionId: string,
    clerkUserId: string,
    suppliedSourceAccountId?: string,
  ): Promise<void> {
    const rawTx = await this.rawTxRepo.findOne({
      where: {
        id: rawTransactionId,
        business_id: businessId,
        smart_match_status: In(['suggested', 'auto_applied']),
      },
    });
    if (!rawTx) {
      throw new NotFoundException(
        `Transaction ${rawTransactionId} not found or not in suggested state`,
      );
    }
    if (!rawTx.suggested_account_id) {
      throw new BadRequestException('Suggestion has no account — use override instead');
    }

    const sourceAccountId = await this.resolveSourceAccount(
      businessId, rawTx, suppliedSourceAccountId,
    );

    // Apply is_personal from suggestion before classifying
    if (rawTx.suggested_is_personal !== null) {
      await this.rawTxRepo.update(rawTx.id, {
        is_personal: rawTx.suggested_is_personal,
      });
    }

    await this.classificationService.classify({
      businessId,
      rawTransactionId,
      accountId: rawTx.suggested_account_id,
      sourceAccountId: sourceAccountId ?? rawTx.suggested_account_id,
      classificationMethod: ClassificationMethod.MANUAL,
      taxCodeId: rawTx.suggested_tax_code_id ?? undefined,
      classifiedBy: clerkUserId,
    });

    await this.rawTxRepo.update(rawTx.id, {
      status: RawTransactionStatus.CLASSIFIED,
    });

    await this.auditService.recordResolution({
      rawTransactionId,
      businessId,
      wasAccepted: true,
      wasOverridden: false,
    });
  }

  // ── Override ───────────────────────────────────────────────────────────────

  async override(
    businessId: string,
    rawTransactionId: string,
    clerkUserId: string,
    dto: SmartMatchOverrideDto,
  ): Promise<void> {
    const rawTx = await this.rawTxRepo.findOne({
      where: { id: rawTransactionId, business_id: businessId },
    });
    if (!rawTx) {
      throw new NotFoundException(`Transaction ${rawTransactionId} not found`);
    }

    const sourceAccountId = await this.resolveSourceAccount(
      businessId, rawTx, dto.sourceAccountId,
    );

    await this.classificationService.classify({
      businessId,
      rawTransactionId,
      accountId: dto.accountId,
      sourceAccountId: sourceAccountId ?? dto.accountId,
      classificationMethod: ClassificationMethod.MANUAL,
      taxCodeId: dto.taxCodeId,
      classifiedBy: clerkUserId,
    });

    await this.rawTxRepo.update(rawTx.id, {
      status: RawTransactionStatus.CLASSIFIED,
    });

    // Upsert a user_learned rule so next import auto-matches this description
    const existing = await this.ruleRepo.findOne({
      where: {
        business_id: businessId,
        match_type: 'keyword',
        match_value: rawTx.description,
        source: 'user_learned',
      },
    });

    if (existing) {
      await this.ruleRepo.update(existing.id, {
        target_account_id: dto.accountId,
        tax_code_id: dto.taxCodeId ?? null,
        is_active: true,
      });
    } else {
      await this.ruleRepo.save(
        this.ruleRepo.create({
          business_id: businessId,
          name: `Learned: ${rawTx.description.substring(0, 60)}`,
          match_type: 'keyword',
          match_value: rawTx.description,
          target_account_id: dto.accountId,
          tax_code_id: dto.taxCodeId ?? null,
          source: 'user_learned',
          priority: 10,
          is_active: true,
        }),
      );
    }

    await this.auditService.recordResolution({
      rawTransactionId,
      businessId,
      wasAccepted: false,
      wasOverridden: true,
      overrideAccountId: dto.accountId,
    });
  }

  // ── Bulk confirm ───────────────────────────────────────────────────────────

  async bulkConfirm(
    businessId: string,
    clerkUserId: string,
    dto: SmartMatchBulkConfirmDto,
  ): Promise<BulkConfirmResult> {
    let candidates: RawTransaction[];

    if (dto.rawTransactionIds && dto.rawTransactionIds.length > 0) {
      candidates = await this.rawTxRepo.find({
        where: {
          id: In(dto.rawTransactionIds),
          business_id: businessId,
          smart_match_status: In(['suggested', 'auto_applied']),
        },
      });
    } else {
      candidates = await this.rawTxRepo.find({
        where: {
          business_id: businessId,
          smart_match_status: In(['suggested', 'auto_applied']),
          status: RawTransactionStatus.PENDING,
        },
      });
    }

    let confirmed = 0;
    let skipped = 0;
    let errors = 0;

    for (const tx of candidates) {
      if (!tx.suggested_account_id) {
        skipped++;
        continue;
      }
      try {
        await this.confirm(businessId, tx.id, clerkUserId, undefined);
        confirmed++;
      } catch (err) {
        this.logger.warn(
          `Bulk confirm skipped tx ${tx.id}: ${err instanceof Error ? err.message : String(err)}`,
        );
        // Already classified = skip; other errors = error
        if (err instanceof BadRequestException) {
          skipped++;
        } else {
          errors++;
        }
      }
    }

    this.logger.log(
      `Bulk confirm [${businessId}]: ${confirmed} confirmed, ${skipped} skipped, ${errors} errors`,
    );
    return { confirmed, skipped, errors };
  }

  // --- Phase 39: Auto-Categorization ---

  /**
   * Phase 39b: auto-sort variant of Layer 1. Triggered on ingest (import / Plaid)
   * when the business has auto_sort_enabled. Differs from runLayer1():
   *   - confident hits are marked 'auto_applied' (not 'suggested') so the recount
   *     can branch and the row carries an Auto badge while staying in review;
   *   - when defaultPersonalForMisses is set (freelancer), misses are provisionally
   *     tagged Personal and also marked 'auto_applied' -- unless account context
   *     says the source is a business account, in which case the row is left as a
   *     business miss so a deductible expense is never buried.
   * Nothing is classified or posted here; confirm()/dismiss() resolve each row.
   * Idempotent: only PENDING rows with no prior smart_match_status are processed.
   */
  async runAutoSort(
    businessId: string,
    rawTxIds: string[],
    opts: { defaultPersonalForMisses?: boolean } = {},
  ): Promise<Layer1Result> {
    if (rawTxIds.length === 0) return { hits: [], misses: [] };

    const txs = await this.rawTxRepo.find({
      where: {
        id: In(rawTxIds),
        business_id: businessId,
        status: RawTransactionStatus.PENDING,
        smart_match_status: undefined as any,
      },
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
            smart_match_status: 'auto_applied',
            smart_match_source: result.source,
            smart_match_confidence: result.confidence,
            suggested_account_id: result.suggested_account_id,
            suggested_tax_code_id: result.suggested_tax_code_id,
            suggested_is_personal: result.suggested_is_personal,
            smart_match_reasoning: result.reasoning,
            smart_match_at: new Date(),
          });
          await this.auditService.recordSuggestion(
            businessId, tx.id, result.source!, result.confidence!, false,
          );
          hits.push(tx.id);
          continue;
        }

        // Miss. Optionally default to Personal (freelancer), but never override a
        // source account that account-default knows is a business account, so a
        // deductible business expense is never silently buried.
        if (opts.defaultPersonalForMisses) {
          const def = await this.accountDefaultMatcher.match(tx, ctx);
          const accountSaysBusiness =
            def.matched && def.suggested_is_personal === false;
          if (!accountSaysBusiness) {
            await this.rawTxRepo.update(tx.id, {
              is_personal: true,
              suggested_is_personal: true,
              smart_match_status: 'auto_applied',
              smart_match_source: 'auto_personal_default',
              smart_match_at: new Date(),
            });
            await this.auditService.recordSuggestion(
              businessId, tx.id, 'auto_personal_default', 'low', false,
            );
            hits.push(tx.id);
            continue;
          }
        }
        misses.push(tx.id);
      } catch (err) {
        this.logger.error(
          `Auto-sort failed for tx ${tx.id}: ${err instanceof Error ? err.message : String(err)}`,
        );
        misses.push(tx.id);
      }
    }

    this.logger.log(
      `Auto-sort [${businessId}]: ${hits.length} auto-applied, ${misses.length} left for review`,
    );
    return { hits, misses };
  }

  /**
   * Phase 39b: dismiss an auto-applied suggestion. Reverts the row to an untouched
   * PENDING state so it returns to the primary "needs review" count. If the row was
   * auto-tagged Personal by the personal-default rule, the is_personal tag is also
   * reverted. No ClassifiedTransaction exists yet (auto-apply only stages), so there
   * is nothing to unwind on the ledger.
   */
  async dismiss(businessId: string, rawTransactionId: string): Promise<void> {
    const rawTx = await this.rawTxRepo.findOne({
      where: {
        id: rawTransactionId,
        business_id: businessId,
        smart_match_status: 'auto_applied',
      },
    });
    if (!rawTx) {
      throw new NotFoundException(
        `Transaction ${rawTransactionId} not found or not in auto-applied state`,
      );
    }

    const wasAutoPersonal = rawTx.smart_match_source === 'auto_personal_default';

    await this.rawTxRepo.update(rawTx.id, {
      smart_match_status: null,
      smart_match_source: null,
      smart_match_confidence: null,
      suggested_account_id: null,
      suggested_tax_code_id: null,
      suggested_is_personal: null,
      suggested_personal_category_id: null,
      smart_match_reasoning: null,
      smart_match_at: null,
      ...(wasAutoPersonal ? { is_personal: false } : {}),
    });

    await this.auditService.recordResolution({
      rawTransactionId,
      businessId,
      wasAccepted: false,
      wasOverridden: false,
    });
  }
}