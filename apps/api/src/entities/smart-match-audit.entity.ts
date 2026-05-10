import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

/**
 * Phase 34: Smart Match audit row.
 *
 * Captures every suggestion outcome (Layer 1 rule hit OR Layer 2 AI call) so
 * we can measure rule-vs-AI hit ratio per tenant per month, override rate
 * per rule source, and surface admin-dashboard tuning signals.
 *
 * One row per resolved Smart Match decision (suggestion confirmed, overridden,
 * or AI fallback completed). Rows are immutable after creation.
 */
@Entity('smart_match_audit')
@Index(['business_id', 'created_at'])
@Index(['raw_transaction_id'])
export class SmartMatchAudit {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  business_id: string;

  @Column({ type: 'uuid' })
  raw_transaction_id: string;

  // 'rule_learned' | 'rule_manual' | 'rule_mcc' | 'rule_vendor' | 'rule_recurrence' | 'ai'
  @Column({ type: 'varchar', length: 20 })
  source: string;

  // 'high' | 'medium' | 'low'
  @Column({ type: 'varchar', length: 10, nullable: true })
  confidence: string | null;

  // True if user confirmed without override
  @Column({ type: 'boolean', nullable: true, default: null })
  was_accepted: boolean | null;

  // True if user picked a different account/category than suggested
  @Column({ type: 'boolean', nullable: true, default: null })
  was_overridden: boolean | null;

  // What the user picked instead, if overridden
  @Column({ type: 'uuid', nullable: true })
  override_account_id: string | null;

  // True only when an Anthropic call was made (Layer 2). Layer 1 hits = false.
  @Column({ type: 'boolean', default: false })
  ai_call_made: boolean;

  // Set when user confirms or overrides; null while suggestion still pending
  @Column({ type: 'timestamp with time zone', nullable: true })
  resolved_at: Date | null;

  @CreateDateColumn({ type: 'timestamp with time zone' })
  created_at: Date;
}