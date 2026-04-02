import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { RecurringService } from './recurring.service';

/**
 * RecurringProcessor
 *
 * Processes the 'process-due' job on the 'recurring-transactions' queue.
 * Triggered daily at midnight via BullMQ repeat schedule set in RecurringService.onModuleInit().
 *
 * Finds all ACTIVE recurring templates with next_run_date <= today,
 * posts a journal entry for each, and advances next_run_date.
 */
@Processor('recurring-transactions')
export class RecurringProcessor extends WorkerHost {
  private readonly logger = new Logger(RecurringProcessor.name);

  constructor(private readonly recurringService: RecurringService) {
    super();
  }

  async process(job: Job<any>): Promise<any> {
    if (job.name === 'process-due') {
      this.logger.log('Processing due recurring transactions...');
      const result = await this.recurringService.processDueTemplates();
      this.logger.log(`Done: ${result.processed} posted, ${result.failed} failed`);
      return result;
    }
  }
}
