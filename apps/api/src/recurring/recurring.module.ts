import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bullmq';
import { RecurringTransaction } from '../entities/recurring-transaction.entity';
import { JournalEntry } from '../entities/journal-entry.entity';
import { JournalLine } from '../entities/journal-line.entity';
import { Account } from '../entities/account.entity';
// Phase 12: detection engine needs raw transactions + business settings
import { RawTransaction } from '../entities/raw-transaction.entity';
import { Business } from '../entities/business.entity';
import { RecurringController } from './recurring.controller';
import { RecurringService } from './recurring.service';
import { RecurringProcessor } from './recurring.processor';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      RecurringTransaction,
      JournalEntry,
      JournalLine,
      Account,
      RawTransaction,
      Business,
    ]),
    BullModule.registerQueue({
      name: 'recurring-transactions',
    }),
  ],
  controllers: [RecurringController],
  providers: [RecurringService, RecurringProcessor],
  exports: [RecurringService],
})
export class RecurringModule {}
