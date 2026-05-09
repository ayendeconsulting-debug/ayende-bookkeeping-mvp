import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bullmq';
import { ImportController } from './import.controller';
import { ImportService } from './import.service';
import { ImportJobsProcessor } from './import-jobs.processor';
import { ImportBatch } from '../entities/import-batch.entity';
import { RawTransaction } from '../entities/raw-transaction.entity';
import { Account } from '../entities/account.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([ImportBatch, RawTransaction, Account]),
    BullModule.registerQueue({ name: 'import-jobs' }),
    // Phase 34e: producer-only registration — SmartMatchModule owns the consumer
    BullModule.registerQueue({ name: 'smart-match-batch' }),
  ],
  controllers: [ImportController],
  providers: [ImportService, ImportJobsProcessor],
  exports: [ImportService],
})
export class ImportModule {}