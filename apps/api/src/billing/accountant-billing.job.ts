import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { ACCOUNTANT_BILLING_QUEUE, AccountantBillingJobData } from './accountant-billing.processor';

@Injectable()
export class AccountantBillingJob implements OnModuleInit {
  private readonly logger = new Logger(AccountantBillingJob.name);

  constructor(
    @InjectQueue(ACCOUNTANT_BILLING_QUEUE)
    private readonly billingQueue: Queue<AccountantBillingJobData>,
  ) {}

  async onModuleInit(): Promise<void> {
    // Remove any stale repeatable jobs before re-registering
    const repeatableJobs = await this.billingQueue.getRepeatableJobs();
    for (const job of repeatableJobs) {
      if (job.name === 'monthly-metered-billing') {
        await this.billingQueue.removeRepeatableByKey(job.key);
        this.logger.log('Removed stale repeatable billing job');
      }
    }

    // Fire on days 28–31 at 22:00 UTC — processor guards on last-day-of-month
    await this.billingQueue.add(
      'monthly-metered-billing',
      { yearMonth: this.getCurrentYearMonth() },
      {
        repeat: {
          // Runs at 22:00 UTC on days 28, 29, 30, 31
          pattern: '0 22 28-31 * *',
        },
        removeOnComplete: 10,
        removeOnFail: 5,
      },
    );

    this.logger.log('Accountant metered billing CRON job registered (22:00 UTC, days 28-31)');
  }

  private getCurrentYearMonth(): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    return `${year}-${month}`;
  }
}
