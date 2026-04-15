import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
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

    // Upsert subscription — no Stripe calls
    const existing = await this.subscriptionRepo.findOne({
      where: { business_id: business.id },
    });

    const trialEnd = new Date(dto.trialEndsAt);

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

    // Seed chart of accounts (idempotent)
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

      // Skip if already seeded (idempotent)
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
