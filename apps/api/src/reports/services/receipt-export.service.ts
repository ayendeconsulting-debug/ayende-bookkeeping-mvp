import {
  Injectable,
  Logger,
  BadRequestException,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { InjectRepository } from '@nestjs/typeorm';
import { Queue } from 'bullmq';
import { Repository } from 'typeorm';
import {
  ReceiptExportJob,
  ReceiptExportStatus,
} from '../../entities/receipt-export-job.entity';
import { Subscription } from '../../entities/subscription.entity';
import { AiUsageLog } from '../../entities/ai-usage-log.entity';
import { Document, DocumentFileType } from '../../entities/document.entity';
import { RawTransactionStatus } from '../../entities/raw-transaction.entity';
import {
  RECEIPT_EXPORT_QUEUE,
  ReceiptExportJobData,
} from '../receipt-export.constants';
import { ReceiptExportSubmitDto } from '../dto/receipt-export.dto';

export interface PreflightResult {
  receipts_found: number;
  receipts_with_extract: number;
  receipts_needing_extract: number;
  ai_cap_remaining: number;
  ai_cap_exceeded_by: number;
  business_plan: string;
}

export interface SubmitResult {
  job_id: string;
  status: string;
  receipts_total: number;
  extracts_required: number;
  cap_partial: boolean;
}

/**
 * Phase 31b.3 - Enumerated receipt row.
 * One row per (document, raw_transaction) pair after the dual-link join.
 * Reused by 31b.4 run() for zip + manifest assembly.
 */
export interface EnumeratedReceipt {
  document_id: string;
  file_name: string;
  s3_key: string;
  s3_bucket: string;
  file_type: DocumentFileType;
  raw_transaction_id: string;
  transaction_date: Date;
  amount: string; // numeric returns as string from getRawMany
  description: string;
  source_account_name: string | null;
  status: RawTransactionStatus;
  currency_code: string | null;
}

const ZIP_TTL_DAYS = 7;
const MAX_RECEIPTS = 500;
const MAX_RANGE_DAYS = 24 * 31; // ~24 months, generous

/** Mirrors apps/api/src/ai/ai-usage.guard.ts PLAN_CAPS exactly. */
const PLAN_CAPS: Record<string, number> = {
  starter: 50,
  pro: 200,
  accountant: 500,
  trialing: 200, // trial grace cap matches Pro
};

@Injectable()
export class ReceiptExportService {
  private readonly logger = new Logger(ReceiptExportService.name);

  constructor(
    @InjectRepository(ReceiptExportJob)
    private readonly jobRepo: Repository<ReceiptExportJob>,
    @InjectRepository(Subscription)
    private readonly subscriptionRepo: Repository<Subscription>,
    @InjectRepository(AiUsageLog)
    private readonly usageRepo: Repository<AiUsageLog>,
    @InjectRepository(Document)
    private readonly documentRepo: Repository<Document>,
    @InjectQueue(RECEIPT_EXPORT_QUEUE)
    private readonly exportQueue: Queue<ReceiptExportJobData>,
  ) {}

  // ───────────────────────────────────────────────────────────
  // Internal: receipt enumeration with dual-link join
  // ───────────────────────────────────────────────────────────
  /**
   * Phase 31b.3 - Enumerate Business-track receipts in date range.
   *
   * Joins documents to raw_transactions via either:
   *   (a) documents.raw_transaction_id (direct, pre-posting)
   *   (b) documents.journal_entry_id -> classified_transactions.posted_journal_entry_id
   *       -> classified_transactions.raw_transaction_id (indirect, post-posting)
   *
   * The 29d.1.b read-side fix established that documents may carry either
   * link. This query unifies both paths via COALESCE on the raw_transactions
   * inner join.
   *
   * Filters: in-range, is_personal=false, status in (pending|classified|posted).
   * Documents with no resolvable raw_transaction are silently dropped (orphans).
   */
  private async enumerateReceipts(
    businessId: string,
    startDate: string,
    endDate: string,
  ): Promise<EnumeratedReceipt[]> {
    const rows = await this.documentRepo
      .createQueryBuilder('d')
      .leftJoin(
        'raw_transactions',
        'rt_direct',
        'rt_direct.id = d.raw_transaction_id',
      )
      .leftJoin(
        'classified_transactions',
        'ct',
        'ct.posted_journal_entry_id = d.journal_entry_id',
      )
      .leftJoin(
        'raw_transactions',
        'rt_via_je',
        'rt_via_je.id = ct.raw_transaction_id',
      )
      .innerJoin(
        'raw_transactions',
        'rt',
        'rt.id = COALESCE(rt_direct.id, rt_via_je.id)',
      )
      .select([
        'd.id AS document_id',
        'd.file_name AS file_name',
        'd.s3_key AS s3_key',
        'd.s3_bucket AS s3_bucket',
        'd.file_type AS file_type',
        'rt.id AS raw_transaction_id',
        'rt.transaction_date AS transaction_date',
        'rt.amount AS amount',
        'rt.description AS description',
        'rt.source_account_name AS source_account_name',
        'rt.status AS status',
        'rt.currency_code AS currency_code',
      ])
      .where('d.business_id = :businessId', { businessId })
      .andWhere('rt.transaction_date BETWEEN :startDate AND :endDate', {
        startDate,
        endDate,
      })
      .andWhere('rt.is_personal = false')
      .andWhere('rt.status IN (:...statuses)', {
        statuses: [
          RawTransactionStatus.PENDING,
          RawTransactionStatus.CLASSIFIED,
          RawTransactionStatus.POSTED,
        ],
      })
      .orderBy('rt.transaction_date', 'ASC')
      .addOrderBy('d.id', 'ASC')
      .getRawMany<EnumeratedReceipt>();

    // Defensive de-dup on document_id in case ct fan-out produces duplicates.
    const seen = new Set<string>();
    return rows.filter((r) => {
      if (seen.has(r.document_id)) return false;
      seen.add(r.document_id);
      return true;
    });
  }

  // ───────────────────────────────────────────────────────────
  // Internal: AI cap lookup (mirrors AiUsageGuard logic, inlined)
  // ───────────────────────────────────────────────────────────
  /**
   * Returns the per-business cap and current month usage. Firm-scope cap
   * (Accountant plan under a firm) is enforced at extract time by AiUsageGuard;
   * preflight uses per-business view. Carry-over: tighter firm-scope preflight.
   */
  private async getCapState(businessId: string): Promise<{
    cap: number;
    used: number;
    remaining: number;
    capKey: string;
  }> {
    const subscription = await this.subscriptionRepo.findOne({
      where: { business_id: businessId },
    });

    const capKey =
      subscription?.status === 'trialing'
        ? 'trialing'
        : (subscription?.plan ?? 'starter');
    const cap = PLAN_CAPS[capKey] ?? PLAN_CAPS.starter;

    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const used = await this.usageRepo
      .createQueryBuilder('log')
      .where('log.business_id = :businessId', { businessId })
      .andWhere('log.used_at >= :monthStart', { monthStart })
      .getCount();

    const remaining = Math.max(cap - used, 0);
    return { cap, used, remaining, capKey };
  }

  // ───────────────────────────────────────────────────────────
  // Public: preflight
  // ───────────────────────────────────────────────────────────
  /**
   * Phase 31b.3 - Enumerate receipts in range, look up plan + AI cap,
   * return summary the UI uses to surface partial-warning before submit.
   *
   * NOTE on extract dedup: 31b.3 treats every found receipt as needing
   * extract. Cross-batch dedup deferred (carry-over). 31b.4's run() will
   * track within-batch dedup via local Set when the fan-out runs.
   */
  async preflight(
    businessId: string,
    startDate: string,
    endDate: string,
  ): Promise<PreflightResult> {
    const receipts = await this.enumerateReceipts(
      businessId,
      startDate,
      endDate,
    );
    const receipts_found = receipts.length;
    const receipts_with_extract = 0;
    const receipts_needing_extract = receipts_found;

    const { cap, used, capKey } = await this.getCapState(businessId);
    const ai_cap_remaining = Math.max(cap - used, 0);
    const ai_cap_exceeded_by = Math.max(
      receipts_needing_extract - ai_cap_remaining,
      0,
    );

    return {
      receipts_found,
      receipts_with_extract,
      receipts_needing_extract,
      ai_cap_remaining,
      ai_cap_exceeded_by,
      business_plan: capKey,
    };
  }

  // ───────────────────────────────────────────────────────────
  // Public: submit
  // ───────────────────────────────────────────────────────────
  /**
   * Phase 31b.3 - Validate inputs, enforce range/count caps + AI cap +
   * single-active-per-business, then create row and enqueue. The
   * processor reads the row and runs the export.
   *
   * Throws:
   *   400 BadRequest - range invalid, range too long, too many receipts
   *   409 Conflict - AI cap will be exceeded; client must retry with
   *                  acknowledge_partial=true
   *   429 TooManyRequests - another export already queued/running for this
   *                         business
   */
  async submit(
    businessId: string,
    userId: string,
    dto: ReceiptExportSubmitDto,
  ): Promise<SubmitResult> {
    const start = new Date(dto.startDate);
    const end = new Date(dto.endDate);

    // Range sanity (FR-31-3)
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
      throw new BadRequestException('startDate and endDate must be valid dates');
    }
    if (end < start) {
      throw new BadRequestException('endDate must be on or after startDate');
    }

    // 24-month max range (FR-31-3)
    const rangeDays = Math.floor(
      (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24),
    );
    if (rangeDays > MAX_RANGE_DAYS) {
      throw new BadRequestException(
        `Range exceeds 24-month maximum (${rangeDays} days). Narrow the range and retry.`,
      );
    }

    // Run preflight to size the batch
    const pf = await this.preflight(businessId, dto.startDate, dto.endDate);

    // 500-receipt hard cap (FR-31-4)
    if (pf.receipts_found > MAX_RECEIPTS) {
      throw new BadRequestException(
        `${pf.receipts_found} receipts in range; max ${MAX_RECEIPTS}. Narrow the date range.`,
      );
    }

    // Cap-exceeded path requires explicit acknowledgement (FR-31-2)
    if (pf.ai_cap_exceeded_by > 0 && dto.acknowledge_partial !== true) {
      throw new HttpException(
        {
          error:
            'AI cap will be exceeded by this export. Re-submit with acknowledge_partial=true to proceed; rows beyond the cap will be marked extract_status=cap_exceeded in the manifest.',
          preflight: pf,
        },
        HttpStatus.CONFLICT,
      );
    }

    // Single active export per business (FR-31-5)
    const existing = await this.jobRepo.findOne({
      where: [
        { business_id: businessId, status: ReceiptExportStatus.QUEUED },
        { business_id: businessId, status: ReceiptExportStatus.RUNNING },
      ],
      order: { created_at: 'DESC' },
    });
    if (existing) {
      throw new HttpException(
        {
          error: 'A receipt export is already in progress for this business.',
          existing_job_id: existing.id,
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    // All checks pass -- create row + enqueue
    const row = await this.jobRepo.save(
      this.jobRepo.create({
        business_id: businessId,
        user_id: userId,
        status: ReceiptExportStatus.QUEUED,
        start_date: start,
        end_date: end,
        receipts_total: pf.receipts_found,
        extracts_required: pf.receipts_needing_extract,
      }),
    );

    const job = await this.exportQueue.add(
      'receipt-export',
      { jobRowId: row.id },
      { removeOnComplete: 50, removeOnFail: 20 },
    );

    if (job.id) {
      await this.jobRepo.update(row.id, { bullmq_job_id: job.id });
    }

    this.logger.log(
      `submit jobRowId=${row.id} business=${businessId} receipts=${pf.receipts_found} extracts=${pf.receipts_needing_extract} cap_partial=${pf.ai_cap_exceeded_by > 0}`,
    );

    return {
      job_id: row.id,
      status: row.status,
      receipts_total: row.receipts_total,
      extracts_required: row.extracts_required,
      cap_partial: pf.ai_cap_exceeded_by > 0,
    };
  }

  // ───────────────────────────────────────────────────────────
  // Public: run (called by processor)
  // ───────────────────────────────────────────────────────────
  /**
   * Phase 31b.2 - SKELETON. Marks complete with 7-day expiry. No real work.
   * TODO 31b.4: enumerate receipts (reuse this.enumerateReceipts), fan out
   * receipt_extract child jobs at concurrency 3, assemble zip with archiver,
   * upload via DocumentsService.uploadBuffer, write download_key, dispatch
   * Resend email.
   */
  async run(jobRowId: string): Promise<void> {
    this.logger.log(`run (skeleton) jobRowId=${jobRowId}`);

    await this.jobRepo.update(jobRowId, {
      status: ReceiptExportStatus.RUNNING,
    });

    const now = new Date();
    const expiresAt = new Date(
      now.getTime() + ZIP_TTL_DAYS * 24 * 60 * 60 * 1000,
    );

    await this.jobRepo.update(jobRowId, {
      status: ReceiptExportStatus.COMPLETE,
      completed_at: now,
      expires_at: expiresAt,
    });

    this.logger.log(`run (skeleton) jobRowId=${jobRowId} marked complete`);
  }
}