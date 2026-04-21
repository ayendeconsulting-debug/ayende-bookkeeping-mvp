import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Business } from '../entities/business.entity';
import { Subscription } from '../entities/subscription.entity';
import { RawTransaction } from '../entities/raw-transaction.entity';
import { AccountantFirm } from '../entities/accountant-firm.entity';
import { FirmStaff } from '../entities/firm-staff.entity';
import { FirmClient } from '../entities/firm-client.entity';
import { ReferralPartner } from '../entities/referral-partner.entity';
import { ReferralEvent } from '../entities/referral-event.entity';
import { ReferralCommission } from '../entities/referral-commission.entity';
import { Account } from '../entities/account.entity';
import { JournalEntry } from '../entities/journal-entry.entity';
import { JournalLine } from '../entities/journal-line.entity';
import { ClassifiedTransaction } from '../entities/classified-transaction.entity';
import { BusinessesModule } from '../businesses/businesses.module';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { AdminGuard } from './admin.guard';
import { InsightsController } from './insights.controller';
import { InsightsService } from './insights.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Business,
      Subscription,
      RawTransaction,
      AccountantFirm,
      FirmStaff,
      FirmClient,
      ReferralPartner,
      ReferralEvent,
      ReferralCommission,
      Account,
      JournalEntry,
      JournalLine,
      ClassifiedTransaction,
    ]),
    BusinessesModule,
  ],
  controllers: [AdminController, InsightsController],
  providers: [AdminService, AdminGuard, InsightsService],
})
export class AdminModule {}
