import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Account } from '../entities/account.entity';
import { JournalEntry } from '../entities/journal-entry.entity';
import { JournalLine } from '../entities/journal-line.entity';
import { Business } from '../entities/business.entity';
import { User } from '../entities/user.entity';
import { AccountService } from './services/account.service';
import { JournalEntryService } from './services/journal-entry.service';
import { LedgerService } from './services/ledger.service';
import { AccountController } from './controllers/account.controller';
import { JournalEntryController } from './controllers/journal-entry.controller';
import { LedgerController } from './controllers/ledger.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Account, JournalEntry, JournalLine, Business, User])],
  controllers: [AccountController, JournalEntryController, LedgerController],
  providers: [AccountService, JournalEntryService, LedgerService],
  exports: [AccountService, JournalEntryService, LedgerService],
})
export class AccountingModule {}
