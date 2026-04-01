import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Job } from 'bullmq';
import { PlaidService } from '../services/plaid.service';
import { PlaidWebhookLog, WebhookProcessingStatus } from '../../entities/plaid-webhook-log.entity';

export interface PlaidSyncJobData {
  plaidItemId: string;
  webhookLogId?: string;
}

@Processor('plaid-sync')
export class PlaidSyncProcessor extends WorkerHost {
  private readonly logger = new Logger(PlaidSyncProcessor.name);

  constructor(
    private readonly plaidService: PlaidService,

    @InjectRepository(PlaidWebhookLog)
    private webhookLogRepo: Repository<PlaidWebhookLog>,
  ) {
    super();
  }

  async process(job: Job<PlaidSyncJobData>): Promise<void> {
    const { plaidItemId, webhookLogId } = job.data;
    this.logger.log(`Processing sync job ${job.id} for plaid item ${plaidItemId}`);

    try {
      const result = await this.plaidService.syncTransactions(plaidItemId);

      this.logger.log(
        `Sync job ${job.id} complete: +${result.added} ~${result.modified} -${result.removed}`,
      );

      // Update webhook log to processed
      if (webhookLogId) {
        await this.webhookLogRepo.update(webhookLogId, {
          status: WebhookProcessingStatus.PROCESSED,
          processed_at: new Date(),
        });
      }
    } catch (error) {
      this.logger.error(`Sync job ${job.id} failed: ${error.message}`, error.stack);

      // Update webhook log to failed
      if (webhookLogId) {
        await this.webhookLogRepo.update(webhookLogId, {
          status: WebhookProcessingStatus.FAILED,
          error_message: error.message,
        });
      }

      throw error; // Re-throw so BullMQ retries
    }
  }
}
