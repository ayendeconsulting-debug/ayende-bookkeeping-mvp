import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Job } from 'bullmq';
import { RawTransaction } from '../../entities/raw-transaction.entity';
import { Subscription } from '../../entities/subscription.entity';
import { AiUsageLog, AiFeature } from '../../entities/ai-usage-log.entity';
import { ClassificationAiService } from '../../ai/services/classification-ai.service';
import { SmartMatchAuditService } from '../smart-match-audit.service';
import { SmartMatchAiJobData } from './smart-match-batch.processor';

/**
 * Smart Match monthly AI call caps — separate from general AiUsageGuard caps.
 * Per SRD §16: Personal=100, Pro=1000, Accountant=unlimited.
 * null = unlimited.
 */
const SMART_MATCH_AI_CAPS: Record<string, number | null> = {
  starter:    100,
  pro:        1000,
  accountant: null,
  trialing:   1000,
};

/**
 * Phase 34d — Layer 2 AI fallback processor.
 *
 * Consumes 'smart-match-ai' queue.
 * 1. Loads subscription plan and checks Smart Match AI cap.
 * 2. Over cap -> writes smart_match_status='cap_exceeded', returns cleanly.
 * 3. Calls ClassificationAiService.suggest() for classification.
 * 4. Writes suggestion columns to raw_transactions.
 * 5. Writes SmartMatchAudit row (ai_call_made=true).
 * 6. Writes AiUsageLog row for general observability.
 *
 * Retry: up to 3 attempts with exponential backoff (set by BatchProcessor).
 * On every throw: writes smart_match_status='failed'. Successful retry overwrites to 'suggested'.
 */
@Processor('smart-match-ai')
export class SmartMatchAiProcessor extends WorkerHost {
  private readonly logger = new Logger(SmartMatchAiProcessor.name);

  constructor(
    @InjectRepository(RawTransaction)
    private readonly rawTxRepo: Repository<RawTransaction>,
    @InjectRepository(Subscription)
    private readonly subscriptionRepo: Repository<Subscription>,
    @InjectRepository(AiUsageLog)
    private readonly usageLogRepo: Repository<AiUsageLog>,
    private readonly classificationAiService: ClassificationAiService,
    private readonly auditService: SmartMatchAuditService,
  ) {
    super();
  }

  async process(job: Job<SmartMatchAiJobData>): Promise<void> {
    const { businessId, rawTransactionId } = job.data;
    this.logger.log(
      `SmartMatchAi [${job.id}] start — tx ${rawTransactionId} (attempt ${job.attemptsMade + 1})`,
    );

    try {
      await this.processAiJob(businessId, rawTransactionId);
    } catch (err) {
      this.logger.error(
        `SmartMatchAi [${job.id}] failed: ${
          err instanceof Error ? err.message : String(err)
        }`,
      );
      // Write 'failed' on every throw. Successful retry overwrites to 'suggested'.
      // If all attempts exhaust, 'failed' remains — row appears in Manual sub-tab.
      await this.rawTxRepo
        .update(
          { id: rawTransactionId, business_id: businessId },
          { smart_match_status: 'failed' },
        )
        .catch(() => {});
      throw err; // Re-throw so BullMQ handles retry / move-to-failed
    }
  }

  private async processAiJob(
    businessId: string,
    rawTransactionId: string,
  ): Promise<void> {
    // ── Plan-specific cap check ───────────────────────────────────────────
    const subscription = await this.subscriptionRepo.findOne({
      where: { business_id: businessId },
    });
    const planKey =
      subscription?.status === 'trialing'
        ? 'trialing'
        : (subscription?.plan ?? 'starter');
    const cap: number | null =
      SMART_MATCH_AI_CAPS[planKey] ?? SMART_MATCH_AI_CAPS.starter!;

    if (cap !== null) {
      const used = await this.auditService.countAiCallsThisMonth(businessId);
      if (used >= cap) {
        this.logger.log(
          `SmartMatchAi cap exceeded [${businessId}] (${used}/${cap}) — marking cap_exceeded`,
        );
        await this.rawTxRepo.update(
          { id: rawTransactionId, business_id: businessId },
          { smart_match_status: 'cap_exceeded' },
        );
        return; // Clean exit — not a job failure, no retry
      }
    }

    // ── AI classification ─────────────────────────────────────────────────
    const suggestion = await this.classificationAiService.suggest(
      businessId,
      rawTransactionId,
    );

    // ── Write suggestion columns ──────────────────────────────────────────
    await this.rawTxRepo.update(
      { id: rawTransactionId, business_id: businessId },
      {
        smart_match_status:     'suggested',
        smart_match_source:     'ai',
        smart_match_confidence: suggestion.confidence,
        suggested_account_id:   suggestion.suggested_account_id,
        suggested_tax_code_id:  suggestion.suggested_tax_code_id,
        suggested_is_personal:  suggestion.suggested_is_personal ?? null,
        smart_match_reasoning:  suggestion.reasoning,
        smart_match_at:         new Date(),
      },
    );

    // ── SmartMatchAudit row ───────────────────────────────────────────────
    await this.auditService.recordSuggestion(
      businessId,
      rawTransactionId,
      'ai',
      suggestion.confidence,
      true,
    );

    // ── AiUsageLog row (general observability — non-fatal on failure) ─────
    await this.usageLogRepo
      .save(
        this.usageLogRepo.create({
          business_id:   businessId,
          clerk_user_id: 'system_smart_match',
          feature:       AiFeature.CLASSIFY,
          tokens_used:   0,
          job_id:        null,
        }),
      )
      .catch((err) =>
        this.logger.warn(
          `AiUsageLog write failed for tx ${rawTransactionId}: ${
            err instanceof Error ? err.message : String(err)
          }`,
        ),
      );

    this.logger.log(
      `SmartMatchAi done — tx ${rawTransactionId} | ${suggestion.confidence} confidence | account ${suggestion.suggested_account_id ?? 'null'}`,
    );
  }
}