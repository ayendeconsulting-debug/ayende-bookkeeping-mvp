import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Job } from 'bullmq';
import { PlaidService } from '../services/plaid.service';
import { PlaidWebhookLog, WebhookProcessingStatus } from '../../entities/plaid-webhook-log.entity';
import { PlaidItem } from '../../entities/plaid-item.entity';
import { CurrencyService } from '../../currency/currency.service';

export interface PlaidSyncJobData {
  plaidItemId: string;
  webhookLogId?: string;
}

@Processor('plaid-sync')
export class PlaidSyncProcessor extends WorkerHost {
  private readonly logger = new Logger(PlaidSyncProcessor.name);

  constructor(
    private readonly plaidService: PlaidService,
    private readonly currencyService: CurrencyService,
    @InjectRepository(PlaidWebhookLog)
    private webhookLogRepo: Repository<PlaidWebhookLog>,
    @InjectRepository(PlaidItem)
    private plaidItemRepo: Repository<PlaidItem>,
  ) {
    super();
  }

  async process(job: Job<PlaidSyncJobData>): Promise<void> {
    const { plaidItemId, webhookLogId } = job.data;
    this.logger.log(`Processing sync job ${job.id} for plaid item ${plaidItemId}`);

    try {
      // Step 1: Sync transactions from Plaid
      const result = await this.plaidService.syncTransactions(plaidItemId);
      this.logger.log(
        `Sync job ${job.id} complete: +${result.added} ~${result.modified} -${result.removed}`,
      );

      // Step 2: Convert any newly synced foreign currency transactions
      if (result.added > 0 || result.modified > 0) {
        try {
          const plaidItem = await this.plaidItemRepo.findOne({
            where: { item_id: plaidItemId },
          });

          if (plaidItem?.business_id) {
            const converted = await this.currencyService.convertPendingTransactions(
              plaidItem.business_id,
            );
            if (converted > 0) {
              this.logger.log(
                `Currency conversion: ${converted} foreign transactions converted for business ${plaidItem.business_id}`,
              );
            }
          }
        } catch (currencyErr) {
          // Non-fatal — log and continue
          this.logger.warn(
            `Currency conversion skipped for job ${job.id}: ${currencyErr.message}`,
          );
        }
      }

      // Step 3: Update webhook log to processed
      if (webhookLogId) {
        await this.webhookLogRepo.update(webhookLogId, {
          status: WebhookProcessingStatus.PROCESSED,
          processed_at: new Date(),
        });
      }
    } catch (error) {
      this.logger.error(`Sync job ${job.id} failed: ${error.message}`, error.stack);

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
