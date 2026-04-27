import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { InjectRepository } from '@nestjs/typeorm';
import { Queue } from 'bullmq';
import { Repository } from 'typeorm';
import {
  ReceiptExportJob,
  ReceiptExportStatus,
} from '../../entities/receipt-export-job.entity';
import { Subscription } from '../../entities/subscription.entity';
import {
  RECEIPT_EXPORT_QUEUE,
  ReceiptExportJobData,
} from '../receipt-export.processor';
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

const ZIP_TTL_DAYS = 7;

@Injectable()
export class ReceiptExportService {
  private readonly logger = new Logger(ReceiptExportService.name);

  constructor(
    @InjectRepository(ReceiptExportJob)
    private readonly jobRepo: Repository<ReceiptExportJob>,
    @InjectRepository(Subscription)
    private readonly subscriptionRepo: Repository<Subscription>,
    @InjectQueue(RECEIPT_EXPORT_QUEUE)
    private readonly exportQueue: Queue<ReceiptExportJobData>,
  ) {}

  /**
   * Phase 31b.2 - SKELETON.
   * TODO 31b.3: enumerate receipts, count existing extracts, compute AI cap delta.
   */
  async preflight(
    businessId: string,
    startDate: string,
    endDate: string,
  ): Promise<PreflightResult> {
    this.logger.debug(
      `preflight (skeleton) businessId=${businessId} ${startDate} -> ${endDate}`,
    );
    return {
      receipts_found: 0,
      receipts_with_extract: 0,
      receipts_needing_extract: 0,
      ai_cap_remaining: 0,
      ai_cap_exceeded_by: 0,
      business_plan: 'pro',
    };
  }

  /**
   * Phase 31b.2 - SKELETON.
   * Creates a receipt_export_jobs row and enqueues a BullMQ job. The full
   * preflight + active-job-conflict checks land in 31b.3.
   * TODO 31b.3: enforce single-active-per-business, range/count caps,
   * 409 on cap-exceeded without acknowledge_partial.
   */
  async submit(
    businessId: string,
    userId: string,
    dto: ReceiptExportSubmitDto,
  ): Promise<SubmitResult> {
    this.logger.debug(
      `submit (skeleton) businessId=${businessId} userId=${userId} ${dto.startDate} -> ${dto.endDate}`,
    );

    const row = await this.jobRepo.save(
      this.jobRepo.create({
        business_id: businessId,
        user_id: userId,
        status: ReceiptExportStatus.QUEUED,
        start_date: new Date(dto.startDate),
        end_date: new Date(dto.endDate),
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

    return {
      job_id: row.id,
      status: row.status,
      receipts_total: row.receipts_total,
      extracts_required: row.extracts_required,
      cap_partial: false,
    };
  }

  /**
   * Phase 31b.2 - SKELETON.
   * Marks the job complete with a 7-day expiry. No real work yet.
   * TODO 31b.4: enumerate receipts, fan out receipt_extract child jobs,
   * assemble zip with archiver, upload to S3 via DocumentsService.uploadBuffer,
   * write download_key, dispatch Resend email.
   */
  async run(jobRowId: string): Promise<void> {
    this.logger.log(`run (skeleton) jobRowId=${jobRowId}`);

    await this.jobRepo.update(jobRowId, {
      status: ReceiptExportStatus.RUNNING,
    });

    const now = new Date();
    const expiresAt = new Date(now.getTime() + ZIP_TTL_DAYS * 24 * 60 * 60 * 1000);

    await this.jobRepo.update(jobRowId, {
      status: ReceiptExportStatus.COMPLETE,
      completed_at: now,
      expires_at: expiresAt,
    });

    this.logger.log(`run (skeleton) jobRowId=${jobRowId} marked complete`);
  }
}