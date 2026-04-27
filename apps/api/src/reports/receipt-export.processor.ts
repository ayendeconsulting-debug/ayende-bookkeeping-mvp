import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { ReceiptExportService } from './services/receipt-export.service';
import {
  RECEIPT_EXPORT_QUEUE,
  ReceiptExportJobData,
} from './receipt-export.constants';

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