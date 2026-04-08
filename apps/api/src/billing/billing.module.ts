import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bullmq';
import { Subscription } from '../entities/subscription.entity';
import { AccountantFirm } from '../entities/accountant-firm.entity';
import { FirmClient } from '../entities/firm-client.entity';
import { FirmStaff } from '../entities/firm-staff.entity';
import { AiUsageLog } from '../entities/ai-usage-log.entity';
import { BillingService } from './billing.service';
import { BillingAlertService } from './billing-alert.service';
import { BillingController } from './billing.controller';
import { AccountantBillingProcessor, ACCOUNTANT_BILLING_QUEUE } from './accountant-billing.processor';
import { AccountantBillingJob } from './accountant-billing.job';
import { TrialMonitorProcessor, TRIAL_MONITOR_QUEUE } from './trial-monitor.processor';
import { TrialMonitorJob } from './trial-monitor.job';
import { EmailModule } from '../email/email.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Subscription,
      AccountantFirm,
      FirmClient,
      FirmStaff,
      AiUsageLog,
    ]),
    BullModule.registerQueue(
      { name: ACCOUNTANT_BILLING_QUEUE },
      { name: TRIAL_MONITOR_QUEUE },
    ),
    EmailModule,
  ],
  controllers: [BillingController],
  providers: [
    BillingService,
    BillingAlertService,
    AccountantBillingProcessor,
    AccountantBillingJob,
    TrialMonitorProcessor,
    TrialMonitorJob,
  ],
  exports: [BillingService, BillingAlertService],
})
export class BillingModule {}

