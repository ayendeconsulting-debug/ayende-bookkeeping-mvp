import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { TRIAL_MONITOR_QUEUE } from './trial-monitor.processor';

@Injectable()
export class TrialMonitorJob implements OnModuleInit {
  private readonly logger = new Logger(TrialMonitorJob.name);

  constructor(
    @InjectQueue(TRIAL_MONITOR_QUEUE)
    private readonly queue: Queue,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.queue.add(
      'daily-trial-check',
      {},
      {
        repeat:          { pattern: '0 9 * * *' }, // Daily at 09:00 UTC
        removeOnComplete: 10,
        removeOnFail:     5,
      },
    );
    this.logger.log('Trial monitor CRON registered â€” daily at 09:00 UTC');
  }
}

