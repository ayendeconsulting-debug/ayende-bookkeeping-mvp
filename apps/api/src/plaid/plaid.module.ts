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

// Phase 12: import ReportsModule to access ClassificationService
import { ReportsModule } from '../reports/reports.module';

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
    // Phase 12: provides ClassificationService for auto-classification on sync
    ReportsModule,
  ],
  controllers: [PlaidController],
  providers: [PlaidService, PlaidSyncProcessor],
  exports: [PlaidService],
})
export class PlaidModule {}
