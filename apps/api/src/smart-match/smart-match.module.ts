import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bullmq';
import { RawTransaction } from '../entities/raw-transaction.entity';
import { Account } from '../entities/account.entity';
import { ClassificationRule } from '../entities/classification-rule.entity';
import { VendorLibrary } from '../entities/vendor-library.entity';
import { MccCategoryMap } from '../entities/mcc-category-map.entity';
import { SmartMatchAudit } from '../entities/smart-match-audit.entity';
import { Subscription } from '../entities/subscription.entity';
import { AiUsageLog } from '../entities/ai-usage-log.entity';
import { AiModule } from '../ai/ai.module';
import { SmartMatchService } from './smart-match.service';
import { SmartMatchAuditService } from './smart-match-audit.service';
import { LearnedRuleMatcher } from './rules/learned-rule.matcher';
import { ManualRuleMatcher } from './rules/manual-rule.matcher';
import { MccMatcher } from './rules/mcc.matcher';
import { VendorLibraryMatcher } from './rules/vendor-library.matcher';
import { RecurrenceMatcher } from './rules/recurrence.matcher';
import { AccountDefaultMatcher } from './rules/account-default.matcher';
import { SmartMatchBatchProcessor } from './processors/smart-match-batch.processor';
import { SmartMatchAiProcessor } from './processors/smart-match-ai.processor';

/**
 * Phase 34 — Smart Match auto-classification engine.
 *
 * 34c: SmartMatchModule scaffold + 6 Layer 1 rule matchers.
 * 34d: SmartMatchBatchProcessor + SmartMatchAiProcessor added.
 *
 * Exports:
 *   SmartMatchService      — used by 34e import/Plaid hooks + 34j firm controller
 *   SmartMatchAuditService — used by 34f confirm/override endpoints
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([
      RawTransaction,
      Account,
      ClassificationRule,
      VendorLibrary,
      MccCategoryMap,
      SmartMatchAudit,
      Subscription,
      AiUsageLog,
    ]),
    BullModule.registerQueue(
      { name: 'smart-match-batch' },
      { name: 'smart-match-ai' },
    ),
    AiModule,
  ],
  providers: [
    SmartMatchService,
    SmartMatchAuditService,
    LearnedRuleMatcher,
    ManualRuleMatcher,
    MccMatcher,
    VendorLibraryMatcher,
    RecurrenceMatcher,
    AccountDefaultMatcher,
    SmartMatchBatchProcessor,
    SmartMatchAiProcessor,
  ],
  exports: [SmartMatchService, SmartMatchAuditService],
})
export class SmartMatchModule {}