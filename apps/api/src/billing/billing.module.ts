import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bullmq';
import { Subscription } from '../entities/subscription.entity';
import { AccountantFirm } from '../entities/accountant-firm.entity';
import { FirmClient } from '../entities/firm-client.entity';
import { FirmStaff } from '../entities/firm-staff.entity';
import { BillingService } from './billing.service';
import { BillingController } from './billing.controller';
import { AccountantBillingProcessor, ACCOUNTANT_BILLING_QUEUE } from './accountant-billing.processor';
import { AccountantBillingJob } from './accountant-billing.job';
import { EmailModule } from '../email/email.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Subscription,
      AccountantFirm,
      FirmClient,
      FirmStaff,
    ]),
    BullModule.registerQueue({ name: ACCOUNTANT_BILLING_QUEUE }),
    EmailModule,
  ],
  controllers: [BillingController],
  providers: [
    BillingService,
    AccountantBillingProcessor,
    AccountantBillingJob,
  ],
  exports: [BillingService],
})
export class BillingModule {}
