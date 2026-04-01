import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

// Entities
import { RawTransaction } from '../entities/raw-transaction.entity';
import { Account } from '../entities/account.entity';
import { TaxCode } from '../entities/tax-code.entity';
import { JournalLine } from '../entities/journal-line.entity';

// Controller
import { AiController } from './controllers/ai.controller';

// Services
import { LlmService } from './services/llm.service';
import { ClassificationAiService } from './services/classification-ai.service';
import { AnomalyService } from './services/anomaly.service';
import { NarrativeService } from './services/narrative.service';
import { ChatService } from './services/chat.service';

// NarrativeService depends on report services — import from ReportsModule exports
import { ReportsModule } from '../reports/reports.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      RawTransaction,
      Account,
      TaxCode,
      JournalLine,
    ]),
    ReportsModule, // provides IncomeStatementService + BalanceSheetService
  ],
  controllers: [AiController],
  providers: [
    LlmService,
    ClassificationAiService,
    AnomalyService,
    NarrativeService,
    ChatService,
  ],
})
export class AiModule {}
