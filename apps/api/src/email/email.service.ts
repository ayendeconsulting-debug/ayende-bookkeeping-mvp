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

  // ── Core send method ───────────────────────────────────────────────────────
  private async send(to: string, subject: string, html: string): Promise<void> {
    try {
      await this.resend.emails.send({ from: this.from, to, subject, html });
      this.logger.log(`Email sent → ${to} | ${subject}`);
    } catch (err) {
      // Fire-and-forget: log but never throw — email failures must not break API requests
      this.logger.error(`Email failed → ${to} | ${subject} | ${(err as Error).message}`);
    }
  }

  // ── Public send methods ────────────────────────────────────────────────────
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

  // ── Phase 10: Staff invite ─────────────────────────────────────────────────
  async sendStaffInvite(to: string, vars: StaffInviteTemplateVars): Promise<void> {
    const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:40px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1);">
        <!-- Header -->
        <tr><td style="background:#1B3A5C;padding:32px 40px;">
          <p style="margin:0;color:#ffffff;font-size:22px;font-weight:bold;">Tempo Books</p>
        </td></tr>
        <!-- Body -->
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
        <!-- Footer -->
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

    await this.send(
      to,
      `You've been invited to join ${vars.firmName} on Tempo Books`,
      html,
    );
  }

  // ── Phase 11: Access request notification ──────────────────────────────────
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

  // ── Phase 11: Access response notification ─────────────────────────────────
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
          <p style="margin:0 0 16px;font-size:16px;color:#111827;">Access Request — <strong style="color:${colour};">${statusText}</strong></p>
          <p style="margin:0 0 24px;font-size:16px;color:#374151;">${bodyText}</p>
          <p style="margin:0;font-size:13px;color:#6b7280;">Log in to Tempo Books to view your firm portal.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
    await this.send(to, `Edit access request ${statusText.toLowerCase()} — Tempo Books`, html);
  }

}