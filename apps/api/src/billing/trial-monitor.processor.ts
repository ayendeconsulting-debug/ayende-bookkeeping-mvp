import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Job } from 'bullmq';
import { Subscription } from '../entities/subscription.entity';
import { EmailService } from '../email/email.service';
import { BusinessesService } from '../businesses/businesses.service';
import { ExpoPushService } from '../notifications/expo-push.service';
import { BillingAlertService } from './billing-alert.service';

export const TRIAL_MONITOR_QUEUE = 'trial-monitor';

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
  ) {
    super();
  }

  async process(_job: Job): Promise<void> {
    this.logger.log('Trial monitor CRON starting');

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
}
