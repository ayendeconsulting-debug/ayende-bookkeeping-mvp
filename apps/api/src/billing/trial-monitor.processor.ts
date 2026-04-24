import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { LessThan, Repository } from 'typeorm';
import { Job } from 'bullmq';
import { Subscription } from '../entities/subscription.entity';
import { EmailService } from '../email/email.service';
import { BusinessesService } from '../businesses/businesses.service';
import { ExpoPushService } from '../notifications/expo-push.service';
import { BillingAlertService } from './billing-alert.service';
import { PlaidService } from '../plaid/services/plaid.service';

export const TRIAL_MONITOR_QUEUE = 'trial-monitor';

// Phase 27.2 A-5: archive window after trial_expired_readonly.
const READONLY_ARCHIVE_WINDOW_DAYS = 90;

@Processor(TRIAL_MONITOR_QUEUE)
export class TrialMonitorProcessor extends WorkerHost {
  private readonly logger = new Logger(TrialMonitorProcessor.name);

  constructor(
    @InjectRepository(Subscription)
    private readonly subscriptionRepo: Repository<Subscription>,
    private readonly emailService: EmailService,
    private readonly businessesService: BusinessesService,
    private readonly expoPushService: ExpoPushService,
    private readonly billingAlertService: BillingAlertService,
    // Phase 27.2 A-5: Plaid disconnect on archive.
    private readonly plaidService: PlaidService,
  ) {
    super();
  }

  async process(_job: Job): Promise<void> {
    this.logger.log('Trial monitor CRON starting');

    // ---- Trial reminders (existing) -------------------------------------
    const trialingSubscriptions = await this.subscriptionRepo.find({
      where: { status: 'trialing' },
    });

    let sent = 0;
    let skipped = 0;

    for (const sub of trialingSubscriptions) {
      try {
        const didSend = await this.processSubscription(sub);
        if (didSend) sent++;
        else skipped++;
      } catch (err) {
        this.logger.error(
          `Trial monitor error for business ${sub.business_id}: ${(err as Error).message}`,
        );
        skipped++;
      }
    }

    this.logger.log(
      `Trial monitor complete: ${sent} emails sent, ${skipped} skipped`,
    );

    // ---- Payment failed pass --------------------------------------------
    // Runs on the same daily cron. Uses BillingAlertService.computeAlerts()
    // as the source of truth (keeps behaviour in sync with the in-app alert
    // banner). Idempotent per calendar month via a marker in the existing
    // trial_reminder_sent_at[] array.
    const pastDueSubscriptions = await this.subscriptionRepo.find({
      where: { status: 'past_due' },
    });

    this.logger.log(
      `Payment failed pass: checking ${pastDueSubscriptions.length} past_due subscriptions`,
    );

    let paymentPushSent = 0;
    for (const sub of pastDueSubscriptions) {
      try {
        const month   = new Date().toISOString().slice(0, 7); // 'YYYY-MM'
        const marker  = `payment_failed_${month}`;
        const already = sub.trial_reminder_sent_at ?? [];
        if (already.includes(marker)) continue;

        // Validate via the alert engine -- single source of truth.
        const alerts = await this.billingAlertService.computeAlerts(sub.business_id);
        const fail   = alerts.find(a => a.type === 'payment_failed');
        if (!fail) continue;

        const business = await this.businessesService.findById(sub.business_id);
        if (!business.expo_push_token) {
          // Still mark as "sent" to avoid re-querying every day.
          await this.subscriptionRepo.update(sub.id, {
            trial_reminder_sent_at: [...already, marker],
          });
          continue;
        }

        void this.expoPushService.send([{
          to: business.expo_push_token,
          title: 'Tempo Books',
          body: 'Payment failed. Update your card to avoid losing access.',
          data: { type: 'payment_failed' },
          sound: 'default',
          _businessId: business.id,
        }]);

        await this.subscriptionRepo.update(sub.id, {
          trial_reminder_sent_at: [...already, marker],
        });
        paymentPushSent++;
        this.logger.log(
          `Payment failed push sent for business ${sub.business_id} (${month})`,
        );
      } catch (err: any) {
        this.logger.error(
          `Payment failed push error for ${sub.business_id}: ${err?.message ?? err}`,
        );
      }
    }

    this.logger.log(
      `Payment failed pass complete: ${paymentPushSent} pushes sent`,
    );

    // ---- Phase 27.2 A-5: Trial expirations pass -------------------------
    // Transitions trialing -> trial_expired_readonly when the 14-day no-card
    // trial has ended and no payment method was collected.
    // Tight gate: only rows with trial_type = 'no_card_14d'. Legacy rows
    // (trial_type IS NULL, pre-Phase 27.2) are immune until manually migrated.
    await this.processTrialExpirations();

    // ---- Phase 27.2 A-5: Archival pass ----------------------------------
    // Transitions trial_expired_readonly -> archived after 90 days.
    // On archive, best-effort disconnect of all linked Plaid items.
    // Subscription is flipped to archived first; Plaid failures logged but
    // do not block the state transition.
    await this.processArchivals();
  }

