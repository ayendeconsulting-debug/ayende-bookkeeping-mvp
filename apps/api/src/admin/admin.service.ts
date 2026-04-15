import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Business, BusinessMode } from '../entities/business.entity';
import { Subscription, SubscriptionPlan } from '../entities/subscription.entity';
import { RawTransaction, RawTransactionStatus, RawTransactionSource } from '../entities/raw-transaction.entity';
import { BusinessesService } from '../businesses/businesses.service';
import { FREELANCER_6MO } from './seed-data/freelancer-6mo';
import { BUSINESS_6MO } from './seed-data/business-6mo';
import { PERSONAL_6MO } from './seed-data/personal-6mo';

export type SeedScenario = 'freelancer_6mo' | 'business_6mo' | 'personal_6mo';

const SYNTHETIC_SOURCE = 'SYNTHETIC_CHEQUING';

@Injectable()
export class AdminService {
  constructor(
    @InjectRepository(Business)
    private readonly businessRepo: Repository<Business>,
    @InjectRepository(Subscription)
    private readonly subscriptionRepo: Repository<Subscription>,
    @InjectRepository(RawTransaction)
    private readonly rawTxRepo: Repository<RawTransaction>,
    private readonly businessesService: BusinessesService,
    private readonly dataSource: DataSource,
  ) {}

  // ── List Test Accounts ──────────────────────────────────────────────────────

  async listAccounts(): Promise<{
    businessId: string;
    name: string;
    mode: string;
    plan: string;
    clerkOrgId: string | null;
    createdAt: Date;
  }[]> {
    // Test accounts have no stripe_customer_id on their subscription
    const rows = await this.dataSource.query(`
      SELECT
        b.id            AS "businessId",
        b.name          AS "name",
        b.mode          AS "mode",
        b.clerk_org_id  AS "clerkOrgId",
        b.created_at    AS "createdAt",
        s.plan          AS "plan"
      FROM businesses b
      LEFT JOIN subscriptions s ON s.business_id = b.id
      WHERE (s.stripe_customer_id IS NULL OR s.id IS NULL)
        AND b.deleted_at IS NULL
      ORDER BY b.created_at DESC
      LIMIT 50
    `);
    return rows;
  }

  // ── Delete Test Account ─────────────────────────────────────────────────────

  async deleteAccount(businessId: string): Promise<{ deleted: boolean }> {
    const business = await this.businessRepo.findOne({ where: { id: businessId } });
    if (!business) throw new NotFoundException(`Business ${businessId} not found`);

    // Safety guard — refuse to delete real paying accounts
    const subscription = await this.subscriptionRepo.findOne({ where: { business_id: businessId } });
    if (subscription?.stripe_customer_id) {
      throw new ForbiddenException('Cannot delete a real paying account through the admin tool');
    }

    // Hard delete in dependency order using raw queries for speed
    await this.dataSource.transaction(async (manager) => {
      // Journal lines → journal entries
      await manager.query(
        `DELETE FROM journal_lines WHERE business_id = $1`, [businessId],
      );
      await manager.query(
        `DELETE FROM journal_entries WHERE business_id = $1`, [businessId],
      );
      // Classified transactions
      await manager.query(
        `DELETE FROM classified_transactions WHERE business_id = $1`, [businessId],
      );
      // Transaction splits
      await manager.query(
        `DELETE FROM transaction_splits WHERE business_id = $1`, [businessId],
      );
      // Raw transactions
      await manager.query(
        `DELETE FROM raw_transactions WHERE business_id = $1`, [businessId],
      );
      // Tax transactions
      await manager.query(
        `DELETE FROM tax_transactions WHERE business_id = $1`, [businessId],
      );
      // Recurring transactions
      await manager.query(
        `DELETE FROM recurring_transactions WHERE business_id = $1`, [businessId],
      );
      // Subscriptions
      await manager.query(
        `DELETE FROM subscriptions WHERE business_id = $1`, [businessId],
      );
      // Accounts (chart of accounts)
      await manager.query(
        `DELETE FROM accounts WHERE business_id = $1`, [businessId],
      );
      // Business itself
      await manager.query(
        `DELETE FROM businesses WHERE id = $1`, [businessId],
      );
    });

    return { deleted: true };
  }

