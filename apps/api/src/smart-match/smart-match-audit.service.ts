import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SmartMatchAudit } from '../entities/smart-match-audit.entity';

@Injectable()
export class SmartMatchAuditService {
  private readonly logger = new Logger(SmartMatchAuditService.name);

  constructor(
    @InjectRepository(SmartMatchAudit)
    private readonly auditRepo: Repository<SmartMatchAudit>,
  ) {}

  /**
   * Record a Smart Match suggestion (Layer 1 hit or Layer 2 AI call).
   * Called immediately after suggestion columns are written to raw_transactions.
   * Resolution fields remain null until the user acts on the suggestion.
   *
   * Failures are swallowed — audit is observability, never business logic.
   */
  async recordSuggestion(
    businessId: string,
    rawTransactionId: string,
    source: string,
    confidence: string,
    aiCallMade: boolean,
  ): Promise<SmartMatchAudit | null> {
    try {
      const audit = this.auditRepo.create({
        business_id: businessId,
        raw_transaction_id: rawTransactionId,
        source,
        confidence,
        ai_call_made: aiCallMade,
        was_accepted: null,
        was_overridden: null,
        override_account_id: null,
        resolved_at: null,
      });
      return await this.auditRepo.save(audit);
    } catch (err) {
      this.logger.error(
        `SmartMatchAudit write failed for tx ${rawTransactionId}: ${
          err instanceof Error ? err.message : String(err)
        }`,
      );
      return null;
    }
  }

  /**
   * Record the resolution of a Smart Match suggestion.
   * Called from 34f (confirm/override endpoints) after the user acts.
   *
   * Finds the most recent unresolved audit row for the transaction.
   */
  async recordResolution(opts: {
    rawTransactionId: string;
    businessId: string;
    wasAccepted: boolean;
    wasOverridden: boolean;
    overrideAccountId?: string | null;
  }): Promise<void> {
    try {
      const audit = await this.auditRepo.findOne({
        where: {
          raw_transaction_id: opts.rawTransactionId,
          business_id: opts.businessId,
        },
        order: { created_at: 'DESC' },
      });
      if (!audit || audit.resolved_at !== null) return;

      await this.auditRepo.update(audit.id, {
        was_accepted: opts.wasAccepted,
        was_overridden: opts.wasOverridden,
        override_account_id: opts.overrideAccountId ?? null,
        resolved_at: new Date(),
      });
    } catch (err) {
      this.logger.error(
        `SmartMatchAudit resolution failed for tx ${opts.rawTransactionId}: ${
          err instanceof Error ? err.message : String(err)
        }`,
      );
    }
  }
}