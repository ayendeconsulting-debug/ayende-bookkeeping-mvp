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
import { Account } from '../entities/account.entity';
import { JournalEntry, JournalEntryStatus } from '../entities/journal-entry.entity';
import { JournalLine } from '../entities/journal-line.entity';
import { ClassifiedTransaction, ClassificationMethod } from '../entities/classified-transaction.entity';
import { BusinessesService } from '../businesses/businesses.service';
import { FREELANCER_6MO } from './seed-data/freelancer-6mo';
import { BUSINESS_6MO } from './seed-data/business-6mo';
import { PERSONAL_6MO } from './seed-data/personal-6mo';
import { FREELANCER_ENRICHED, FreelancerEnrichedDataset } from './seed-data/freelancer-enriched';
import { BUSINESS_ENRICHED, BusinessEnrichedDataset } from './seed-data/business-enriched';

export type SeedScenario =
  | 'freelancer_6mo'
  | 'business_6mo'
  | 'personal_6mo'
  | 'freelancer_enriched'
  | 'business_enriched';

const SYNTHETIC_SOURCE = 'SYNTHETIC_CHEQUING';

// Transactions dated before this cutoff get fully posted journal entries.
// Transactions on/after this date are left as PENDING raw transactions.
const ENRICHED_POSTING_CUTOFF = new Date('2026-04-01');

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
    @InjectRepository(Account)
    private readonly accountRepo: Repository<Account>,
    @InjectRepository(JournalEntry)
    private readonly journalEntryRepo: Repository<JournalEntry>,
    @InjectRepository(JournalLine)
    private readonly journalLineRepo: Repository<JournalLine>,
    @InjectRepository(ClassifiedTransaction)
    private readonly classifiedTxRepo: Repository<ClassifiedTransaction>,
    private readonly businessesService: BusinessesService,
    private readonly dataSource: DataSource,
  ) {}

  // ── List Test Accounts ───────────────────────────────────────────────────────

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

  // ── Delete Test Account ──────────────────────────────────────────────────────

  async deleteAccount(businessId: string): Promise<{ deleted: boolean }> {
    const business = await this.businessRepo.findOne({ where: { id: businessId } });
    if (!business) throw new NotFoundException(`Business ${businessId} not found`);

    const subscription = await this.subscriptionRepo.findOne({ where: { business_id: businessId } });
    if (subscription?.stripe_customer_id) {
      throw new ForbiddenException('Cannot delete a real paying account through the admin tool');
    }

    await this.dataSource.transaction(async (manager) => {
      const b = [businessId];
      await manager.query(`DELETE FROM journal_lines WHERE business_id = $1`, b);
      await manager.query(`DELETE FROM journal_entries WHERE business_id = $1`, b);
      await manager.query(`DELETE FROM tax_transactions WHERE business_id = $1`, b);
      await manager.query(`DELETE FROM transaction_splits WHERE business_id = $1`, b);
      await manager.query(`DELETE FROM classified_transactions WHERE business_id = $1`, b);
      await manager.query(`DELETE FROM raw_transactions WHERE business_id = $1`, b);
      await manager.query(`DELETE FROM import_batches WHERE business_id = $1`, b);
      await manager.query(`DELETE FROM recurring_transactions WHERE business_id = $1`, b);
      await manager.query(`DELETE FROM classification_rules WHERE business_id = $1`, b);
      await manager.query(`DELETE FROM personal_classification_rules WHERE business_id = $1`, b);
      await manager.query(`DELETE FROM tax_codes WHERE business_id = $1`, b);
      await manager.query(`DELETE FROM hst_periods WHERE business_id = $1`, b);
      await manager.query(`DELETE FROM fiscal_years WHERE business_id = $1`, b);
      await manager.query(`DELETE FROM budget_categories WHERE business_id = $1`, b);
      await manager.query(`DELETE FROM savings_goals WHERE business_id = $1`, b);
      await manager.query(`DELETE FROM mileage_logs WHERE business_id = $1`, b);
      await manager.query(`DELETE FROM invoices WHERE business_id = $1`, b);
      await manager.query(`DELETE FROM payment_reminders WHERE business_id = $1`, b);
      await manager.query(`DELETE FROM ar_ap_records WHERE business_id = $1`, b);
      await manager.query(`DELETE FROM cca_assets WHERE business_id = $1`, b);
      await manager.query(`DELETE FROM documents WHERE business_id = $1`, b);
      await manager.query(`DELETE FROM plaid_webhook_logs WHERE business_id = $1`, b);
      await manager.query(`DELETE FROM plaid_accounts WHERE business_id = $1`, b);
      await manager.query(`DELETE FROM plaid_items WHERE business_id = $1`, b);
      await manager.query(`DELETE FROM ai_usage_log WHERE business_id = $1`, b);
      await manager.query(`DELETE FROM audit_logs WHERE business_id = $1`, b);
      await manager.query(`DELETE FROM accountant_audit_log WHERE business_id = $1`, b);
      await manager.query(`DELETE FROM firm_client_access_requests WHERE business_id = $1`, b);
      await manager.query(`DELETE FROM firm_clients WHERE business_id = $1`, b);
      await manager.query(`DELETE FROM business_users WHERE business_id = $1`, b);
      await manager.query(`DELETE FROM subscriptions WHERE business_id = $1`, b);
      await manager.query(`DELETE FROM accounts WHERE business_id = $1`, b);
      await manager.query(`DELETE FROM businesses WHERE id = $1`, b);
    });

    return { deleted: true };
  }

  // ── Seed Account ─────────────────────────────────────────────────────────────

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
        settings: { mode_selected: true },
      });
      business = await this.businessRepo.save(business);
      created = true;
    } else {
      business.name = dto.businessName;
      business.mode = dto.mode;
      business.settings = { ...(business.settings ?? {}), mode_selected: true };
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

  // ── Seed Transactions ────────────────────────────────────────────────────────

  async seedTransactions(
    businessId: string,
    scenario: SeedScenario,
  ): Promise<{ inserted: number }> {
    const business = await this.businessRepo.findOne({ where: { id: businessId } });
    if (!business) throw new NotFoundException(`Business ${businessId} not found`);

    // Delegate enriched scenarios to the full journal-posting seeder
    if (scenario === 'freelancer_enriched' || scenario === 'business_enriched') {
      return this.seedEnrichedData(businessId, scenario);
    }

    const scenarioMap: Record<'freelancer_6mo' | 'business_6mo' | 'personal_6mo', typeof FREELANCER_6MO> = {
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

  // ── Seed Enriched Data (full double-entry posting) ───────────────────────────
  //
  // Transactions dated < 2026-04-01  → raw tx + classified_transaction + POSTED journal entry
  // Transactions dated >= 2026-04-01 → raw tx PENDING only (shows in transaction inbox)
  //
  // Double-entry rule:
  //   Income  (amount > 0): DR 1000 Bank / CR target account
  //   Expense (amount < 0): DR target account / CR 1000 Bank

  private async seedEnrichedData(
    businessId: string,
    scenario: 'freelancer_enriched' | 'business_enriched',
  ): Promise<{ inserted: number }> {

    // 1. Load all accounts for this business into a code → id map
    const accounts = await this.accountRepo.find({ where: { business_id: businessId } });
    const accountIdMap = new Map<string, string>(
      accounts.map((a) => [a.account_code, a.id]),
    );

    const getAccountId = (code: string): string => {
      const id = accountIdMap.get(code);
      if (!id) {
        throw new Error(
          `Account code "${code}" not found for business ${businessId}. ` +
          `Ensure seedAccounts was called before seedEnrichedData.`,
        );
      }
      return id;
    };

    // 2. Pick dataset
    const dataset: FreelancerEnrichedDataset | BusinessEnrichedDataset =
      scenario === 'freelancer_enriched' ? FREELANCER_ENRICHED : BUSINESS_ENRICHED;

    // 3. Entry number prefix — unique per business (first 12 hex chars of UUID)
    const entryPfx = 'ENR-' + businessId.replace(/-/g, '').substring(0, 12).toUpperCase();
    let entryCounter = 1;
    let inserted = 0;

    // 4. Process transactions
    for (const tx of dataset.transactions) {
      const hash = `SYNTHETIC_ENRICHED_${tx.date}_${tx.description.replace(/\s+/g, '_')}_${tx.amount}`;

      const existing = await this.rawTxRepo.findOne({
        where: { business_id: businessId, hash_signature: hash },
      });
      if (existing) continue;

      const txDate = new Date(tx.date);
      const shouldPost = txDate < ENRICHED_POSTING_CUTOFF;
      const absAmount = Math.abs(tx.amount);
      const bankAccountId   = getAccountId('1000');
      const targetAccountId = getAccountId(tx.accountCode);

      // Insert raw transaction (always PENDING — the classified_transaction + JE marks it as posted)
      const raw = await this.rawTxRepo.save(
        this.rawTxRepo.create({
          business_id:         businessId,
          transaction_date:    txDate,
          description:         tx.description,
          amount:              tx.amount,
          source_account_name: SYNTHETIC_SOURCE,
          hash_signature:      hash,
          status:              RawTransactionStatus.PENDING,
          source:              RawTransactionSource.CSV,
        }),
      );

      if (shouldPost) {
        // DR/CR direction: income → DR bank, CR target | expense/draw → DR target, CR bank
        const isIncome = tx.amount > 0;
        const debitAccountId  = isIncome ? bankAccountId   : targetAccountId;
        const creditAccountId = isIncome ? targetAccountId : bankAccountId;

        const entryNumber = `${entryPfx}-${String(entryCounter).padStart(4, '0')}`;
        entryCounter++;

        // Create POSTED journal entry
        const entry = await this.journalEntryRepo.save(
          this.journalEntryRepo.create({
            business_id:    businessId,
            entry_number:   entryNumber,
            entry_date:     txDate,
            description:    tx.description,
            status:         JournalEntryStatus.POSTED,
            created_by:     'system',
            posted_by:      'system',
            posted_at:      txDate,
          } as Partial<JournalEntry>),
        );

        // Create balanced journal lines
        await this.journalLineRepo.save([
          this.journalLineRepo.create({
            business_id:      businessId,
            journal_entry_id: entry.id,
            line_number:      1,
            account_id:       debitAccountId,
            debit_amount:     absAmount,
            credit_amount:    0,
            description:      tx.description,
          } as Partial<JournalLine>),
          this.journalLineRepo.create({
            business_id:      businessId,
            journal_entry_id: entry.id,
            line_number:      2,
            account_id:       creditAccountId,
            debit_amount:     0,
            credit_amount:    absAmount,
            description:      tx.description,
          } as Partial<JournalLine>),
        ]);

        // Create classified transaction (marks the raw tx as fully processed)
        await this.classifiedTxRepo.save(
          this.classifiedTxRepo.create({
            business_id:             businessId,
            raw_transaction_id:      raw.id,
            classification_method:   ClassificationMethod.AUTO,
            account_id:              targetAccountId,
            source_account_id:       bankAccountId,
            classified_by:           'system',
            is_posted:               true,
            posted_journal_entry_id: entry.id,
          } as Partial<ClassifiedTransaction>),
        );

        // Mark raw transaction as posted
        await this.dataSource.query(
          `UPDATE raw_transactions SET status = 'posted' WHERE id = $1`,
          [raw.id],
        );
      }

      inserted++;
    }

    // 5. Seed HST periods (idempotent: skip if period_start already exists for this business)
    for (const period of dataset.hstPeriods) {
      const exists = await this.dataSource.query(
        `SELECT id FROM hst_periods WHERE business_id = $1 AND period_start = $2 LIMIT 1`,
        [businessId, period.period_start],
      );
      if (exists.length > 0) continue;

      await this.dataSource.query(
        `INSERT INTO hst_periods
           (id, business_id, period_start, period_end, frequency, status,
            total_hst_collected, total_itc_claimed, net_tax_owing, filed_at,
            created_at, updated_at)
         VALUES
           (gen_random_uuid(), $1, $2, $3, 'quarterly', $4,
            $5, $6, $7, $8,
            NOW(), NOW())`,
        [
          businessId,
          period.period_start,
          period.period_end,
          period.status,
          period.total_hst_collected,
          period.total_itc_claimed,
          period.net_tax_owing,
          period.filed_at ? new Date(period.filed_at) : null,
        ],
      );
    }

    // 6. Freelancer-only supplemental data
    if (scenario === 'freelancer_enriched') {
      const fd = FREELANCER_ENRICHED;

      // Mileage logs (idempotent by trip_date + start_location)
      for (const trip of fd.mileage) {
        const exists = await this.dataSource.query(
          `SELECT id FROM mileage_logs
            WHERE business_id = $1 AND trip_date = $2 AND start_location = $3
            LIMIT 1`,
          [businessId, trip.trip_date, trip.start_location],
        );
        if (exists.length > 0) continue;

        await this.dataSource.query(
          `INSERT INTO mileage_logs
             (id, business_id, user_id, trip_date, start_location, end_location,
              purpose, distance_km, rate_per_km, deduction_value, country, created_at)
           VALUES
             (gen_random_uuid(), $1, 'system', $2, $3, $4,
              $5, $6, $7, $8, 'CA', NOW())`,
          [
            businessId,
            trip.trip_date,
            trip.start_location,
            trip.end_location,
            trip.purpose,
            trip.distance_km,
            trip.rate_per_km,
            trip.deduction_value,
          ],
        );
      }

      // Savings goals (idempotent by name)
      for (const goal of fd.savingsGoals) {
        const exists = await this.dataSource.query(
          `SELECT id FROM savings_goals WHERE business_id = $1 AND name = $2 LIMIT 1`,
          [businessId, goal.name],
        );
        if (exists.length > 0) continue;

        await this.dataSource.query(
          `INSERT INTO savings_goals
             (id, business_id, name, target_amount, current_amount,
              target_date, status, created_at, updated_at)
           VALUES
             (gen_random_uuid(), $1, $2, $3, $4,
              $5, $6, NOW(), NOW())`,
          [
            businessId,
            goal.name,
            goal.target_amount,
            goal.current_amount,
            goal.target_date,
            goal.status,
          ],
        );
      }

      // Invoices (idempotent by invoice_number)
      for (const inv of fd.invoices) {
        const exists = await this.dataSource.query(
          `SELECT id FROM invoices WHERE business_id = $1 AND invoice_number = $2 LIMIT 1`,
          [businessId, inv.invoice_number],
        );
        if (exists.length > 0) continue;

        const invResult = await this.dataSource.query(
          `INSERT INTO invoices
             (id, business_id, invoice_number, client_name, client_email,
              issue_date, due_date, status, subtotal, tax_amount, total,
              amount_paid, balance_due, notes, created_at, updated_at)
           VALUES
             (gen_random_uuid(), $1, $2, $3, $4,
              $5, $6, $7, $8, $9, $10,
              $11, $12, $13, NOW(), NOW())
           RETURNING id`,
          [
            businessId,
            inv.invoice_number,
            inv.client_name,
            inv.client_email,
            inv.issue_date,
            inv.due_date,
            inv.status,
            inv.subtotal,
            inv.tax_amount,
            inv.total,
            inv.amount_paid,
            inv.balance_due,
            inv.notes,
          ],
        );

        const invoiceId = invResult[0].id as string;

        for (const line of inv.lines) {
          await this.dataSource.query(
            `INSERT INTO invoice_line_items
               (id, invoice_id, description, quantity, unit_price, line_total, sort_order)
             VALUES
               (gen_random_uuid(), $1, $2, $3, $4, $5, $6)`,
            [
              invoiceId,
              line.description,
              line.quantity,
              line.unit_price,
              line.line_total,
              line.sort_order,
            ],
          );
        }
      }
    }

    return { inserted };
  }

  // ── Clear Synthetic Transactions ─────────────────────────────────────────────

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

  // ── Provision Demo Suite ──────────────────────────────────────────────────────

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

    // ── Step 1: Starter slot — Personal mode, Starter plan ──
    const starter = await this.seedAccount({
      businessName: dto.starterBusinessName,
      clerkOrgId:   dto.starterOrgId,
      mode:         BusinessMode.PERSONAL,
      plan:         'starter' as SubscriptionPlan,
      trialEndsAt,
    });
    await this.seedTransactions(starter.businessId, 'personal_6mo');

    // ── Step 2: Pro slot — Freelancer mode, Pro plan + enriched data ──
    const pro = await this.seedAccount({
      businessName: dto.proBusinessName,
      clerkOrgId:   dto.proOrgId,
      mode:         BusinessMode.FREELANCER,
      plan:         'pro' as SubscriptionPlan,
      trialEndsAt,
    });
    await this.seedTransactions(pro.businessId, 'freelancer_enriched');

    // ── Step 3: Accountant slot — creates the billing context business ──
    const accountantBiz = await this.seedAccount({
      businessName: dto.firmName,
      clerkOrgId:   dto.accountantOrgId,
      mode:         BusinessMode.BUSINESS,
      plan:         'accountant' as SubscriptionPlan,
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
          name:               dto.firmName,
          subdomain:          subdomainClean,
          owner_clerk_id:     dto.ownerClerkUserId,
          logo_url:           null,
          brand_colour:       null,
          stripe_customer_id: null,
        }),
      );

      const existingStaff = await this.staffRepo.findOne({
        where: { firm_id: firm.id, clerk_user_id: dto.ownerClerkUserId },
      });
      if (!existingStaff) {
        await this.staffRepo.save(
          this.staffRepo.create({
            firm_id:       firm.id,
            clerk_user_id: dto.ownerClerkUserId,
            role:          FirmStaffRole.FIRM_OWNER,
            invited_email: null,
            accepted_at:   new Date(),
          }),
        );
      }
    }

    // ── Step 5: Client 1 — Business mode + enriched data ──
    const client1 = await this._provisionClientBusiness({
      clerkOrgId:   dto.client1OrgId,
      businessName: dto.client1BusinessName,
      mode:         BusinessMode.BUSINESS,
      firmId:       firm.id,
      trialEndsAt,
    });
    await this.seedTransactions(client1.businessId, 'business_enriched');

    // ── Step 6: Client 2 — Freelancer mode + enriched data ──
    const client2 = await this._provisionClientBusiness({
      clerkOrgId:   dto.client2OrgId,
      businessName: dto.client2BusinessName,
      mode:         BusinessMode.FREELANCER,
      firmId:       firm.id,
      trialEndsAt,
    });
    await this.seedTransactions(client2.businessId, 'freelancer_enriched');

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
      clerkOrgId:   opts.clerkOrgId,
      mode:         opts.mode,
      plan:         'pro' as SubscriptionPlan,
      trialEndsAt:  opts.trialEndsAt,
    });

    await this.businessRepo.update(result.businessId, {
      created_by_firm_id: opts.firmId,
    });

    const existing = await this.firmClientRepo.findOne({
      where: { firm_id: opts.firmId, business_id: result.businessId },
    });
    if (!existing) {
      await this.firmClientRepo.save(
        this.firmClientRepo.create({
          firm_id:     opts.firmId,
          business_id: result.businessId,
          status:      FirmClientStatus.ACTIVE,
        }),
      );
    }

    return result;
  }

  // ── Admin Check ───────────────────────────────────────────────────────────────

  async checkAdmin(): Promise<{ ok: boolean }> {
    return { ok: true };
  }
}
