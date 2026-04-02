import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bullmq';
import { RecurringTransaction } from '../entities/recurring-transaction.entity';
import { JournalEntry } from '../entities/journal-entry.entity';
import { JournalLine } from '../entities/journal-line.entity';
import { RecurringController } from './recurring.controller';
import { RecurringService } from './recurring.service';
import { RecurringProcessor } from './recurring.processor';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      RecurringTransaction,
      JournalEntry,
      JournalLine,
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