  // ── Seed Account ────────────────────────────────────────────────────────────

  async seedAccount(dto: {
    businessName: string;
    clerkOrgId: string;
    mode: BusinessMode;
    plan: SubscriptionPlan;
    trialEndsAt: string;
  }): Promise<{ businessId: string; created: boolean }> {
    let business = await this.businessRepo.findOne({
      where: { clerk_org_id: dto.clerkOrgId },
    });

    let created = false;
    if (!business) {
      business = this.businessRepo.create({
        name: dto.businessName,
        clerk_org_id: dto.clerkOrgId,
        mode: dto.mode,
        currency_code: 'CAD',
        country: 'CA',
      });
      business = await this.businessRepo.save(business);
      created = true;
    } else {
      business.name = dto.businessName;
      business.mode = dto.mode;
      await this.businessRepo.save(business);
    }

    const trialEnd = new Date(dto.trialEndsAt);
    const existing = await this.subscriptionRepo.findOne({ where: { business_id: business.id } });

    if (existing) {
      await this.subscriptionRepo.update(existing.id, {
        plan: dto.plan,
        status: 'active',
        trial_ends_at: trialEnd,
        current_period_end: trialEnd,
      });
    } else {
      await this.subscriptionRepo.save(
        this.subscriptionRepo.create({
          business_id: business.id,
          plan: dto.plan,
          status: 'active',
          billing_cycle: 'monthly',
          currency: 'cad',
          trial_ends_at: trialEnd,
          current_period_end: trialEnd,
        }),
      );
    }

    await this.businessesService.seedAccounts(business.id, 'general');

    return { businessId: business.id, created };
  }

  // ── Seed Transactions ───────────────────────────────────────────────────────

  async seedTransactions(
    businessId: string,
    scenario: SeedScenario,
  ): Promise<{ inserted: number }> {
    const business = await this.businessRepo.findOne({ where: { id: businessId } });
    if (!business) throw new NotFoundException(`Business ${businessId} not found`);

    const scenarioMap: Record<SeedScenario, typeof FREELANCER_6MO> = {
      freelancer_6mo: FREELANCER_6MO,
      business_6mo:   BUSINESS_6MO,
      personal_6mo:   PERSONAL_6MO,
    };

    const transactions = scenarioMap[scenario];
    if (!transactions) throw new BadRequestException(`Unknown scenario: ${scenario}`);

    let inserted = 0;

    for (const tx of transactions) {
      const hash = `SYNTHETIC_${tx.date}_${tx.description.replace(/\s+/g, '_')}_${tx.amount}`;

      const existing = await this.rawTxRepo.findOne({
        where: { business_id: businessId, hash_signature: hash },
      });
      if (existing) continue;

      const raw = this.rawTxRepo.create({
        business_id: businessId,
        transaction_date: new Date(tx.date),
        description: tx.description,
        amount: tx.amount,
        source_account_name: SYNTHETIC_SOURCE,
        hash_signature: hash,
        status: RawTransactionStatus.PENDING,
        source: RawTransactionSource.CSV,
      });

      await this.rawTxRepo.save(raw);
      inserted++;
    }

    return { inserted };
  }

  // ── Clear Synthetic Transactions ────────────────────────────────────────────

  async clearTransactions(businessId: string): Promise<{ deleted: number }> {
    const business = await this.businessRepo.findOne({ where: { id: businessId } });
    if (!business) throw new NotFoundException(`Business ${businessId} not found`);

    const result = await this.dataSource.query(
      `DELETE FROM raw_transactions
       WHERE business_id = $1
         AND source_account_name LIKE 'SYNTHETIC_%'
         AND status = 'pending'`,
      [businessId],
    );

    return { deleted: result[1] ?? 0 };
  }

  // ── Admin Check ─────────────────────────────────────────────────────────────

  async checkAdmin(): Promise<{ ok: boolean }> {
    return { ok: true };
  }
}
