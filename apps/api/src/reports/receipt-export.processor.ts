import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { ReceiptExportService } from './services/receipt-export.service';

export const RECEIPT_EXPORT_QUEUE = 'receipt-exports';

/**
 * Phase 31b.2 - BullMQ payload for receipt export jobs.
 *
 * The processor reads everything else from the receipt_export_jobs row
 * via jobRowId, so the queue payload stays minimal. Source of truth for
 * job state is the database row, not the BullMQ payload.
 */
export interface ReceiptExportJobData {
  jobRowId: string;
}

@Processor(RECEIPT_EXPORT_QUEUE)
export class ReceiptExportProcessor extends WorkerHost {
  private readonly logger = new Logger(ReceiptExportProcessor.name);

  constructor(private readonly receiptExportService: ReceiptExportService) {
    super();
  }

  async process(job: Job<ReceiptExportJobData>): Promise<void> {
    this.logger.log(
      `Processing receipt-export job ${job.id} jobRowId=${job.data.jobRowId}`,
    );
    await this.receiptExportService.run(job.data.jobRowId);
    this.logger.log(`Receipt-export job ${job.id} complete`);
  }
}