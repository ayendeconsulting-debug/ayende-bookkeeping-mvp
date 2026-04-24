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
import { ReferralsModule } from '../referrals/referrals.module';
import { BusinessesModule } from '../businesses/businesses.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { APP_GUARD } from '@nestjs/core';
import { BillingGuard } from './billing.guard';

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
    ReferralsModule,
    BusinessesModule,
    NotificationsModule,
  ],
  controllers: [BillingController],
  providers: [
    BillingService,
    BillingAlertService,
    AccountantBillingProcessor,
    AccountantBillingJob,
    TrialMonitorProcessor,
    TrialMonitorJob,
    // Phase 27.2 A-4: register BillingGuard globally via APP_GUARD
    {
      provide: APP_GUARD,
      useClass: BillingGuard,
    },
  ],
  exports: [BillingService, BillingAlertService],
})
export class BillingModule {}
