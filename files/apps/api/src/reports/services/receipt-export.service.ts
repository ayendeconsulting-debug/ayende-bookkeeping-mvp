import {
  Injectable,
  Logger,
  BadRequestException,
  HttpException,
  HttpStatus,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { InjectRepository } from '@nestjs/typeorm';
import { Queue } from 'bullmq';
import { Repository } from 'typeorm';
import archiver from 'archiver';
import {
  ReceiptExportJob,
  ReceiptExportStatus,
} from '../../entities/receipt-export-job.entity';
import { Subscription } from '../../entities/subscription.entity';
import { AiUsageLog } from '../../entities/ai-usage-log.entity';
import { Document, DocumentFileType } from '../../entities/document.entity';
import { RawTransactionStatus } from '../../entities/raw-transaction.entity';
import { Business } from '../../entities/business.entity';
import { ClassifiedTransaction } from '../../entities/classified-transaction.entity';
import {
  RECEIPT_EXPORT_QUEUE,
  ReceiptExportJobData,
} from '../receipt-export.constants';
import { ReceiptExportSubmitDto } from '../dto/receipt-export.dto';
import {
  ExtractorService,
  ReceiptExtractResult,
} from '../../ai/services/extractor.service';
import { DocumentsService } from '../../documents/documents.service';

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

/**
 * Phase 31b.4 - extract outcome per receipt. Drives manifest column 18.
 *   success         -> Anthropic returned a confident result, recorded usage
 *   low_confidence  -> Returned a result but confidence < 0.5
 *   failed          -> Empty result (S3 download fail / vision fail / parse fail)
 *                       OR Document not found (NotFoundException from extract())
 *                       OR fetch failure during zip build (mutated post-extract)
 *   cap_exceeded    -> Local cap budget depleted before extract was attempted
 *   not_attempted   -> File missing / fetch failed at zip build time
 */
type ExtractStatus =
  | 'success'
  | 'low_confidence'
  | 'failed'
  | 'cap_exceeded'
  | 'not_attempted';

interface ExtractOutcome {
  status: ExtractStatus;
  result: ReceiptExtractResult | null;
}

const ZIP_TTL_DAYS = 7;
const MAX_RECEIPTS = 500;
const MAX_RANGE_DAYS = 24 * 31; // ~24 months, generous

// Phase 31b.4 - run() constants
const EXTRACT_CONCURRENCY = 3; // FR-31-9
const LOW_CONFIDENCE_THRESHOLD = 0.5; // FR-31-11
const AMOUNT_MISMATCH_TOLERANCE = 0.01; // 1 cent tolerance
const ERROR_MESSAGE_MAX_LENGTH = 5000;

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
    @InjectRepository(Business)
    private readonly businessRepo: Repository<Business>,
    @InjectRepository(ClassifiedTransaction)
    private readonly classifiedTxRepo: Repository<ClassifiedTransaction>,
    @InjectQueue(RECEIPT_EXPORT_QUEUE)
    private readonly exportQueue: Queue<ReceiptExportJobData>,
    // Phase 31b.4 - forwardRef breaks ReportsModule <-> AiModule cycle
    @Inject(forwardRef(() => ExtractorService))
    private readonly extractorService: ExtractorService,
    private readonly documentsService: DocumentsService,
  ) {}

  // ======================================================================
  // Internal: receipt enumeration with dual-link join (Phase 31b.3)
  // ======================================================================
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

  // ======================================================================
  // Internal: AI cap lookup (mirrors AiUsageGuard logic, inlined)
  // ======================================================================
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

  // ======================================================================
  // Public: preflight (Phase 31b.3)
  // ======================================================================
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

  // ======================================================================
  // Public: submit (Phase 31b.3, 31b.4 update: explicit attempts:1)
  // ======================================================================
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

    // Phase 31b.4: explicit attempts:1 - run() failures are deterministic,
    // a retry would just re-fail and re-charge AI cap. removeOnComplete keeps
    // the last 50 successful jobs in BullMQ history for debugging.
    const job = await this.exportQueue.add(
      'receipt-export',
      { jobRowId: row.id },
      { removeOnComplete: 50, removeOnFail: 20, attempts: 1 },
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

  // ======================================================================
  // Public: run (Phase 31b.4 - real implementation)
  // ======================================================================
  /**
   * Phase 31b.4 - Process a queued receipt-export job end to end:
   *   1. Load job row + business (default currency)
   *   2. Mark RUNNING
   *   3. Enumerate in-range Business-track receipts
   *   4. Extract fan-out at concurrency 3 (FR-31-8, FR-31-9)
   *   5. Batch-fetch GL accounts for posted receipts
   *   6. Sequential receipt download into in-memory buffers; fetch failures
   *      mutate outcomes to 'not_attempted'
   *   7. Build file path map with collision suffixes (FR-31-13)
   *   8. Build manifest CSV with UTF-8 BOM, 19 columns (FR-31-14, 15; SRD 7.4)
   *   9. Assemble zip via archiver (manifest + receipts/)
   *   10. Upload zip to s3://bucket/exports/{business_id}/{job_id}.zip
   *   11. Update job row: complete + counts + download_key + expires_at
   *
   * Failure path: any throw above is caught, the job row transitions to
   * FAILED with truncated error_message, then the exception is re-thrown
   * so BullMQ also marks the job failed (attempts:1 means no retry).
   *
   * Resend email dispatch is deferred to 31b.5.
   */
  async run(jobRowId: string): Promise<void> {
    const job = await this.jobRepo.findOne({ where: { id: jobRowId } });
    if (!job) {
      // Job row already deleted (possibly by an admin sweep). Nothing to do.
      this.logger.warn(`run jobRowId=${jobRowId} - row not found, skipping`);
      return;
    }

    try {
      await this.jobRepo.update(jobRowId, {
        status: ReceiptExportStatus.RUNNING,
      });

      // 1. Load business for default currency (manifest column 6 fallback)
      const business = await this.businessRepo.findOneOrFail({
        where: { id: job.business_id },
      });
      const defaultCurrency = business.currency_code ?? '';

      // 2. Enumerate
      const startDateStr = this.formatDateOnly(job.start_date);
      const endDateStr = this.formatDateOnly(job.end_date);
      const receipts = await this.enumerateReceipts(
        job.business_id,
        startDateStr,
        endDateStr,
      );
      this.logger.log(
        `run jobRowId=${jobRowId} enumerated ${receipts.length} receipts (${startDateStr} -> ${endDateStr})`,
      );

      // 3. Extract fan-out
      const outcomes = await this.runExtractFanOut(
        receipts,
        job.business_id,
        job.user_id,
        jobRowId,
      );

      // 4. GL accounts batch (posted receipts only - manifest column 8)
      const postedRawTxIds = receipts
        .filter((r) => r.status === RawTransactionStatus.POSTED)
        .map((r) => r.raw_transaction_id);
      const glAccountsByRawTxId =
        await this.getGlAccountsByRawTxId(postedRawTxIds);

      // 5. Sequential receipt download. Failures here mutate outcomes to
      //    'not_attempted' so the manifest reflects what is/isn't in the zip.
      const buffers = new Map<string, Buffer>();
      for (const r of receipts) {
        try {
          const { url } = await this.documentsService.getDownloadUrl(
            job.business_id,
            r.document_id,
          );
          const response = await fetch(url);
          if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
          }
          const buf = Buffer.from(await response.arrayBuffer());
          buffers.set(r.document_id, buf);
        } catch (err: any) {
          this.logger.warn(
            `Document ${r.document_id} fetch failed at zip-build: ${err?.message ?? err}`,
          );
          outcomes.set(r.document_id, {
            status: 'not_attempted',
            result: null,
          });
        }
      }

      // 6. File path map (collision suffixes per FR-31-13)
      const fileNames = new Map<string, string>();
      const seenPaths = new Set<string>();
      for (const r of receipts) {
        if (!buffers.has(r.document_id)) continue;
        let pathName = this.buildReceiptPath(r);
        let n = 1;
        while (seenPaths.has(pathName)) {
          n++;
          pathName = this.buildReceiptPath(r, n);
        }
        seenPaths.add(pathName);
        fileNames.set(r.document_id, pathName);
      }

      // 7. Manifest CSV (FR-31-14, 15; SRD 7.4)
      const manifestBuf = this.buildManifestCsv(
        receipts,
        outcomes,
        glAccountsByRawTxId,
        fileNames,
        defaultCurrency,
      );

      // 8. Assemble zip
      const zipBuf = await this.buildZip(
        receipts,
        buffers,
        fileNames,
        manifestBuf,
      );

      // 9. Upload to S3 (NFR-31-7)
      const s3Key = `exports/${job.business_id}/${jobRowId}.zip`;
      await this.documentsService.uploadBuffer(
        s3Key,
        zipBuf,
        'application/zip',
      );

      // 10. Tally + complete job row
      const counts = this.tallyOutcomes(outcomes);
      const now = new Date();
      const expiresAt = new Date(
        now.getTime() + ZIP_TTL_DAYS * 24 * 60 * 60 * 1000,
      );

      await this.jobRepo.update(jobRowId, {
        status: ReceiptExportStatus.COMPLETE,
        completed_at: now,
        expires_at: expiresAt,
        download_key: s3Key,
        extracts_completed: counts.completed,
        extracts_failed: counts.failed,
        extracts_cap_exceeded: counts.cap_exceeded,
      });

      this.logger.log(
        `run jobRowId=${jobRowId} complete - receipts=${receipts.length} ` +
          `done=${counts.completed} cap_exceeded=${counts.cap_exceeded} ` +
          `failed=${counts.failed} zip_bytes=${zipBuf.length} key=${s3Key}`,
      );

      // TODO 31b.5: dispatch Resend success email with download link
    } catch (err: any) {
      const errorMessage = String(err?.message ?? err).slice(
        0,
        ERROR_MESSAGE_MAX_LENGTH,
      );
      this.logger.error(
        `run jobRowId=${jobRowId} failed: ${errorMessage}`,
        err?.stack,
      );
      await this.jobRepo.update(jobRowId, {
        status: ReceiptExportStatus.FAILED,
        completed_at: new Date(),
        error_message: errorMessage,
      });
      // TODO 31b.5: dispatch Resend failure email
      throw err; // bubble to BullMQ; attempts:1 means no retry
    }
  }

  // ======================================================================
  // Private helpers - Phase 31b.4
  // ======================================================================

  /**
   * Concurrency-3 fan-out over receipts via promise pool. The local cap
   * counter pre-decrements (fail-closed) before each extract call so the
   * batch never overshoots the cap in a multi-worker race. ExtractorService
   * still records its own ai_usage_log row on confirmed Anthropic success.
   *
   * Failure modes:
   *   - Empty result (S3 / vision / parse fail) -> 'failed'
   *   - 0 < confidence < 0.5                    -> 'low_confidence'
   *   - confidence >= 0.5                       -> 'success'
   *   - Local cap depleted before attempt       -> 'cap_exceeded'
   *   - Document not found (Nest 404 thrown)    -> 'failed'
   */
  private async runExtractFanOut(
    receipts: EnumeratedReceipt[],
    businessId: string,
    userId: string,
    jobRowId: string,
  ): Promise<Map<string, ExtractOutcome>> {
    const outcomes = new Map<string, ExtractOutcome>();
    if (receipts.length === 0) return outcomes;

    const { cap, used } = await this.getCapState(businessId);
    let remaining = Math.max(cap - used, 0);
    let nextIndex = 0;

    const worker = async (): Promise<void> => {
      while (true) {
        const i = nextIndex++;
        if (i >= receipts.length) return;
        const r = receipts[i];

        // Atomic check + pre-decrement (single-threaded JS)
        if (remaining <= 0) {
          outcomes.set(r.document_id, {
            status: 'cap_exceeded',
            result: null,
          });
          continue;
        }
        remaining--;

        try {
          const result = await this.extractorService.extract(
            r.document_id,
            businessId,
            userId,
            jobRowId,
          );

          if (this.isEmptyResult(result)) {
            outcomes.set(r.document_id, { status: 'failed', result: null });
          } else if (result.confidence < LOW_CONFIDENCE_THRESHOLD) {
            outcomes.set(r.document_id, {
              status: 'low_confidence',
              result,
            });
          } else {
            outcomes.set(r.document_id, { status: 'success', result });
          }
        } catch (err: any) {
          this.logger.warn(
            `Extract threw for document ${r.document_id}: ${err?.message ?? err}`,
          );
          outcomes.set(r.document_id, { status: 'failed', result: null });
        }
      }
    };

    const workerCount = Math.min(EXTRACT_CONCURRENCY, receipts.length);
    await Promise.all(
      Array.from({ length: workerCount }, () => worker()),
    );

    return outcomes;
  }

  private isEmptyResult(r: ReceiptExtractResult): boolean {
    return (
      r.confidence === 0 &&
      r.vendor === '' &&
      r.amount === 0 &&
      r.date === '' &&
      r.currency === ''
    );
  }

  /**
   * Batch query for posted journal_lines account names per raw_transaction_id.
   * Manifest column 8 receives all involved account names joined by '; '
   * (debit + credit + tax line accounts as posted). Non-posted receipts get
   * an empty array, which the manifest renders as a blank cell.
   *
   * DB note: accounts.name is the raw column (entity property is account_name
   * via @Column({ name: 'name' })). Raw join uses the DB column directly.
   */
  private async getGlAccountsByRawTxId(
    rawTxIds: string[],
  ): Promise<Map<string, string[]>> {
    const map = new Map<string, string[]>();
    if (rawTxIds.length === 0) return map;

    const rows = await this.classifiedTxRepo
      .createQueryBuilder('ct')
      .innerJoin(
        'journal_lines',
        'jl',
        'jl.journal_entry_id = ct.posted_journal_entry_id',
      )
      .innerJoin('accounts', 'a', 'a.id = jl.account_id')
      .select('ct.raw_transaction_id', 'raw_transaction_id')
      .addSelect('a.name', 'account_name')
      .addSelect('jl.line_number', 'line_number')
      .where('ct.raw_transaction_id IN (:...rawTxIds)', { rawTxIds })
      .andWhere('ct.is_posted = true')
      .andWhere('ct.posted_journal_entry_id IS NOT NULL')
      .orderBy('ct.raw_transaction_id')
      .addOrderBy('jl.line_number', 'ASC')
      .getRawMany<{
        raw_transaction_id: string;
        account_name: string;
        line_number: number;
      }>();

    for (const row of rows) {
      const list = map.get(row.raw_transaction_id) ?? [];
      // Defensive de-dup in case the same account appears twice (e.g. tax
      // line on same account as parent line)
      if (!list.includes(row.account_name)) {
        list.push(row.account_name);
      }
      map.set(row.raw_transaction_id, list);
    }
    return map;
  }

  private tallyOutcomes(outcomes: Map<string, ExtractOutcome>): {
    completed: number;
    failed: number;
    cap_exceeded: number;
  } {
    let completed = 0;
    let failed = 0;
    let cap_exceeded = 0;
    for (const o of outcomes.values()) {
      if (o.status === 'success' || o.status === 'low_confidence') {
        completed++;
      } else if (o.status === 'cap_exceeded') {
        cap_exceeded++;
      } else {
        // 'failed' or 'not_attempted'
        failed++;
      }
    }
    return { completed, failed, cap_exceeded };
  }

  /**
   * FR-31-13 path inside zip: receipts/{tx_date}_{tx_id_short}_{file_name}
   * Collision suffix (_2, _3, ...) inserted before extension when the same
   * derived path was already used. Single underscore; never reaches _1.
   */
  private buildReceiptPath(
    r: EnumeratedReceipt,
    collisionN: number = 1,
  ): string {
    const txDate = this.formatDateOnly(r.transaction_date);
    const txIdShort = r.raw_transaction_id.slice(0, 8);
    let fileName = r.file_name;

    if (collisionN > 1) {
      const dotIdx = fileName.lastIndexOf('.');
      if (dotIdx > 0) {
        fileName =
          fileName.slice(0, dotIdx) +
          `_${collisionN}` +
          fileName.slice(dotIdx);
      } else {
        fileName = `${fileName}_${collisionN}`;
      }
    }

    return `receipts/${txDate}_${txIdShort}_${fileName}`;
  }

  /**
   * Manifest CSV per SRD 7.4 - 19 columns, UTF-8 with BOM, RFC 4180 quoting.
   * Lines separated by CRLF for spreadsheet compatibility.
   */
  private buildManifestCsv(
    receipts: EnumeratedReceipt[],
    outcomes: Map<string, ExtractOutcome>,
    glAccounts: Map<string, string[]>,
    fileNames: Map<string, string>,
    defaultCurrency: string,
  ): Buffer {
    const headers = [
      'document_id',
      'raw_transaction_id',
      'source_account',
      'transaction_date',
      'transaction_amount',
      'transaction_currency',
      'transaction_description',
      'gl_account',
      'business_or_personal',
      'status',
      'extracted_vendor',
      'extracted_amount',
      'extracted_date',
      'extracted_currency',
      'confidence',
      'mismatch_amount',
      'mismatch_date',
      'extract_status',
      'file_path_in_zip',
    ];

    const lines: string[] = [
      headers.map((h) => this.csvEscape(h)).join(','),
    ];

    for (const r of receipts) {
      const outcome =
        outcomes.get(r.document_id) ?? {
          status: 'failed' as ExtractStatus,
          result: null,
        };
      const gl = glAccounts.get(r.raw_transaction_id) ?? [];
      const filePath = fileNames.get(r.document_id) ?? '';

      const txAmount = Number(r.amount);
      const txAbsAmount = Math.abs(txAmount);
      const txCurrency = r.currency_code || defaultCurrency || '';
      const txDate = this.formatDateOnly(r.transaction_date);

      const isExtracted =
        outcome.status === 'success' || outcome.status === 'low_confidence';
      const ext = isExtracted ? outcome.result : null;

      let mismatchAmount = '';
      let mismatchDate = '';
      if (ext && ext.amount > 0 && txAbsAmount > 0) {
        mismatchAmount =
          Math.abs(ext.amount - txAbsAmount) > AMOUNT_MISMATCH_TOLERANCE
            ? 'true'
            : 'false';
      }
      if (ext && ext.date && txDate) {
        mismatchDate = ext.date !== txDate ? 'true' : 'false';
      }

      const row = [
        r.document_id,
        r.raw_transaction_id,
        r.source_account_name ?? '',
        txDate,
        Number.isFinite(txAmount) ? txAmount.toFixed(2) : '',
        txCurrency,
        r.description ?? '',
        gl.join('; '),
        'business',
        r.status,
        ext?.vendor ?? '',
        ext && ext.amount != null ? ext.amount.toFixed(2) : '',
        ext?.date ?? '',
        ext?.currency ?? '',
        ext && ext.confidence != null ? ext.confidence.toFixed(2) : '',
        mismatchAmount,
        mismatchDate,
        outcome.status,
        filePath,
      ].map((v) => this.csvEscape(String(v ?? '')));

      lines.push(row.join(','));
    }

    const csvBody = lines.join('\r\n');
    const bom = Buffer.from([0xef, 0xbb, 0xbf]);
    return Buffer.concat([bom, Buffer.from(csvBody, 'utf8')]);
  }

  private csvEscape(value: string): string {
    if (
      value.includes(',') ||
      value.includes('"') ||
      value.includes('\n') ||
      value.includes('\r')
    ) {
      return `"${value.replace(/"/g, '""')}"`;
    }
    return value;
  }

  /** Coerce Date or 'YYYY-MM-DD' string to ISO date-only ('YYYY-MM-DD'). */
  private formatDateOnly(d: Date | string): string {
    if (typeof d === 'string') {
      return d.length >= 10 ? d.slice(0, 10) : d;
    }
    if (d instanceof Date && !Number.isNaN(d.getTime())) {
      return d.toISOString().slice(0, 10);
    }
    return '';
  }

  /**
   * Build complete zip Buffer in memory. Per Decision B (approved), buffered
   * upload is acceptable up to the 500-receipt cap. Streaming-to-S3 via
   * @aws-sdk/lib-storage is deferred.
   *
   * Compression level 9 - max compression. Receipts are mostly already
   * compressed (PDF/JPG/PNG) so wall-clock impact is small but storage
   * savings on the manifest and any large PDFs are worth it.
   */
  private async buildZip(
    receipts: EnumeratedReceipt[],
    buffers: Map<string, Buffer>,
    fileNames: Map<string, string>,
    manifestBuf: Buffer,
  ): Promise<Buffer> {
    return new Promise<Buffer>((resolve, reject) => {
      const archive = archiver('zip', { zlib: { level: 9 } });
      const chunks: Buffer[] = [];

      archive.on('data', (chunk: Buffer) => chunks.push(chunk));
      archive.on('end', () => resolve(Buffer.concat(chunks)));
      archive.on('error', reject);
      archive.on('warning', (err: any) => {
        if (err?.code !== 'ENOENT') reject(err);
      });

      // Manifest at zip root
      archive.append(manifestBuf, { name: 'manifest.csv' });

      // Receipts in receipts/ subdirectory
      for (const r of receipts) {
        const buf = buffers.get(r.document_id);
        const path = fileNames.get(r.document_id);
        if (!buf || !path) continue;
        archive.append(buf, { name: path });
      }

      archive.finalize().catch(reject);
    });
  }
}
