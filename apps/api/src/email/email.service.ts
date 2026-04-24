import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';
import { welcomeTemplate, WelcomeTemplateVars } from './templates/welcome';
import { trialEndingTemplate, TrialEndingTemplateVars } from './templates/trial-ending';
import { paymentFailedTemplate, PaymentFailedTemplateVars } from './templates/payment-failed';
import { abandonedCartTemplate, AbandonedCartTemplateVars } from './templates/abandoned-cart';
import { invoiceEmailTemplate, InvoiceEmailVars } from './templates/invoice-email';
import { EmailTemplatesService } from '../command-center/email-templates.service';

export interface StaffInviteTemplateVars {
  firstName: string;
  firmName: string;
  signUpUrl: string;
}

// Phase 27.2 A-8 template vars
export interface MbgReceiptTemplateVars {
  firstName: string;
  planName: string;
  amountCharged: string;
  mbgEndDate: string;
  portalUrl: string;
}

export interface TrialExpiredReadonlyTemplateVars {
  firstName: string;
  archiveDate: string;
  reactivationUrl: string;
}

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private readonly resend: Resend;
  private readonly from: string;

  constructor(
    private readonly config: ConfigService,
    private readonly emailTemplatesService: EmailTemplatesService,
  ) {
    this.resend = new Resend(this.config.get<string>('RESEND_API_KEY'));
    this.from = this.config.get<string>('EMAIL_FROM') ?? 'noreply@gettempo.ca';
  }

  // ── Core hardcoded send (fallback) ────────────────────────────────────────
  private async send(to: string, subject: string, html: string, from?: string): Promise<void> {
    try {
      await this.resend.emails.send({ from: from ?? this.from, to, subject, html });
      this.logger.log(`Email sent → ${to} | ${subject}`);
    } catch (err) {
      this.logger.error(`Email failed → ${to} | ${subject} | ${(err as Error).message}`);
    }
  }

  // ── Welcome (trial started) ───────────────────────────────────────────────
  async sendWelcome(to: string, vars: WelcomeTemplateVars): Promise<void> {
    const sent = await this.emailTemplatesService.sendFromTemplate('signup_welcome', to, {
      first_name:    vars.firstName,
      dashboard_url: vars.dashboardUrl,
    });
    if (!sent) {
      await this.send(to, 'Welcome to Tempo \u2014 your free trial has started', welcomeTemplate(vars));
    }
  }

  // ── Trial ending ──────────────────────────────────────────────────────────
  async sendTrialEnding(to: string, vars: TrialEndingTemplateVars): Promise<void> {
    const { subject: fallbackSubject, html: fallbackHtml } = trialEndingTemplate(vars);

    // Pre-render conditional parts
    let headlineText: string;
    let bodyText: string;
    let heroBg: string;
    let heroColour: string;

    if (vars.daysRemaining === 0) {
      headlineText = 'Your free trial ends today.';
      bodyText     = `Your ${vars.planName} plan will continue and your payment method will be charged <strong>${vars.planPrice}/${vars.billingCycle === 'monthly' ? 'month' : 'year'}</strong>. Everything stays exactly as it is.`;
      heroBg       = '#FEF3C7';
      heroColour   = '#92400E';
    } else if (vars.daysRemaining <= 3) {
      headlineText = `Your Tempo free trial ends in ${vars.daysRemaining} days.`;
      bodyText     = `Your ${vars.planName} plan will continue automatically at <strong>${vars.planPrice}/${vars.billingCycle === 'monthly' ? 'month' : 'year'}</strong>. Your payment method will be charged on <strong>${vars.trialEndDate}</strong>.`;
      heroBg       = '#FEF9EC';
      heroColour   = '#92400E';
    } else {
      headlineText = `Your Tempo free trial ends in ${vars.daysRemaining} days.`;
      bodyText     = `After that, you'll be charged <strong>${vars.planPrice}/${vars.billingCycle === 'monthly' ? 'month' : 'year'}</strong> for your ${vars.planName} plan. No action needed \u2014 your subscription continues automatically on <strong>${vars.trialEndDate}</strong>.`;
      heroBg       = '#EDF7F2';
      heroColour   = '#065F46';
    }

    const subjectLine = vars.daysRemaining === 0
      ? 'Your Tempo trial ends today'
      : `Your Tempo trial ends in ${vars.daysRemaining} days`;

    const sent = await this.emailTemplatesService.sendFromTemplate('trial_ending', to, {
      first_name:   vars.firstName,
      subject_line: subjectLine,
      headline_text: headlineText,
      hero_bg:      heroBg,
      hero_colour:  heroColour,
      body_text:    bodyText,
      portal_url:   vars.portalUrl,
    });
    if (!sent) {
      await this.send(to, fallbackSubject, fallbackHtml);
    }
  }

  // ── Payment failed ────────────────────────────────────────────────────────
  async sendPaymentFailed(to: string, vars: PaymentFailedTemplateVars): Promise<void> {
    const retryNote = vars.nextRetryDate
      ? `Stripe will retry automatically on <strong>${vars.nextRetryDate}</strong>, but we recommend updating your payment method now to avoid any interruption.`
      : 'Please update your payment method to keep access to your account.';

    const sent = await this.emailTemplatesService.sendFromTemplate('payment_failed', to, {
      first_name: vars.firstName,
      amount:     vars.amount,
      plan_name:  vars.planName,
      retry_note: retryNote,
      portal_url: vars.portalUrl,
    });
    if (!sent) {
      await this.send(
        to,
        'Action required \u2014 payment failed for your Tempo subscription',
        paymentFailedTemplate(vars),
      );
    }
  }

  // ── Abandoned cart ────────────────────────────────────────────────────────
  async sendAbandonedCart(to: string, vars: AbandonedCartTemplateVars): Promise<void> {
    const sent = await this.emailTemplatesService.sendFromTemplate('abandoned_cart', to, {
      checkout_url: vars.checkoutUrl,
    });
    if (!sent) {
      await this.send(
        to,
        'You left something behind \u2014 complete your Tempo setup',
        abandonedCartTemplate(vars),
      );
    }
  }

  // ── Invoice ───────────────────────────────────────────────────────────────
  async sendInvoice(to: string, vars: InvoiceEmailVars): Promise<void> {
    const { subject: fallbackSubject, html: fallbackHtml } = invoiceEmailTemplate(vars);

    // Pre-render dynamic HTML blocks
    const lineItemsHtml = vars.lineItems.map((item) =>
      `<tr>
        <td style="padding:8px 12px;border-bottom:1px solid #f3f4f6;color:#374151;">${item.description}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #f3f4f6;color:#374151;text-align:center;">${item.quantity}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #f3f4f6;color:#374151;text-align:right;">$${Number(item.unit_price).toFixed(2)}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #f3f4f6;color:#374151;text-align:right;font-weight:600;">$${Number(item.line_total).toFixed(2)}</td>
      </tr>`,
    ).join('');

    const notesHtml = vars.notes
      ? `<p style="font-size:14px;color:#6B7280;border-top:1px solid #f3f4f6;padding-top:16px;">${vars.notes}</p>`
      : '';

    const paymentButtonHtml = vars.stripePaymentLink
      ? `<div style="text-align:center;margin:32px 0;"><a href="${vars.stripePaymentLink}" style="display:inline-block;background:#0F6E56;color:#ffffff;text-decoration:none;padding:14px 32px;border-radius:8px;font-size:16px;font-weight:600;">Pay Now</a></div>`
      : '';

    let reminderBannerHtml = '';
    if (vars.isOverdue) {
      reminderBannerHtml = `<div style="background:#FEF2F2;border:1px solid #FECACA;border-radius:8px;padding:12px 16px;margin-bottom:24px;"><p style="margin:0;font-size:14px;color:#B91C1C;">This invoice is <strong>overdue</strong>. Please arrange payment at your earliest convenience.</p></div>`;
    } else if (vars.isReminder) {
      reminderBannerHtml = `<div style="background:#FFFBEB;border:1px solid #FDE68A;border-radius:8px;padding:12px 16px;margin-bottom:24px;"><p style="margin:0;font-size:14px;color:#92400E;">This is a friendly reminder that invoice ${vars.invoiceNumber} is due in <strong>${vars.daysUntilDue} day${vars.daysUntilDue === 1 ? '' : 's'}</strong>.</p></div>`;
    }

    const sent = await this.emailTemplatesService.sendFromTemplate('invoice_email', to, {
      invoice_subject:     fallbackSubject,
      client_name:         vars.clientName,
      business_name:       vars.businessName,
      invoice_number:      vars.invoiceNumber,
      issue_date:          vars.issueDate,
      due_date:            vars.dueDate,
      total:               vars.total,
      line_items_html:     lineItemsHtml,
      notes_html:          notesHtml,
      payment_button_html: paymentButtonHtml,
      reminder_banner_html: reminderBannerHtml,
    });
    if (!sent) {
      await this.send(to, fallbackSubject, fallbackHtml);
    }
  }

  // ── Staff invite ──────────────────────────────────────────────────────────
  async sendStaffInvite(to: string, vars: StaffInviteTemplateVars): Promise<void> {
    const sent = await this.emailTemplatesService.sendFromTemplate('staff_invite', to, {
      first_name:  vars.firstName,
      firm_name:   vars.firmName,
      sign_up_url: vars.signUpUrl,
    });
    if (!sent) {
      await this.send(
        to,
        `You've been invited to join ${vars.firmName} on Tempo Books`,
        this.staffInviteFallback(vars),
      );
    }
  }

  // ── Access request ────────────────────────────────────────────────────────
  async sendAccessRequest(to: string, vars: {
    firmName: string; accountantName: string; accessNote: string;
    requestedExpiry: string; approveUrl: string; denyUrl: string;
  }): Promise<void> {
    const sent = await this.emailTemplatesService.sendFromTemplate('access_request', to, {
      firm_name:        vars.firmName,
      access_note:      vars.accessNote,
      requested_expiry: vars.requestedExpiry,
      approve_url:      vars.approveUrl,
      deny_url:         vars.denyUrl,
    });
    if (!sent) {
      await this.send(to, `${vars.firmName} has requested edit access to your books`, this.accessRequestFallback(vars));
    }
  }

  // ── Access response ───────────────────────────────────────────────────────
  async sendAccessResponse(to: string, vars: {
    firmName: string; decision: 'approved' | 'denied';
    businessName: string; expiresAt?: string;
  }): Promise<void> {
    const approved   = vars.decision === 'approved';
    const statusWord = approved ? 'Approved' : 'Denied';
    const statusColour = approved ? '#0F6E56' : '#ef4444';
    const bodyText   = approved
      ? `Your edit access request has been approved. Access is valid until ${vars.expiresAt ?? 'further notice'}.`
      : 'Your edit access request has been denied by the client.';

    const sent = await this.emailTemplatesService.sendFromTemplate('access_response', to, {
      firm_name:     vars.firmName,
      status_word:   statusWord,
      status_colour: statusColour,
      body_text:     bodyText,
      business_name: vars.businessName,
    });
    if (!sent) {
      await this.send(
        to,
        `Edit access request ${statusWord.toLowerCase()} \u2014 Tempo Books`,
        this.accessResponseFallback(vars),
      );
    }
  }

  // ── Trial reminder cron ───────────────────────────────────────────────────
  async sendTrialReminderCron(to: string, vars: {
    daysRemaining: number; trialEndDate: string; portalUrl: string;
  }): Promise<void> {
    const urgency       = vars.daysRemaining <= 3;
    const accentColour  = urgency ? '#dc2626' : '#E07B39';
    const dayText       = vars.daysRemaining === 1 ? '1 day' : `${vars.daysRemaining} days`;
    const reminderSubject = vars.daysRemaining === 1
      ? 'Your Tempo Books trial ends tomorrow'
      : `Your Tempo Books trial ends in ${dayText}`;

    const sent = await this.emailTemplatesService.sendFromTemplate('trial_reminder_cron', to, {
      reminder_subject: reminderSubject,
      day_text:         dayText,
      trial_end_date:   vars.trialEndDate,
      accent_colour:    accentColour,
      portal_url:       vars.portalUrl,
    });
    if (!sent) {
      await this.send(to, reminderSubject, this.trialReminderFallback(vars));
    }
  }

  // ── Upcoming payment ──────────────────────────────────────────────────────
  async sendUpcomingPayment(to: string, vars: {
    amount: string; renewalDate: string; planName: string; portalUrl: string;
  }): Promise<void> {
    const sent = await this.emailTemplatesService.sendFromTemplate('upcoming_payment', to, {
      plan_name:    vars.planName,
      renewal_date: vars.renewalDate,
      amount:       vars.amount,
      portal_url:   vars.portalUrl,
    });
    if (!sent) {
      await this.send(
        to,
        `Your Tempo Books subscription renews on ${vars.renewalDate}`,
        this.upcomingPaymentFallback(vars),
      );
    }
  }

  // ── AI cap warning ────────────────────────────────────────────────────────
  async sendAiCapWarning(to: string, vars: {
    usageCount: number; cap: number; percentage: number;
    isAtCap: boolean; pricingUrl: string;
  }): Promise<void> {
    const accentColour   = vars.isAtCap ? '#dc2626' : '#E07B39';
    const warnSubject    = vars.isAtCap
      ? 'Your Tempo Books AI quota has been reached'
      : `You've used ${vars.percentage}% of your Tempo Books AI quota`;
    const bodyText       = vars.isAtCap
      ? `You've used all <strong>${vars.cap} AI credits</strong> for this month. AI features are paused until next month or until you upgrade.`
      : `You've used <strong>${vars.usageCount} of ${vars.cap} AI credits</strong> this month (${vars.percentage}%). Upgrade to Pro for a higher limit.`;

    const sent = await this.emailTemplatesService.sendFromTemplate('ai_cap_warning', to, {
      warning_subject: warnSubject,
      body_text:       bodyText,
      accent_colour:   accentColour,
      pricing_url:     vars.pricingUrl,
    });
    if (!sent) {
      await this.send(to, warnSubject, this.aiCapFallback(vars));
    }
  }

  // ── Cancellation confirmation ─────────────────────────────────────────────
  async sendCancellationConfirmation(to: string, vars: {
    planName: string; accessEndDate: string; resubscribeUrl: string;
  }): Promise<void> {
    const sent = await this.emailTemplatesService.sendFromTemplate('cancellation_confirmation', to, {
      plan_name:        vars.planName,
      access_end_date:  vars.accessEndDate,
      resubscribe_url:  vars.resubscribeUrl,
    });
    if (!sent) {
      await this.send(
        to,
        'Your Tempo Books subscription has been cancelled',
        this.cancellationFallback(vars),
      );
    }
  }

  // ── Lead acknowledgement ──────────────────────────────────────────────────
  async sendLeadAcknowledgement(to: string, vars: { firstName: string }): Promise<void> {
    await this.emailTemplatesService.sendFromTemplate('lead_acknowledgement', to, {
      first_name: vars.firstName,
    });
  }

  // MBG receipt (Phase 27.2 A-8 -- Accountant Monthly signup)
  async sendMbgReceipt(to: string, vars: MbgReceiptTemplateVars): Promise<void> {
    const sent = await this.emailTemplatesService.sendFromTemplate('mbg_receipt', to, {
      first_name:     vars.firstName,
      plan_name:      vars.planName,
      amount_charged: vars.amountCharged,
      mbg_end_date:   vars.mbgEndDate,
      portal_url:     vars.portalUrl,
    });
    if (!sent) {
      await this.send(
        to,
        'Welcome to Tempo Books -- your 30-day money-back guarantee',
        this.mbgReceiptFallback(vars),
      );
    }
  }

  // Trial expired readonly (Phase 27.2 A-8 -- cron-driven)
  async sendTrialExpiredReadonly(to: string, vars: TrialExpiredReadonlyTemplateVars): Promise<void> {
    const sent = await this.emailTemplatesService.sendFromTemplate('trial_expired_readonly', to, {
      first_name:       vars.firstName,
      archive_date:     vars.archiveDate,
      reactivation_url: vars.reactivationUrl,
    });
    if (!sent) {
      await this.send(
        to,
        'Your Tempo Books trial ended -- your data is safe',
        this.trialExpiredReadonlyFallback(vars),
      );
    }
  }

  // ── Minimal hardcoded fallbacks (used only if DB template missing) ─────────
  private staffInviteFallback(vars: StaffInviteTemplateVars): string {
    return `<p>Hi ${vars.firstName}, you've been invited to join ${vars.firmName} on Tempo Books. <a href="${vars.signUpUrl}">Accept invitation</a></p>`;
  }
  private accessRequestFallback(vars: any): string {
    return `<p>${vars.firmName} has requested edit access to your books until ${vars.requestedExpiry}. <a href="${vars.approveUrl}">Approve</a> | <a href="${vars.denyUrl}">Deny</a></p>`;
  }
  private accessResponseFallback(vars: any): string {
    const approved = vars.decision === 'approved';
    return `<p>Your edit access request was ${approved ? 'approved' : 'denied'}.</p>`;
  }
  private trialReminderFallback(vars: any): string {
    return `<p>Your trial ends in ${vars.daysRemaining} days on ${vars.trialEndDate}. <a href="${vars.portalUrl}">Manage subscription</a></p>`;
  }
  private upcomingPaymentFallback(vars: any): string {
    return `<p>Your ${vars.planName} renews on ${vars.renewalDate} for ${vars.amount}. <a href="${vars.portalUrl}">Manage subscription</a></p>`;
  }
  private aiCapFallback(vars: any): string {
    return `<p>You've used ${vars.usageCount} of ${vars.cap} AI credits. <a href="${vars.pricingUrl}">Upgrade</a></p>`;
  }
  private cancellationFallback(vars: any): string {
    return `<p>Your ${vars.planName} subscription has been cancelled. Access ends ${vars.accessEndDate}. <a href="${vars.resubscribeUrl}">Resubscribe</a></p>`;
  }
  private mbgReceiptFallback(vars: MbgReceiptTemplateVars): string {
    return `<p>Hi ${vars.firstName}, your ${vars.planName} subscription is active. You've been charged ${vars.amountCharged}. 30-day money-back guarantee runs through ${vars.mbgEndDate}. <a href="${vars.portalUrl}">Dashboard</a></p>`;
  }
  private trialExpiredReadonlyFallback(vars: TrialExpiredReadonlyTemplateVars): string {
    return `<p>Hi ${vars.firstName}, your trial has ended and your account is in read-only mode. Data preserved until ${vars.archiveDate}. <a href="${vars.reactivationUrl}">Subscribe to restore access</a></p>`;
  }
}
