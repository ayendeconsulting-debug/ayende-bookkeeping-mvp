import { Processor, WorkerHost, InjectQueue } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Job, Queue } from 'bullmq';
import {
  RawTransaction,
  RawTransactionStatus,
} from '../../entities/raw-transaction.entity';
import { SmartMatchService } from '../smart-match.service';

export interface SmartMatchBatchJobData {
  businessId: string;
  /** Specific tx IDs — used by Plaid sync hook (34e) and manual run-on-subset. */
  rawTxIds?: string[];
  /** Load tx IDs from a CSV/PDF import batch — used by import hook (34e). */
  importBatchId?: string;
}

export interface SmartMatchAiJobData {
  businessId: string;
  rawTransactionId: string;
}

/**
 * Phase 34d — Layer 1 batch runner.
 *
 * Consumes 'smart-match-batch' queue.
 * 1. Resolves which raw transactions to process.
 * 2. Marks eligible rows 'queued' (idempotency guard against double-processing).
 * 3. Calls SmartMatchService.runLayer1() — writes 'suggested' for Layer 1 hits.
 * 4. Enqueues one 'smart-match-ai' job per Layer 1 miss.
 */
@Processor('smart-match-batch')
export class SmartMatchBatchProcessor extends WorkerHost {
  private readonly logger = new Logger(SmartMatchBatchProcessor.name);

  constructor(
    @InjectRepository(RawTransaction)
    private readonly rawTxRepo: Repository<RawTransaction>,
    @InjectQueue('smart-match-ai')
    private readonly aiQueue: Queue,
    private readonly smartMatchService: SmartMatchService,
  ) {
    super();
  }

  async process(job: Job<SmartMatchBatchJobData>): Promise<void> {
    const { businessId, rawTxIds, importBatchId } = job.data;
    this.logger.log(
      `SmartMatchBatch [${job.id}] start — business ${businessId}`,
    );

    // ── Resolve candidate tx IDs ──────────────────────────────────────────
    let candidateIds: string[];

    if (rawTxIds && rawTxIds.length > 0) {
      candidateIds = rawTxIds;
    } else if (importBatchId) {
      const rows = await this.rawTxRepo.find({
        where: { business_id: businessId, import_batch_id: importBatchId },
        select: ['id'],
      });
      candidateIds = rows.map((r) => r.id);
    } else {
      // Full business sweep — used by 34f POST /smart-match/run
      const rows = await this.rawTxRepo.find({
        where: {
          business_id: businessId,
          status: RawTransactionStatus.PENDING,
        },
        select: ['id', 'smart_match_status'],
      });
      candidateIds = rows
        .filter(
          (r) => !r.smart_match_status || r.smart_match_status === 'failed',
        )
        .map((r) => r.id);
    }

    if (candidateIds.length === 0) {
      this.logger.log(`SmartMatchBatch [${job.id}] — no candidates, done`);
      return;
    }

    // ── Idempotency: skip rows already processed (or in-flight) ──────────
    const rows = await this.rawTxRepo.find({
      where: { id: In(candidateIds), business_id: businessId },
      select: ['id', 'smart_match_status'],
    });
    const eligibleIds = rows
      .filter(
        (r) => !r.smart_match_status || r.smart_match_status === 'failed',
      )
      .map((r) => r.id);

    if (eligibleIds.length === 0) {
      this.logger.log(
        `SmartMatchBatch [${job.id}] — all candidates already processed`,
      );
      return;
    }

    // Mark as queued before processing — prevents double-processing on retry
    await this.rawTxRepo.update(
      { id: In(eligibleIds), business_id: businessId },
      { smart_match_status: 'queued' },
    );

    // ── Run Layer 1 ───────────────────────────────────────────────────────
    const { hits, misses } = await this.smartMatchService.runLayer1(
      businessId,
      eligibleIds,
    );

    this.logger.log(
      `SmartMatchBatch [${job.id}] Layer 1 done — ${hits.length} hits, ${misses.length} AI jobs queued`,
    );

    // ── Enqueue one Layer 2 job per miss ──────────────────────────────────
    for (const rawTransactionId of misses) {
      await this.aiQueue.add(
        'smart-match-ai',
        { businessId, rawTransactionId } as SmartMatchAiJobData,
        {
          attempts: 3,
          backoff: { type: 'exponential', delay: 5000 },
        },
      );
    }
  }
}