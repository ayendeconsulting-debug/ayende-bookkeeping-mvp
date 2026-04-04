import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';
import { welcomeTemplate, WelcomeTemplateVars } from './templates/welcome';
import { trialEndingTemplate, TrialEndingTemplateVars } from './templates/trial-ending';
import { paymentFailedTemplate, PaymentFailedTemplateVars } from './templates/payment-failed';
import { abandonedCartTemplate, AbandonedCartTemplateVars } from './templates/abandoned-cart';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private readonly resend: Resend;
  private readonly from: string;

  constructor(private readonly config: ConfigService) {
    this.resend = new Resend(this.config.get<string>('RESEND_API_KEY'));
    this.from = this.config.get<string>('EMAIL_FROM') ?? 'noreply@gettempo.ca';
  }

  // ── Core send method ──────────────────────────────────────────────────

  private async send(to: string, subject: string, html: string): Promise<void> {
    try {
      await this.resend.emails.send({ from: this.from, to, subject, html });
      this.logger.log(`Email sent → ${to} | ${subject}`);
    } catch (err) {
      // Fire-and-forget: log but never throw — email failures must not break API requests
      this.logger.error(`Email failed → ${to} | ${subject} | ${(err as Error).message}`);
    }
  }

  // ── Public send methods ───────────────────────────────────────────────

  async sendWelcome(to: string, vars: WelcomeTemplateVars): Promise<void> {
    await this.send(to, 'Welcome to Tempo — your free trial has started', welcomeTemplate(vars));
  }

  async sendTrialEnding(to: string, vars: TrialEndingTemplateVars): Promise<void> {
    const { subject, html } = trialEndingTemplate(vars);
    await this.send(to, subject, html);
  }

  async sendPaymentFailed(to: string, vars: PaymentFailedTemplateVars): Promise<void> {
    await this.send(to, 'Action required — payment failed for your Tempo subscription', paymentFailedTemplate(vars));
  }

  async sendAbandonedCart(to: string, vars: AbandonedCartTemplateVars): Promise<void> {
    await this.send(to, 'You left something behind — complete your Tempo setup', abandonedCartTemplate(vars));
  }
}
