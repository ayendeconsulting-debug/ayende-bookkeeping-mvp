import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';
import { welcomeTemplate, WelcomeTemplateVars } from './templates/welcome';
import { trialEndingTemplate, TrialEndingTemplateVars } from './templates/trial-ending';
import { paymentFailedTemplate, PaymentFailedTemplateVars } from './templates/payment-failed';
import { abandonedCartTemplate, AbandonedCartTemplateVars } from './templates/abandoned-cart';

export interface StaffInviteTemplateVars {
  firstName: string;
  firmName: string;
  signUpUrl: string;
}

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private readonly resend: Resend;
  private readonly from: string;

  constructor(private readonly config: ConfigService) {
    this.resend = new Resend(this.config.get<string>('RESEND_API_KEY'));
    this.from = this.config.get<string>('EMAIL_FROM') ?? 'noreply@gettempo.ca';
  }

  // â”€â”€ Core send method â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  private async send(to: string, subject: string, html: string): Promise<void> {
    try {
      await this.resend.emails.send({ from: this.from, to, subject, html });
      this.logger.log(`Email sent â†’ ${to} | ${subject}`);
    } catch (err) {
      this.logger.error(`Email failed â†’ ${to} | ${subject} | ${(err as Error).message}`);
    }
  }

  // â”€â”€ Existing send methods â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  async sendWelcome(to: string, vars: WelcomeTemplateVars): Promise<void> {
    await this.send(to, 'Welcome to Tempo â€” your free trial has started', welcomeTemplate(vars));
  }

  async sendTrialEnding(to: string, vars: TrialEndingTemplateVars): Promise<void> {
    const { subject, html } = trialEndingTemplate(vars);
    await this.send(to, subject, html);
  }

  async sendPaymentFailed(to: string, vars: PaymentFailedTemplateVars): Promise<void> {
    await this.send(to, 'Action required â€” payment failed for your Tempo subscription', paymentFailedTemplate(vars));
  }

  async sendAbandonedCart(to: string, vars: AbandonedCartTemplateVars): Promise<void> {
    await this.send(to, 'You left something behind â€” complete your Tempo setup', abandonedCartTemplate(vars));
  }

  // â”€â”€ Phase 10: Staff invite â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  async sendStaffInvite(to: string, vars: StaffInviteTemplateVars): Promise<void> {
    const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:40px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1);">
        <tr><td style="background:#1B3A5C;padding:32px 40px;">
          <p style="margin:0;color:#ffffff;font-size:22px;font-weight:bold;">Tempo Books</p>
        </td></tr>
        <tr><td style="padding:40px;">
          <p style="margin:0 0 16px;font-size:16px;color:#111827;">Hi ${vars.firstName},</p>
          <p style="margin:0 0 16px;font-size:16px;color:#374151;">
            You've been invited to join <strong>${vars.firmName}</strong> on Tempo Books as a staff member.
          </p>
          <p style="margin:0 0 32px;font-size:16px;color:#374151;">
            Click the button below to create your account and accept the invitation.
          </p>
          <table cellpadding="0" cellspacing="0"><tr><td>
            <a href="${vars.signUpUrl}" style="display:inline-block;background:#E07B39;color:#ffffff;font-size:16px;font-weight:bold;text-decoration:none;padding:14px 28px;border-radius:6px;">
              Accept Invitation
            </a>
          </td></tr></table>
          <p style="margin:32px 0 0;font-size:14px;color:#6b7280;">
            If you weren't expecting this invitation, you can safely ignore this email.
          </p>
        </td></tr>
        <tr><td style="padding:24px 40px;border-top:1px solid #e5e7eb;">
          <p style="margin:0;font-size:12px;color:#9ca3af;">
            Tempo Books &mdash; gettempo.ca &mdash; This email was sent on behalf of ${vars.firmName}.
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
    await this.send(to, `You've been invited to join ${vars.firmName} on Tempo Books`, html);
  }

  // â”€â”€ Phase 11: Access request notification â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  async sendAccessRequest(to: string, vars: {
    firmName: string; accountantName: string; accessNote: string;
    requestedExpiry: string; approveUrl: string; denyUrl: string;
  }): Promise<void> {
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:40px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:8px;overflow:hidden;">
        <tr><td style="background:#1B3A5C;padding:32px 40px;"><p style="margin:0;color:#fff;font-size:22px;font-weight:bold;">Tempo Books</p></td></tr>
        <tr><td style="padding:40px;">
          <p style="margin:0 0 16px;font-size:16px;color:#374151;"><strong>${vars.firmName}</strong> has requested edit access to your Tempo Books account.</p>
          <table cellpadding="0" cellspacing="0" style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:6px;padding:16px;margin:0 0 24px;width:100%;"><tr><td>
            <p style="margin:0 0 8px;font-size:13px;color:#6b7280;">REASON</p>
            <p style="margin:0 0 16px;font-size:15px;color:#111827;">${vars.accessNote}</p>
            <p style="margin:0 0 8px;font-size:13px;color:#6b7280;">REQUESTED UNTIL</p>
            <p style="margin:0;font-size:15px;color:#111827;">${vars.requestedExpiry}</p>
          </td></tr></table>
          <table cellpadding="0" cellspacing="0"><tr>
            <td style="padding-right:12px;"><a href="${vars.approveUrl}" style="display:inline-block;background:#0F6E56;color:#fff;font-size:14px;font-weight:bold;text-decoration:none;padding:12px 24px;border-radius:6px;">Approve Access</a></td>
            <td><a href="${vars.denyUrl}" style="display:inline-block;background:#ef4444;color:#fff;font-size:14px;font-weight:bold;text-decoration:none;padding:12px 24px;border-radius:6px;">Deny</a></td>
          </tr></table>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
    await this.send(to, `${vars.firmName} has requested edit access to your books`, html);
  }

  // â”€â”€ Phase 11: Access response notification â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  async sendAccessResponse(to: string, vars: {
    firmName: string; decision: 'approved' | 'denied';
    businessName: string; expiresAt?: string;
  }): Promise<void> {
    const approved = vars.decision === 'approved';
    const colour = approved ? '#0F6E56' : '#ef4444';
    const statusText = approved ? 'Approved' : 'Denied';
    const bodyText = approved
      ? `Your edit access request has been approved. Access is valid until ${vars.expiresAt ?? 'further notice'}.`
      : 'Your edit access request has been denied by the client.';
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:40px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:8px;overflow:hidden;">
        <tr><td style="background:#1B3A5C;padding:32px 40px;"><p style="margin:0;color:#fff;font-size:22px;font-weight:bold;">Tempo Books</p></td></tr>
        <tr><td style="padding:40px;">
          <p style="margin:0 0 16px;font-size:16px;color:#111827;">Access Request â€” <strong style="color:${colour};">${statusText}</strong></p>
          <p style="margin:0 0 24px;font-size:16px;color:#374151;">${bodyText}</p>
          <p style="margin:0;font-size:13px;color:#6b7280;">Log in to Tempo Books to view your firm portal.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
    await this.send(to, `Edit access request ${statusText.toLowerCase()} â€” Tempo Books`, html);
  }

  // â”€â”€ Phase 13: Trial reminder (CRON-triggered) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  async sendTrialReminderCron(to: string, vars: {
    daysRemaining: number;
    trialEndDate: string;
    portalUrl: string;
  }): Promise<void> {
    const urgency = vars.daysRemaining <= 3;
    const accentColour = urgency ? '#dc2626' : '#E07B39';
    const dayText = vars.daysRemaining === 1
      ? '1 day'
      : `${vars.daysRemaining} days`;
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:40px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:8px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1);">
        <tr><td style="background:#1B3A5C;padding:32px 40px;"><p style="margin:0;color:#fff;font-size:22px;font-weight:bold;">Tempo Books</p></td></tr>
        <tr><td style="padding:40px;">
          <p style="margin:0 0 16px;font-size:16px;color:#111827;">Hi there,</p>
          <p style="margin:0 0 16px;font-size:16px;color:#374151;">
            Your Tempo Books free trial ends in <strong style="color:${accentColour};">${dayText}</strong> on ${vars.trialEndDate}.
          </p>
          <p style="margin:0 0 32px;font-size:16px;color:#374151;">
            To keep uninterrupted access to your books, reports, and bank sync, make sure your payment method is up to date before your trial ends.
          </p>
          <table cellpadding="0" cellspacing="0"><tr><td>
            <a href="${vars.portalUrl}" style="display:inline-block;background:${accentColour};color:#fff;font-size:16px;font-weight:bold;text-decoration:none;padding:14px 28px;border-radius:6px;">
              Manage Subscription
            </a>
          </td></tr></table>
          <p style="margin:32px 0 0;font-size:14px;color:#6b7280;">Questions? Reply to this email and we'll help you out.</p>
        </td></tr>
        <tr><td style="padding:24px 40px;border-top:1px solid #e5e7eb;">
          <p style="margin:0;font-size:12px;color:#9ca3af;">Tempo Books &mdash; gettempo.ca</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
    const subject = vars.daysRemaining === 1
      ? 'Your Tempo Books trial ends tomorrow'
      : `Your Tempo Books trial ends in ${dayText}`;
    await this.send(to, subject, html);
  }

  // â”€â”€ Phase 13: Upcoming payment â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  async sendUpcomingPayment(to: string, vars: {
    amount: string;
    renewalDate: string;
    planName: string;
    portalUrl: string;
  }): Promise<void> {
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:40px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:8px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1);">
        <tr><td style="background:#1B3A5C;padding:32px 40px;"><p style="margin:0;color:#fff;font-size:22px;font-weight:bold;">Tempo Books</p></td></tr>
        <tr><td style="padding:40px;">
          <p style="margin:0 0 16px;font-size:16px;color:#111827;">Hi there,</p>
          <p style="margin:0 0 16px;font-size:16px;color:#374151;">
            Your <strong>${vars.planName}</strong> subscription will renew on <strong>${vars.renewalDate}</strong> for <strong>${vars.amount}</strong>.
          </p>
          <p style="margin:0 0 32px;font-size:16px;color:#374151;">
            No action is needed if your payment details are up to date. To make changes, visit your subscription settings.
          </p>
          <table cellpadding="0" cellspacing="0"><tr><td>
            <a href="${vars.portalUrl}" style="display:inline-block;background:#1B3A5C;color:#fff;font-size:16px;font-weight:bold;text-decoration:none;padding:14px 28px;border-radius:6px;">
              Manage Subscription
            </a>
          </td></tr></table>
        </td></tr>
        <tr><td style="padding:24px 40px;border-top:1px solid #e5e7eb;">
          <p style="margin:0;font-size:12px;color:#9ca3af;">Tempo Books &mdash; gettempo.ca</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
    await this.send(to, `Your Tempo Books subscription renews on ${vars.renewalDate}`, html);
  }

  // â”€â”€ Phase 13: AI cap warning â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  async sendAiCapWarning(to: string, vars: {
    usageCount: number;
    cap: number;
    percentage: number;
    isAtCap: boolean;
    pricingUrl: string;
  }): Promise<void> {
    const accentColour = vars.isAtCap ? '#dc2626' : '#E07B39';
    const subject = vars.isAtCap
      ? 'Your Tempo Books AI quota has been reached'
      : `You've used ${vars.percentage}% of your Tempo Books AI quota`;
    const bodyText = vars.isAtCap
      ? `You've used all <strong>${vars.cap} AI credits</strong> for this month. AI features are paused until next month or until you upgrade.`
      : `You've used <strong>${vars.usageCount} of ${vars.cap} AI credits</strong> this month (${vars.percentage}%). Upgrade to Pro for a higher limit.`;
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:40px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:8px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1);">
        <tr><td style="background:#1B3A5C;padding:32px 40px;"><p style="margin:0;color:#fff;font-size:22px;font-weight:bold;">Tempo Books</p></td></tr>
        <tr><td style="padding:40px;">
          <p style="margin:0 0 16px;font-size:16px;color:#111827;">Hi there,</p>
          <p style="margin:0 0 32px;font-size:16px;color:#374151;">${bodyText}</p>
          <table cellpadding="0" cellspacing="0"><tr><td>
            <a href="${vars.pricingUrl}" style="display:inline-block;background:${accentColour};color:#fff;font-size:16px;font-weight:bold;text-decoration:none;padding:14px 28px;border-radius:6px;">
              Upgrade Plan
            </a>
          </td></tr></table>
        </td></tr>
        <tr><td style="padding:24px 40px;border-top:1px solid #e5e7eb;">
          <p style="margin:0;font-size:12px;color:#9ca3af;">Tempo Books &mdash; gettempo.ca</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
    await this.send(to, subject, html);
  }

  // â”€â”€ Phase 13: Cancellation confirmation â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  async sendCancellationConfirmation(to: string, vars: {
    planName: string;
    accessEndDate: string;
    resubscribeUrl: string;
  }): Promise<void> {
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:40px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:8px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1);">
        <tr><td style="background:#1B3A5C;padding:32px 40px;"><p style="margin:0;color:#fff;font-size:22px;font-weight:bold;">Tempo Books</p></td></tr>
        <tr><td style="padding:40px;">
          <p style="margin:0 0 16px;font-size:16px;color:#111827;">Hi there,</p>
          <p style="margin:0 0 16px;font-size:16px;color:#374151;">
            Your <strong>${vars.planName}</strong> subscription has been cancelled. You'll retain access to all features until <strong>${vars.accessEndDate}</strong>.
          </p>
          <p style="margin:0 0 32px;font-size:16px;color:#374151;">
            Changed your mind? You can resubscribe at any time to restore full access.
          </p>
          <table cellpadding="0" cellspacing="0"><tr><td>
            <a href="${vars.resubscribeUrl}" style="display:inline-block;background:#0F6E56;color:#fff;font-size:16px;font-weight:bold;text-decoration:none;padding:14px 28px;border-radius:6px;">
              Resubscribe
            </a>
          </td></tr></table>
        </td></tr>
        <tr><td style="padding:24px 40px;border-top:1px solid #e5e7eb;">
          <p style="margin:0;font-size:12px;color:#9ca3af;">Tempo Books &mdash; gettempo.ca</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
    await this.send(to, 'Your Tempo Books subscription has been cancelled', html);
  }
}

