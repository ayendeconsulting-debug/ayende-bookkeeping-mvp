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
import { ArApRecord } from '../entities/ar-ap-record.entity';
// Phase 9
import { ProvincialTaxConfig } from '../entities/provincial-tax-config.entity';
import { HstPeriod } from '../entities/hst-period.entity';
import { Business } from '../entities/business.entity';

// Controllers
import { TaxController } from './controllers/tax.controller';
import { ClassificationController } from './controllers/classification.controller';
import { ReportsController } from './controllers/reports.controller';
import { ArApController } from './controllers/ar-ap.controller';
import { HstController } from './controllers/hst.controller';

// Services
import { TaxService } from './services/tax.service';
import { ClassificationService } from './services/classification.service';
import { IncomeStatementService } from './services/income-statement.service';
import { BalanceSheetService } from './services/balance-sheet.service';
import { TrialBalanceService } from './services/trial-balance.service';
import { GeneralLedgerService } from './services/general-ledger.service';
import { ExportService } from './services/export.service';
import { ArApService } from './services/ar-ap.service';
import { SparklineService } from './services/sparkline.service';
// Phase 9
import { ProvinceConfigService } from './services/province-config.service';
import { HstPeriodService } from './services/hst-period.service';
import { ItcService } from './services/itc.service';
import { HstReportService } from './services/hst-report.service';
import { HstExportService } from './services/hst-export.service';

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
      ArApRecord,
      // Phase 9
      ProvincialTaxConfig,
      HstPeriod,
      Business, // needed by HstController for export business name/HST number
    ]),
  ],
  controllers: [
    TaxController,
    ClassificationController,
    ReportsController,
    ArApController,
    HstController,
  ],
  providers: [
    TaxService,
    ClassificationService,
    IncomeStatementService,
    BalanceSheetService,
    TrialBalanceService,
    GeneralLedgerService,
    ExportService,
    ArApService,
    SparklineService,
    // Phase 9
    ProvinceConfigService,
    HstPeriodService,
    ItcService,
    HstReportService,
    HstExportService,
  ],
  exports: [
    IncomeStatementService,
    BalanceSheetService,
    TrialBalanceService,
    GeneralLedgerService,
    // Phase 9
    ProvinceConfigService,
    HstPeriodService,
    ItcService,
    HstReportService,
    HstExportService,
  ],
})
export class ReportsModule {}