  private async processSubscription(sub: Subscription): Promise<boolean> {
    if (!sub.trial_ends_at) return false;
    if (!sub.customer_email) return false;

    const msRemaining   = sub.trial_ends_at.getTime() - Date.now();
    const daysRemaining = Math.max(0, Math.ceil(msRemaining / (1000 * 60 * 60 * 24)));

    const thresholds = [14, 7, 3, 1];
    if (!thresholds.includes(daysRemaining)) return false;

    const threshold   = daysRemaining.toString();
    const alreadySent = sub.trial_reminder_sent_at ?? [];

    if (alreadySent.includes(threshold)) {
      this.logger.debug(
        `Trial reminder ${threshold}d already sent for business ${sub.business_id}`,
      );
      return false;
    }

    const frontendUrl  = process.env.FRONTEND_URL || 'https://gettempo.ca';
    const trialEndDate = sub.trial_ends_at.toLocaleDateString('en-CA', {
      year: 'numeric', month: 'long', day: 'numeric',
    });

    void this.emailService.sendTrialReminderCron(sub.customer_email, {
      daysRemaining,
      trialEndDate,
      portalUrl: `${frontendUrl}/settings`,
    });

    // Push notification piggyback -- shares the same threshold idempotency
    // as the email above (same alreadySent.includes(threshold) gate).
    try {
      const business = await this.businessesService.findById(sub.business_id);
      if (business.expo_push_token) {
        const plural = daysRemaining === 1 ? '' : 's';
        void this.expoPushService.send([{
          to: business.expo_push_token,
          title: 'Tempo Books',
          body: `Your trial ends in ${daysRemaining} day${plural}. Add a payment method to keep going.`,
          data: { type: 'trial_ending', daysLeft: daysRemaining },
          sound: 'default',
          _businessId: business.id,
        }]);
      }
    } catch (pushErr: any) {
      this.logger.warn(
        `Trial push for business ${sub.business_id} skipped: ${pushErr?.message ?? pushErr}`,
      );
    }

    // Mark threshold as sent -- idempotent on next CRON run
    const updatedSent = [...alreadySent, threshold];
    await this.subscriptionRepo.update(sub.id, {
      trial_reminder_sent_at: updatedSent,
    });

    this.logger.log(
      `Trial reminder (${threshold}d) sent -> ${sub.customer_email} | business: ${sub.business_id}`,
    );
    return true;
  }

