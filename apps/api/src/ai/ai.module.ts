import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bullmq';
// Entities
import { RawTransaction } from '../entities/raw-transaction.entity';
import { ClassifiedTransaction } from '../entities/classified-transaction.entity';
import { Account } from '../entities/account.entity';
import { TaxCode } from '../entities/tax-code.entity';
import { JournalLine } from '../entities/journal-line.entity';
import { JournalEntry } from '../entities/journal-entry.entity';
import { Business } from '../entities/business.entity';
import { AiUsageLog } from '../entities/ai-usage-log.entity';
import { Subscription } from '../entities/subscription.entity';
// Controller
import { AiController } from './controllers/ai.controller';
// Services
import { LlmService } from './services/llm.service';
import { ClassificationAiService } from './services/classification-ai.service';
import { AnomalyService } from './services/anomaly.service';
import { NarrativeService } from './services/narrative.service';
import { ChatService } from './services/chat.service';
import { ExplainerService } from './services/explainer.service';
import { YearEndService } from './services/year-end.service';
import { YearEndExportService } from './services/year-end-export.service';
// Async jobs
import { AiJobsProcessor, AI_JOBS_QUEUE } from './ai-jobs.processor';
import { AiJobsService } from './ai-jobs.service';
// Guard
import { AiUsageGuard } from './ai-usage.guard';
// NarrativeService depends on report services — import from ReportsModule exports
import { ReportsModule } from '../reports/reports.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      RawTransaction,
      ClassifiedTransaction,
      Account,
      TaxCode,
      JournalLine,
      JournalEntry,
      Business,
      AiUsageLog,
      Subscription,
    ]),
    BullModule.registerQueue({ name: AI_JOBS_QUEUE }),
    ReportsModule, // provides IncomeStatementService + BalanceSheetService + PdfJobsService
  ],
  controllers: [AiController],
  providers: [
    LlmService,
    ClassificationAiService,
    AnomalyService,
    NarrativeService,
    ChatService,
    ExplainerService,
    YearEndService,
    YearEndExportService,
    AiJobsProcessor,
    AiJobsService,
    AiUsageGuard,
  ],
  exports: [AiJobsService, AiUsageGuard, YearEndExportService],
})
export class AiModule {}
