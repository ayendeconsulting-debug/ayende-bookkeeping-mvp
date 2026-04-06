import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Job } from 'bullmq';
import Stripe from 'stripe';
import { AccountantFirm } from '../entities/accountant-firm.entity';
import { FirmClient, FirmClientStatus } from '../entities/firm-client.entity';
import { FirmStaff } from '../entities/firm-staff.entity';
import { Subscription } from '../entities/subscription.entity';

export const ACCOUNTANT_BILLING_QUEUE = 'accountant-billing';

export interface AccountantBillingJobData {
  yearMonth: string; // e.g. "2026-04"
}

@Processor(ACCOUNTANT_BILLING_QUEUE)
export class AccountantBillingProcessor extends WorkerHost {
  private readonly logger = new Logger(AccountantBillingProcessor.name);
  private readonly stripe: Stripe;

  constructor(
    @InjectRepository(AccountantFirm)
    private readonly firmRepo: Repository<AccountantFirm>,
    @InjectRepository(FirmClient)
    private readonly firmClientRepo: Repository<FirmClient>,
    @InjectRepository(FirmStaff)
    private readonly firmStaffRepo: Repository<FirmStaff>,
    @InjectRepository(Subscription)
    private readonly subscriptionRepo: Repository<Subscription>,
  ) {
    super();
    this.stripe = new Stripe(process.env.STRIPE_SECRET_KEY ?? '', {
      apiVersion: '2023-10-16' as any,
    });
  }

  async process(job: Job<AccountantBillingJobData>): Promise<void> {
    const { yearMonth } = job.data;
    this.logger.log(`Accountant billing job starting for ${yearMonth}`);

    // Guard: only run on last day of month
    if (!this.isLastDayOfMonth()) {
      this.logger.log(`Not last day of month — skipping billing report for ${yearMonth}`);
      return;
    }

    const firms = await this.firmRepo.find();
    let reported = 0;
    let skipped = 0;

    for (const firm of firms) {
      try {
        await this.reportFirmUsage(firm, yearMonth);
        reported++;
      } catch (err) {
        this.logger.error(
          `Failed to report usage for firm ${firm.id} (${firm.name}): ${(err as Error).message}`,
        );
        skipped++;
      }
    }

    this.logger.log(
      `Accountant billing job complete for ${yearMonth}: ${reported} reported, ${skipped} skipped`,
    );
  }

  // ── Per-firm usage reporting ───────────────────────────────────────────────

  private async reportFirmUsage(
    firm: AccountantFirm,
    yearMonth: string,
  ): Promise<void> {
    // Find the firm's subscription via stripe_customer_id
    if (!firm.stripe_customer_id) {
      this.logger.debug(`Firm ${firm.id} has no Stripe customer — skipping`);
      return;
    }

    // Find subscription for this firm's owner business
    // The firm owner's subscription holds the Stripe subscription ID
    const subscription = await this.subscriptionRepo
      .createQueryBuilder('s')
      .where('s.stripe_customer_id = :customerId', {
        customerId: firm.stripe_customer_id,
      })
      .getOne();

    if (!subscription) {
      this.logger.debug(`No subscription found for firm ${firm.id} — skipping`);
      return;
    }

    // Skip firms still in free trial
    if (
      subscription.trial_ends_at &&
      subscription.trial_ends_at > new Date()
    ) {
      this.logger.debug(`Firm ${firm.id} is in trial — skipping metered report`);
      return;
    }

    // Skip cancelled subscriptions
    if (subscription.status === 'cancelled') {
      this.logger.debug(`Firm ${firm.id} subscription cancelled — skipping`);
      return;
    }

    // Count active clients and staff
    const activeClients = await this.firmClientRepo.count({
      where: { firm_id: firm.id, status: FirmClientStatus.ACTIVE },
    });
    const staffCount = await this.firmStaffRepo.count({
      where: { firm_id: firm.id },
    });

    // Calculate billable units (base includes 5 clients + 3 seats)
    const billableClients = Math.max(0, activeClients - 5);
    const billableSeats = Math.max(0, staffCount - 3);

    this.logger.log(
      `Firm ${firm.name}: ${activeClients} clients (${billableClients} billable), ` +
        `${staffCount} staff (${billableSeats} billable)`,
    );

    // Get subscription items to find metered price item IDs
    const stripeSubscription = await this.stripe.subscriptions.retrieve(
      subscription.stripe_subscription_id,
      { expand: ['items'] },
    );

    const perClientPriceId = process.env.STRIPE_PER_CLIENT_MONTHLY_PRICE_ID;
    const staffSeatPriceId = process.env.STRIPE_STAFF_SEAT_MONTHLY_PRICE_ID;

    for (const item of stripeSubscription.items.data) {
      const priceId = item.price.id;

      if (priceId === perClientPriceId) {
        await this.reportUsageRecord(
          item.id,
          billableClients,
          `${firm.id}-${yearMonth}-clients`,
        );
      }

      if (priceId === staffSeatPriceId) {
        await this.reportUsageRecord(
          item.id,
          billableSeats,
          `${firm.id}-${yearMonth}-seats`,
        );
      }
    }
  }

  // ── Stripe usage record with idempotency ───────────────────────────────────

  private async reportUsageRecord(
    subscriptionItemId: string,
    quantity: number,
    idempotencyKey: string,
  ): Promise<void> {
    try {
      await (this.stripe.subscriptionItems as any).createUsageRecord(
        subscriptionItemId,
        {
          quantity,
          timestamp: Math.floor(Date.now() / 1000),
          action: 'set', // 'set' replaces current period usage — idempotent
        },
        {
          idempotencyKey,
        },
      );
      this.logger.log(
        `Usage record created: item=${subscriptionItemId} qty=${quantity} key=${idempotencyKey}`,
      );
    } catch (err) {
      // Idempotency key reuse = already reported — not an error
      const stripeErr = err as Stripe.errors.StripeError;
      if (stripeErr.code === 'idempotency_key_in_use') {
        this.logger.debug(`Usage already reported for key ${idempotencyKey} — skipping`);
        return;
      }
      throw err;
    }
  }

  // ── Last-day-of-month guard ────────────────────────────────────────────────

  private isLastDayOfMonth(): boolean {
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.getMonth() !== now.getMonth();
  }
}
