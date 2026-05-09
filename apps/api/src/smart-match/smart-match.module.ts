import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bullmq';
import { RawTransaction } from '../entities/raw-transaction.entity';
import { Account } from '../entities/account.entity';
import { ClassificationRule } from '../entities/classification-rule.entity';
import { VendorLibrary } from '../entities/vendor-library.entity';
import { MccCategoryMap } from '../entities/mcc-category-map.entity';
import { SmartMatchAudit } from '../entities/smart-match-audit.entity';
import { SmartMatchService } from './smart-match.service';
import { SmartMatchAuditService } from './smart-match-audit.service';
import { LearnedRuleMatcher } from './rules/learned-rule.matcher';
import { ManualRuleMatcher } from './rules/manual-rule.matcher';
import { MccMatcher } from './rules/mcc.matcher';
import { VendorLibraryMatcher } from './rules/vendor-library.matcher';
import { RecurrenceMatcher } from './rules/recurrence.matcher';
import { AccountDefaultMatcher } from './rules/account-default.matcher';

/**
 * Phase 34 — Smart Match auto-classification engine.
 *
 * BullMQ queues 'smart-match-batch' and 'smart-match-ai' are registered here.
 * Processors ship in Phase 34d. Controllers ship in 34f / 34j.
 *
 * Exports:
 *   SmartMatchService      — used by 34d processors, 34e import/Plaid hooks
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
    ]),
    BullModule.registerQueue(
      { name: 'smart-match-batch' },
      { name: 'smart-match-ai' },
    ),
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
  ],
  exports: [SmartMatchService, SmartMatchAuditService],
})
export class SmartMatchModule {}