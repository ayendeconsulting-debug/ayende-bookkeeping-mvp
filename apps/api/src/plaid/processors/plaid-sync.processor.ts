import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Job } from 'bullmq';
import { PlaidService } from '../services/plaid.service';
import { PlaidWebhookLog, WebhookProcessingStatus } from '../../entities/plaid-webhook-log.entity';
import { PlaidItem } from '../../entities/plaid-item.entity';
import { CurrencyService } from '../../currency/currency.service';
import { ClassificationService } from '../../reports/services/classification.service';
import { PersonalService } from '../../personal/personal.service';
import { BusinessesService } from '../../businesses/businesses.service';
import { ExpoPushService } from '../../notifications/expo-push.service';

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
    private readonly classificationService: ClassificationService,
    private readonly personalService: PersonalService,
    @InjectRepository(PlaidWebhookLog)
    private webhookLogRepo: Repository<PlaidWebhookLog>,
    @InjectRepository(PlaidItem)
    private plaidItemRepo: Repository<PlaidItem>,
    private readonly dataSource: DataSource,
    private readonly businessesService: BusinessesService,
    private readonly expoPushService: ExpoPushService,
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

      if (result.added > 0 || result.modified > 0) {
        // Step 2: Look up business_id and mode
        const plaidItem = await this.plaidItemRepo.findOne({
          where: { id: plaidItemId },
        });

        if (plaidItem?.business_id) {
          const businessId = plaidItem.business_id;

          // Step 3: Convert foreign currency transactions
          try {
            const converted = await this.currencyService.convertPendingTransactions(businessId);
            if (converted > 0) {
              this.logger.log(
                `Currency conversion: ${converted} foreign transactions converted for business ${businessId}`,
              );
            }
          } catch (currencyErr: any) {
            this.logger.warn(`Currency conversion skipped for job ${job.id}: ${currencyErr.message}`);
          }

          // Step 4: Auto-classify newly added transactions
          if (result.added > 0) {
            try {
              // Look up business mode
              const bizRows = await this.dataSource.query(
                `SELECT mode FROM businesses WHERE id = $1 LIMIT 1`,
                [businessId],
              );
              const mode: string = bizRows[0]?.mode ?? 'business';

              if (mode === 'personal') {
                // Personal mode -- run budget category rules
                const personalResult = await this.personalService.runPersonalRules(businessId);
                if (personalResult.matched > 0) {
                  this.logger.log(
                    `Auto-classify (personal): ${personalResult.matched} transactions matched for business ${businessId}`,
                  );
                }
              } else {
                // Business or freelancer mode -- run chart-of-accounts classification rules
                const batchResult = await this.classificationService.runBatchRules(businessId);
                if (batchResult.classified > 0) {
                  this.logger.log(
                    `Auto-classify (${mode}): ${batchResult.classified}/${batchResult.total} transactions classified for business ${businessId}`,
                  );
                }
              }
            } catch (classifyErr: any) {
              // Non-fatal -- log and continue
              this.logger.warn(
                `Auto-classification skipped for job ${job.id}: ${classifyErr.message}`,
              );
            }

            // Step 5: Send push notification to the business owner
            // Gated on result.added > 0 -- modifications don't count as "new
            // work to classify" (usually just pending-to-posted transitions).
            try {
              const business = await this.businessesService.findById(businessId);
              if (business.expo_push_token) {
                const plural = result.added === 1 ? '' : 's';
                void this.expoPushService.send([{
                  to: business.expo_push_token,
                  title: 'Tempo Books',
                  body: `${result.added} new transaction${plural} ready to classify.`,
                  data: { type: 'transaction_sync', count: result.added },
                  sound: 'default',
                  _businessId: business.id,
                }]);
              }
            } catch (pushErr: any) {
              this.logger.warn(
                `Push for sync job ${job.id} skipped: ${pushErr?.message ?? pushErr}`,
              );
            }
          }
        }
      }

      // Step 6: Update webhook log to processed
      if (webhookLogId) {
        await this.webhookLogRepo.update(webhookLogId, {
          status: WebhookProcessingStatus.PROCESSED,
          processed_at: new Date(),
        });
      }
    } catch (error: any) {
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
