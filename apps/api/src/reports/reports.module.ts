import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

// Entities
import { TaxCode } from '../entities/tax-code.entity';
import { TaxTransaction } from '../entities/tax-transaction.entity';
import { ClassifiedTransaction } from '../entities/classified-transaction.entity';
import { ClassificationRule } from '../entities/classification-rule.entity';
import { TransactionSplit } from '../entities/transaction-split.entity';
import { FiscalYear } from '../entities/fiscal-year.entity';
import { ImportBatch } from '../entities/import-batch.entity';
import { AuditLog } from '../entities/audit-log.entity';
import { Account } from '../entities/account.entity';
import { JournalEntry } from '../entities/journal-entry.entity';
import { JournalLine } from '../entities/journal-line.entity';
import { RawTransaction } from '../entities/raw-transaction.entity';

// Controllers
import { TaxController } from './controllers/tax.controller';
import { ClassificationController } from './controllers/classification.controller';
import { ReportsController } from './controllers/reports.controller';

// Services
import { TaxService } from './services/tax.service';
import { ClassificationService } from './services/classification.service';
import { IncomeStatementService } from './services/income-statement.service';
import { BalanceSheetService } from './services/balance-sheet.service';
import { TrialBalanceService } from './services/trial-balance.service';
import { GeneralLedgerService } from './services/general-ledger.service';
import { ExportService } from './services/export.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      TaxCode,
      TaxTransaction,
      ClassifiedTransaction,
      ClassificationRule,
      TransactionSplit,
      FiscalYear,
      ImportBatch,
      AuditLog,
      Account,
      JournalEntry,
      JournalLine,
      RawTransaction,
    ]),
  ],
  controllers: [TaxController, ClassificationController, ReportsController],
  providers: [
    TaxService,
    ClassificationService,
    IncomeStatementService,
    BalanceSheetService,
    TrialBalanceService,
    GeneralLedgerService,
    ExportService,
  ],
  exports: [
    IncomeStatementService,
    BalanceSheetService,
    TrialBalanceService,
    GeneralLedgerService,
  ],
})
export class ReportsModule {}
