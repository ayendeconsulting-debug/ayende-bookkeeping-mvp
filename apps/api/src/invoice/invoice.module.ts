import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bullmq';
import { Invoice } from '../entities/invoice.entity';
import { InvoiceLineItem } from '../entities/invoice-line-item.entity';
import { Account } from '../entities/account.entity';
import { TaxCode } from '../entities/tax-code.entity';
import { JournalEntry } from '../entities/journal-entry.entity';
import { JournalLine } from '../entities/journal-line.entity';
import { InvoiceController } from './invoice.controller';
import { InvoiceService } from './invoice.service';
import { InvoiceReminderProcessor, INVOICE_REMINDER_QUEUE } from './invoice-reminder.processor';
import { InvoiceReminderJob } from './invoice-reminder.job';
import { EmailModule } from '../email/email.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Invoice,
      InvoiceLineItem,
      Account,
      TaxCode,
      JournalEntry,
      JournalLine,
    ]),
    BullModule.registerQueue({ name: INVOICE_REMINDER_QUEUE }),
    EmailModule,
  ],
  controllers: [InvoiceController],
  providers: [
    InvoiceService,
    InvoiceReminderProcessor,
    InvoiceReminderJob,
  ],
  exports: [InvoiceService],
})
export class InvoiceModule {}
