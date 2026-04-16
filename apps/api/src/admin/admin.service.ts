import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Business, BusinessMode } from '../entities/business.entity';
import { Subscription, SubscriptionPlan } from '../entities/subscription.entity';
import { RawTransaction, RawTransactionStatus, RawTransactionSource } from '../entities/raw-transaction.entity';
import { AccountantFirm } from '../entities/accountant-firm.entity';
import { FirmStaff, FirmStaffRole } from '../entities/firm-staff.entity';
import { FirmClient, FirmClientStatus } from '../entities/firm-client.entity';
import { BusinessesService } from '../businesses/businesses.service';
import { FREELANCER_6MO } from './seed-data/freelancer-6mo';
import { BUSINESS_6MO } from './seed-data/business-6mo';
import { PERSONAL_6MO } from './seed-data/personal-6mo';

export type SeedScenario = 'freelancer_6mo' | 'business_6mo' | 'personal_6mo';

const SYNTHETIC_SOURCE = 'SYNTHETIC_CHEQUING';

const ONE_YEAR_FROM_NOW = (): string => {
  const d = new Date();
  d.setFullYear(d.getFullYear() + 1);
  return d.toISOString().split('T')[0];
};

@Injectable()
export class AdminService {
  constructor(
    @InjectRepository(Business)
    private readonly businessRepo: Repository<Business>,
    @InjectRepository(Subscription)
    private readonly subscriptionRepo: Repository<Subscription>,
    @InjectRepository(RawTransaction)
    private readonly rawTxRepo: Repository<RawTransaction>,
    @InjectRepository(AccountantFirm)
    private readonly firmRepo: Repository<AccountantFirm>,
    @InjectRepository(FirmStaff)
    private readonly staffRepo: Repository<FirmStaff>,
    @InjectRepository(FirmClient)
    private readonly firmClientRepo: Repository<FirmClient>,
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

    const subscription = await this.subscriptionRepo.findOne({ where: { business_id: businessId } });
    if (subscription?.stripe_customer_id) {
      throw new ForbiddenException('Cannot delete a real paying account through the admin tool');
    }

    await this.dataSource.transaction(async (manager) => {
      await manager.query(`DELETE FROM journal_lines WHERE business_id = $1`, [businessId]);
      await manager.query(`DELETE FROM journal_entries WHERE business_id = $1`, [businessId]);
      await manager.query(`DELETE FROM classified_transactions WHERE business_id = $1`, [businessId]);
      await manager.query(`DELETE FROM transaction_splits WHERE business_id = $1`, [businessId]);
      await manager.query(`DELETE FROM raw_transactions WHERE business_id = $1`, [businessId]);
      await manager.query(`DELETE FROM tax_transactions WHERE business_id = $1`, [businessId]);
      await manager.query(`DELETE FROM recurring_transactions WHERE business_id = $1`, [businessId]);
      await manager.query(`DELETE FROM subscriptions WHERE business_id = $1`, [businessId]);
      await manager.query(`DELETE FROM accounts WHERE business_id = $1`, [businessId]);
      await manager.query(`DELETE FROM firm_clients WHERE business_id = $1`, [businessId]);
      await manager.query(`DELETE FROM businesses WHERE id = $1`, [businessId]);
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

  // ── Provision Demo Suite ────────────────────────────────────────────────────

  async provisionDemoSuite(dto: {
    ownerClerkUserId: string;
    starterOrgId: string;
    starterBusinessName: string;
    proOrgId: string;
    proBusinessName: string;
    accountantOrgId: string;
    firmName: string;
    firmSubdomain: string;
    client1OrgId: string;
    client1BusinessName: string;
    client2OrgId: string;
    client2BusinessName: string;
    trialEndsAt?: string;
  }): Promise<{
    starter: { businessId: string; created: boolean };
    pro: { businessId: string; created: boolean };
    accountant: { businessId: string; created: boolean; firmId: string };
    client1: { businessId: string; created: boolean };
    client2: { businessId: string; created: boolean };
  }> {
    const trialEndsAt = dto.trialEndsAt ?? ONE_YEAR_FROM_NOW();

    // ── Step 1: Starter slot — Business mode, Starter plan ──
    const starter = await this.seedAccount({
      businessName: dto.starterBusinessName,
      clerkOrgId: dto.starterOrgId,
      mode: BusinessMode.BUSINESS,
      plan: 'starter' as SubscriptionPlan,
      trialEndsAt,
    });
    await this.seedTransactions(starter.businessId, 'business_6mo');

    // ── Step 2: Pro slot — Freelancer mode, Pro plan ──
    const pro = await this.seedAccount({
      businessName: dto.proBusinessName,
      clerkOrgId: dto.proOrgId,
      mode: BusinessMode.FREELANCER,
      plan: 'pro' as SubscriptionPlan,
      trialEndsAt,
    });
    await this.seedTransactions(pro.businessId, 'freelancer_6mo');

    // ── Step 3: Accountant slot — creates the billing context business ──
    const accountantBiz = await this.seedAccount({
      businessName: dto.firmName,
      clerkOrgId: dto.accountantOrgId,
      mode: BusinessMode.BUSINESS,
      plan: 'accountant' as SubscriptionPlan,
      trialEndsAt,
    });

    // ── Step 4: Find or create the AccountantFirm record ──
    const subdomainClean = dto.firmSubdomain
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, '');

    let firm = await this.firmRepo.findOne({
      where: { owner_clerk_id: dto.ownerClerkUserId },
    });

    if (!firm) {
      // Check subdomain availability
      const takenBySubdomain = await this.firmRepo.findOne({
        where: { subdomain: subdomainClean },
      });
      if (takenBySubdomain) {
        throw new ConflictException(
          `Subdomain "${subdomainClean}" is already taken. Choose a different firmSubdomain.`,
        );
      }

      firm = await this.firmRepo.save(
        this.firmRepo.create({
          name: dto.firmName,
          subdomain: subdomainClean,
          owner_clerk_id: dto.ownerClerkUserId,
          logo_url: null,
          brand_colour: null,
          stripe_customer_id: null,
        }),
      );

      // Auto-create firm_owner staff row
      const existingStaff = await this.staffRepo.findOne({
        where: { firm_id: firm.id, clerk_user_id: dto.ownerClerkUserId },
      });
      if (!existingStaff) {
        await this.staffRepo.save(
          this.staffRepo.create({
            firm_id: firm.id,
            clerk_user_id: dto.ownerClerkUserId,
            role: FirmStaffRole.FIRM_OWNER,
            invited_email: null,
            accepted_at: new Date(),
          }),
        );
      }
    }

    // ── Step 5: Client 1 — Business mode ──
    const client1 = await this._provisionClientBusiness({
      clerkOrgId: dto.client1OrgId,
      businessName: dto.client1BusinessName,
      mode: BusinessMode.BUSINESS,
      firmId: firm.id,
      trialEndsAt,
    });
    await this.seedTransactions(client1.businessId, 'business_6mo');

    // ── Step 6: Client 2 — Freelancer mode ──
    const client2 = await this._provisionClientBusiness({
      clerkOrgId: dto.client2OrgId,
      businessName: dto.client2BusinessName,
      mode: BusinessMode.FREELANCER,
      firmId: firm.id,
      trialEndsAt,
    });
    await this.seedTransactions(client2.businessId, 'freelancer_6mo');

    return {
      starter,
      pro,
      accountant: { ...accountantBiz, firmId: firm.id },
      client1,
      client2,
    };
  }

  /** Creates a client business linked to a firm via firm_clients. Idempotent. */
  private async _provisionClientBusiness(opts: {
    clerkOrgId: string;
    businessName: string;
    mode: BusinessMode;
    firmId: string;
    trialEndsAt: string;
  }): Promise<{ businessId: string; created: boolean }> {
    const result = await this.seedAccount({
      businessName: opts.businessName,
      clerkOrgId: opts.clerkOrgId,
      mode: opts.mode,
      plan: 'pro' as SubscriptionPlan,
      trialEndsAt: opts.trialEndsAt,
    });

    // Stamp created_by_firm_id on the business
    await this.businessRepo.update(result.businessId, {
      created_by_firm_id: opts.firmId,
    });

    // Ensure firm_clients row exists
    const existing = await this.firmClientRepo.findOne({
      where: { firm_id: opts.firmId, business_id: result.businessId },
    });
    if (!existing) {
      await this.firmClientRepo.save(
        this.firmClientRepo.create({
          firm_id: opts.firmId,
          business_id: result.businessId,
          status: FirmClientStatus.ACTIVE,
        }),
      );
    }

    return result;
  }

  // ── Admin Check ─────────────────────────────────────────────────────────────

  async checkAdmin(): Promise<{ ok: boolean }> {
    return { ok: true };
  }
}
