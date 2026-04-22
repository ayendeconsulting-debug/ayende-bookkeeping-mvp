import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bullmq';
import { PlaidController } from './controllers/plaid.controller';
import { PlaidService } from './services/plaid.service';
import { PlaidSyncProcessor } from './processors/plaid-sync.processor';
import { PlaidItem } from '../entities/plaid-item.entity';
import { PlaidAccount } from '../entities/plaid-account.entity';
import { PlaidSyncCursor } from '../entities/plaid-sync-cursor.entity';
import { PlaidWebhookLog } from '../entities/plaid-webhook-log.entity';
import { RawTransaction } from '../entities/raw-transaction.entity';
import { ReportsModule } from '../reports/reports.module';
import { PersonalModule } from '../personal/personal.module';
import { BusinessesModule } from '../businesses/businesses.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      PlaidItem,
      PlaidAccount,
      PlaidSyncCursor,
      PlaidWebhookLog,
      RawTransaction,
    ]),
    BullModule.registerQueue({
      name: 'plaid-sync',
    }),
    ReportsModule,
    PersonalModule,
    BusinessesModule,
    NotificationsModule,
  ],
  controllers: [PlaidController],
  providers: [PlaidService, PlaidSyncProcessor],
  exports: [PlaidService],
})
export class PlaidModule {}
