import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { INVOICE_REMINDER_QUEUE } from './invoice-reminder.processor';

@Injectable()
export class InvoiceReminderJob implements OnModuleInit {
  private readonly logger = new Logger(InvoiceReminderJob.name);

  constructor(
    @InjectQueue(INVOICE_REMINDER_QUEUE)
    private readonly queue: Queue,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.queue.add(
      'daily-invoice-check',
      {},
      {
        repeat:           { pattern: '0 8 * * *' }, // Daily at 08:00 UTC
        removeOnComplete: 10,
        removeOnFail:     5,
      },
    );
    this.logger.log('Invoice reminder CRON registered — daily at 08:00 UTC');
  }
}