  /**
   * Phase 27.2 A-5: Trial expirations pass.
   *
   * Transitions: trialing -> trial_expired_readonly
   *
   * Gate:
   *   - trial_type = 'no_card_14d'  (tight gate: legacy NULL rows immune)
   *   - trial_ends_at < now()
   *   - card_collected_at IS NULL   (Stripe checkout was never completed)
   *
   * Side-effect: sets readonly_started_at = now() so the archival pass
   * can track the 90-day window.
   */
  private async processTrialExpirations(): Promise<void> {
    const now = new Date();

    const expiring = await this.subscriptionRepo.find({
      where: {
        status: 'trialing',
        trial_type: 'no_card_14d',
        trial_ends_at: LessThan(now),
        card_collected_at: null,
      },
    });

    this.logger.log(
      `Trial expirations pass: found ${expiring.length} no_card_14d trials past expiry`,
    );

    let transitioned = 0;
    for (const sub of expiring) {
      try {
        await this.subscriptionRepo.update(sub.id, {
          status: 'trial_expired_readonly',
          readonly_started_at: now,
        });
        transitioned++;
        this.logger.log(
          `Trial expired -> readonly | business: ${sub.business_id} | trial_ended_at: ${sub.trial_ends_at?.toISOString()}`,
        );
      } catch (err: any) {
        this.logger.error(
          `Trial expiration transition failed for ${sub.business_id}: ${err?.message ?? err}`,
        );
      }
    }

    this.logger.log(
      `Trial expirations pass complete: ${transitioned} subscriptions transitioned to readonly`,
    );
  }

  /**
   * Phase 27.2 A-5: Archival pass.
   *
   * Transitions: trial_expired_readonly -> archived
   *
   * Gate:
   *   - readonly_started_at IS NOT NULL
   *   - readonly_started_at < now() - 90 days
   *
   * Side-effects:
   *   1. status = 'archived', archived_at = now()
   *   2. Best-effort Plaid /item/remove for all linked plaid_items
   *
   * Ordering: subscription flip happens FIRST. Plaid disconnects are
   * per-item try/catch and never block the archival state. A flaky Plaid
   * call cannot leave a subscription stuck in readonly indefinitely.
   * Residual Plaid items (if any) can be cleaned up by an admin tool later.
   */
  private async processArchivals(): Promise<void> {
    const now = new Date();
    const cutoff = new Date(
      now.getTime() - READONLY_ARCHIVE_WINDOW_DAYS * 24 * 60 * 60 * 1000,
    );

    const toArchive = await this.subscriptionRepo.find({
      where: {
        status: 'trial_expired_readonly',
        readonly_started_at: LessThan(cutoff),
      },
    });

    this.logger.log(
      `Archival pass: found ${toArchive.length} readonly subscriptions past ${READONLY_ARCHIVE_WINDOW_DAYS}-day window`,
    );

    let archived = 0;
    for (const sub of toArchive) {
      try {
        // Step 1: Flip subscription to archived. This happens first so a
        // Plaid failure cannot block archival.
        await this.subscriptionRepo.update(sub.id, {
          status: 'archived',
          archived_at: now,
        });
        archived++;
        this.logger.log(
          `Archived | business: ${sub.business_id} | readonly_started_at: ${sub.readonly_started_at?.toISOString()}`,
        );

        // Step 2: Best-effort Plaid disconnect per item.
        try {
          const items = await this.plaidService.getItemsForBusiness(sub.business_id);
          let disconnected = 0;
          let failed = 0;

          for (const item of items) {
            try {
              await this.plaidService.disconnectItem(item.id, sub.business_id);
              disconnected++;
            } catch (itemErr: any) {
              failed++;
              this.logger.error(
                `Plaid disconnect failed on archive | business: ${sub.business_id} | item: ${item.id} | ${itemErr?.message ?? itemErr}`,
              );
            }
          }

          this.logger.log(
            `Plaid disconnect summary | business: ${sub.business_id} | disconnected: ${disconnected} | failed: ${failed}`,
          );
        } catch (listErr: any) {
          // Failure to even list items is logged but does not revert archive.
          this.logger.error(
            `Plaid item list failed on archive | business: ${sub.business_id} | ${listErr?.message ?? listErr}`,
          );
        }
      } catch (err: any) {
        this.logger.error(
          `Archival transition failed for ${sub.business_id}: ${err?.message ?? err}`,
        );
      }
    }

    this.logger.log(
      `Archival pass complete: ${archived} subscriptions archived`,
    );
  }
}
