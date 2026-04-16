import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EmailTemplate } from './email-template.entity';

// ── Shared brand helpers ──────────────────────────────────────────────────────

const LOGO = `<img src="https://gettempo.ca/logo.svg" alt="Tempo Books" width="140" height="38"
     style="display:block;border:0;outline:none;text-decoration:none;"
     onerror="this.style.display='none'"/>`;

const HEADER = `
  <tr><td style="background:#0F6E56;padding:24px 40px;">${LOGO}</td></tr>`;

const FOOTER = `
  <tr>
    <td style="background:#f4f4f5;padding:24px 40px;border-top:1px solid #e5e7eb;">
      <p style="margin:0;font-size:13px;color:#888888;">
        Tempo Books &mdash; <a href="https://gettempo.ca" style="color:#0F6E56;text-decoration:none;">gettempo.ca</a>
        &mdash; Support: <a href="mailto:support@gettempo.ca" style="color:#0F6E56;text-decoration:none;">support@gettempo.ca</a>
      </p>
    </td>
  </tr>`;

function wrap(content: string): string {
  return `<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1.0"/></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:40px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0"
             style="max-width:600px;background:#ffffff;border-radius:8px;overflow:hidden;border:1px solid #e5e7eb;">
        ${HEADER}${content}${FOOTER}
      </table>
    </td></tr>
  </table>
</body></html>`;
}

function hero(text: string, bg = '#EDF7F2', colour = '#0F6E56', borderColour = '#c6e8d8'): string {
  return `
  <tr>
    <td style="background:${bg};padding:20px 40px;border-bottom:1px solid ${borderColour};">
      <p style="margin:0;font-size:17px;font-weight:bold;color:${colour};font-family:Arial,sans-serif;">${text}</p>
    </td>
  </tr>`;
}

function cta(label: string, urlPlaceholder: string, colour = '#0F6E56'): string {
  return `
  <table cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
    <tr><td style="background:${colour};border-radius:6px;">
      <a href="${urlPlaceholder}"
         style="display:inline-block;padding:14px 32px;font-size:16px;font-weight:bold;color:#ffffff;text-decoration:none;font-family:Arial,sans-serif;">
        ${label}
      </a>
    </td></tr>
  </table>`;
}

function step(n: number, strong: string, rest: string): string {
  return `
  <tr>
    <td style="padding:10px 0;border-bottom:1px solid #f0f0f0;vertical-align:top;width:32px;">
      <span style="display:inline-block;width:24px;height:24px;background:#0F6E56;border-radius:50%;
                   color:#fff;font-size:13px;font-weight:bold;text-align:center;line-height:24px;">${n}</span>
    </td>
    <td style="padding:10px 0 10px 12px;border-bottom:1px solid #f0f0f0;">
      <p style="margin:0;font-size:15px;color:#333333;"><strong>${strong}</strong> ${rest}</p>
    </td>
  </tr>`;
}

// ── Template definitions ──────────────────────────────────────────────────────

interface SeedTemplate {
  name: string;
  description: string;
  subject: string;
  html_body: string;
  from_email: string;
  from_name: string;
  variables: string[];
}

const TEMPLATES: SeedTemplate[] = [

  // 1 ── signup_welcome ────────────────────────────────────────────────────────
  {
    name:        'signup_welcome',
    description: 'Sent to every new user immediately after sign-up via user.created automation',
    subject:     'Welcome to Tempo Books \u2014 you\u2019re in.',
    from_email:  'admin@gettempo.ca',
    from_name:   'Adesanya Ehinmidu',
    variables:   ['first_name', 'dashboard_url'],
    html_body: wrap(`
  ${hero('Welcome to Tempo Books \u2014 you\u2019re in.')}
  <tr><td style="padding:36px 40px;">
    <p style="margin:0 0 16px;font-size:16px;color:#333333;">Hi {{first_name}},</p>
    <p style="margin:0 0 20px;font-size:16px;color:#333333;line-height:1.7;">
      Tempo Books was built because too many individuals and small business owners lose financial control
      not from lack of effort, but from lack of the right tools and structure. This platform exists to give
      every business \u2014 no matter its size \u2014 the clarity, confidence, and systems that used to be
      reserved for enterprises with full accounting teams.
    </p>
    <p style="margin:0 0 8px;font-size:16px;color:#333333;font-weight:bold;">Your next steps:</p>
    <table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 28px;">
      ${step(1, 'Set up your business', '\u2014 choose your mode: Business, Freelancer, or Personal')}
      ${step(2, 'Connect your bank', '\u2014 sync transactions automatically with Plaid')}
      ${step(3, 'Categorize your first transactions', '\u2014 Tempo will learn your patterns over time')}
      ${step(4, 'Run your first report', '\u2014 your Income Statement is ready whenever you are')}
    </table>
    <table width="100%" cellpadding="0" cellspacing="0"
           style="background:#EDF7F2;border-radius:6px;margin:0 0 28px;">
      <tr><td style="padding:16px 20px;">
        <p style="margin:0;font-size:15px;color:#065F46;">
          <strong>Need help?</strong> Email us at
          <a href="mailto:support@gettempo.ca" style="color:#0F6E56;">support@gettempo.ca</a>
          \u2014 we respond within one business day.
        </p>
      </td></tr>
    </table>
    ${cta('Go to my dashboard \u2192', '{{dashboard_url}}')}
    <p style="margin:0;font-size:15px;color:#555555;">
      Adesanya Ehinmidu<br/>
      <span style="color:#888888;">Founder \u2014 Tempo Books</span>
    </p>
  </td></tr>`),
  },

  // 2 ── admin_signup_alert ────────────────────────────────────────────────────
  {
    name:        'admin_signup_alert',
    description: 'Hardwired admin notification on every user.created event',
    subject:     'New signup \u2014 {{full_name}} ({{email}})',
    from_email:  'noreply@gettempo.ca',
    from_name:   'Tempo Books',
    variables:   ['full_name', 'email', 'signed_up_at'],
    html_body: wrap(`
  ${hero('New Signup \u2014 Tempo Books')}
  <tr><td style="padding:32px 40px;">
    <p style="margin:0 0 20px;font-size:15px;color:#374151;">A new user has signed up for Tempo Books.</p>
    <table cellpadding="0" cellspacing="0"
           style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:6px;padding:20px;width:100%;">
      <tr><td style="padding-bottom:14px;">
        <p style="margin:0 0 3px;font-size:11px;color:#6b7280;text-transform:uppercase;letter-spacing:.06em;">Name</p>
        <p style="margin:0;font-size:16px;font-weight:600;color:#111827;">{{full_name}}</p>
      </td></tr>
      <tr><td style="padding-bottom:14px;">
        <p style="margin:0 0 3px;font-size:11px;color:#6b7280;text-transform:uppercase;letter-spacing:.06em;">Email</p>
        <p style="margin:0;font-size:16px;color:#111827;">{{email}}</p>
      </td></tr>
      <tr><td>
        <p style="margin:0 0 3px;font-size:11px;color:#6b7280;text-transform:uppercase;letter-spacing:.06em;">Signed up</p>
        <p style="margin:0;font-size:15px;color:#111827;">{{signed_up_at}}</p>
      </td></tr>
    </table>
  </td></tr>`),
  },

  // 3 ── trial_ending ──────────────────────────────────────────────────────────
  {
    name:        'trial_ending',
    description: 'Trial ending notification — body_text and subject_line are pre-rendered by EmailService',
    subject:     '{{subject_line}}',
    from_email:  'noreply@gettempo.ca',
    from_name:   'Tempo Books',
    variables:   ['first_name', 'subject_line', 'headline_text', 'hero_bg', 'hero_colour', 'body_text', 'portal_url'],
    html_body: wrap(`
  <tr>
    <td style="background:{{hero_bg}};padding:20px 40px;border-bottom:1px solid #e5e7eb;">
      <p style="margin:0;font-size:17px;font-weight:bold;color:{{hero_colour}};font-family:Arial,sans-serif;">
        {{headline_text}}
      </p>
    </td>
  </tr>
  <tr><td style="padding:36px 40px;">
    <p style="margin:0 0 20px;font-size:16px;color:#333333;">Hi {{first_name}},</p>
    <p style="margin:0 0 28px;font-size:16px;color:#333333;line-height:1.6;">{{body_text}}</p>
    <p style="margin:0 0 24px;font-size:15px;color:#555555;">
      Want to review or change your plan?
    </p>
    ${cta('Manage your subscription \u2192', '{{portal_url}}')}
  </td></tr>`),
  },

  // 4 ── payment_failed ────────────────────────────────────────────────────────
  {
    name:        'payment_failed',
    description: 'Stripe payment failure alert — retry_note is pre-rendered by EmailService',
    subject:     'Action required \u2014 payment failed for your Tempo subscription',
    from_email:  'noreply@gettempo.ca',
    from_name:   'Tempo Books',
    variables:   ['first_name', 'amount', 'plan_name', 'retry_note', 'portal_url'],
    html_body: wrap(`
  <tr>
    <td style="background:#FEF2F2;padding:20px 40px;border-bottom:1px solid #FECACA;border-left:4px solid #DC2626;">
      <p style="margin:0;font-size:17px;font-weight:bold;color:#DC2626;font-family:Arial,sans-serif;">
        &#9888; Payment failed \u2014 action required
      </p>
    </td>
  </tr>
  <tr><td style="padding:36px 40px;">
    <p style="margin:0 0 16px;font-size:16px;color:#333333;">Hi {{first_name}},</p>
    <p style="margin:0 0 20px;font-size:16px;color:#333333;line-height:1.6;">
      We weren\u2019t able to process your payment of <strong>{{amount}}</strong>
      for your Tempo {{plan_name}} subscription.
    </p>
    <p style="margin:0 0 28px;font-size:16px;color:#333333;line-height:1.6;">{{retry_note}}</p>
    ${cta('Update payment method \u2192', '{{portal_url}}', '#DC2626')}
    <p style="margin:0;font-size:14px;color:#666666;">
      If you believe this is an error, reply to this email and we\u2019ll help sort it out.
    </p>
  </td></tr>`),
  },

  // 5 ── abandoned_cart ────────────────────────────────────────────────────────
  {
    name:        'abandoned_cart',
    description: 'Sent when a user starts but does not complete Stripe checkout',
    subject:     'You left something behind \u2014 complete your Tempo setup',
    from_email:  'noreply@gettempo.ca',
    from_name:   'Tempo Books',
    variables:   ['checkout_url'],
    html_body: wrap(`
  ${hero('You were this close.')}
  <tr><td style="padding:36px 40px;">
    <p style="margin:0 0 16px;font-size:16px;color:#333333;line-height:1.6;">
      You started setting up your Tempo subscription but didn\u2019t quite finish.
    </p>
    <p style="margin:0 0 28px;font-size:16px;color:#333333;line-height:1.6;">
      Your books are waiting. Pick up where you left off \u2014 your free 60-day trial is still
      available, with no charge until the trial ends.
    </p>
    ${cta('Complete your setup \u2192', '{{checkout_url}}')}
    <p style="margin:0;font-size:13px;color:#aaaaaa;">This link expires in 24 hours.</p>
  </td></tr>`),
  },

  // 6 ── invoice_email ─────────────────────────────────────────────────────────
  {
    name:        'invoice_email',
    description: 'Invoice sent to client — complex pre-rendered HTML vars passed by EmailService',
    subject:     '{{invoice_subject}}',
    from_email:  'noreply@gettempo.ca',
    from_name:   'Tempo Books',
    variables:   ['invoice_subject', 'client_name', 'business_name', 'invoice_number',
                  'issue_date', 'due_date', 'total', 'line_items_html',
                  'notes_html', 'payment_button_html', 'reminder_banner_html'],
    html_body: `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f9fafb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <div style="max-width:600px;margin:40px auto;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,.1);">
    <div style="background:#0F6E56;padding:28px 32px;">
      ${LOGO}
      <div style="font-size:13px;color:rgba(255,255,255,.75);margin-top:8px;">Invoice from {{business_name}}</div>
    </div>
    <div style="padding:32px;">
      {{reminder_banner_html}}
      <h1 style="margin:0 0 4px;font-size:20px;color:#111827;">Invoice {{invoice_number}}</h1>
      <p style="margin:0 0 24px;font-size:14px;color:#6B7280;">
        To: <strong>{{client_name}}</strong> &nbsp;&middot;&nbsp;
        Issue date: {{issue_date}} &nbsp;&middot;&nbsp;
        Due date: <strong>{{due_date}}</strong>
      </p>
      <table style="width:100%;border-collapse:collapse;margin-bottom:16px;">
        <thead>
          <tr style="background:#f9fafb;">
            <th style="padding:8px 12px;text-align:left;font-size:12px;color:#6B7280;font-weight:600;text-transform:uppercase;letter-spacing:.05em;">Description</th>
            <th style="padding:8px 12px;text-align:center;font-size:12px;color:#6B7280;font-weight:600;text-transform:uppercase;letter-spacing:.05em;">Qty</th>
            <th style="padding:8px 12px;text-align:right;font-size:12px;color:#6B7280;font-weight:600;text-transform:uppercase;letter-spacing:.05em;">Rate</th>
            <th style="padding:8px 12px;text-align:right;font-size:12px;color:#6B7280;font-weight:600;text-transform:uppercase;letter-spacing:.05em;">Amount</th>
          </tr>
        </thead>
        <tbody>{{line_items_html}}</tbody>
      </table>
      <div style="text-align:right;padding:12px;background:#f9fafb;border-radius:8px;margin-bottom:24px;">
        <span style="font-size:16px;color:#6B7280;">Total Due: </span>
        <span style="font-size:22px;font-weight:700;color:#0F6E56;">{{total}}</span>
      </div>
      {{notes_html}}
      {{payment_button_html}}
    </div>
    <div style="padding:16px 32px;background:#f9fafb;border-top:1px solid #f3f4f6;text-align:center;">
      <p style="margin:0;font-size:12px;color:#9CA3AF;">
        Sent via <a href="https://gettempo.ca" style="color:#0F6E56;text-decoration:none;">Tempo Books</a>
      </p>
    </div>
  </div>
</body></html>`,
  },

  // 7 ── staff_invite ───────────────────────────────────────────────────────────
  {
    name:        'staff_invite',
    description: 'Invitation email sent to new firm staff members',
    subject:     "You've been invited to join {{firm_name}} on Tempo Books",
    from_email:  'noreply@gettempo.ca',
    from_name:   'Tempo Books',
    variables:   ['first_name', 'firm_name', 'sign_up_url'],
    html_body: wrap(`
  ${hero('You\u2019ve been invited to join {{firm_name}} on Tempo Books.')}
  <tr><td style="padding:36px 40px;">
    <p style="margin:0 0 16px;font-size:16px;color:#333333;">Hi {{first_name}},</p>
    <p style="margin:0 0 16px;font-size:16px;color:#374151;">
      You\u2019ve been invited to join <strong>{{firm_name}}</strong> on Tempo Books as a staff member.
    </p>
    <p style="margin:0 0 32px;font-size:16px;color:#374151;">
      Click the button below to create your account and accept the invitation.
    </p>
    ${cta('Accept Invitation', '{{sign_up_url}}')}
    <p style="margin:24px 0 0;font-size:14px;color:#6b7280;">
      If you weren\u2019t expecting this invitation, you can safely ignore this email.
    </p>
  </td></tr>`),
  },

  // 8 ── access_request ────────────────────────────────────────────────────────
  {
    name:        'access_request',
    description: 'Sent to a client when an accountant firm requests edit access',
    subject:     '{{firm_name}} has requested edit access to your books',
    from_email:  'noreply@gettempo.ca',
    from_name:   'Tempo Books',
    variables:   ['firm_name', 'access_note', 'requested_expiry', 'approve_url', 'deny_url'],
    html_body: wrap(`
  ${hero('Edit access requested for your Tempo Books account.')}
  <tr><td style="padding:36px 40px;">
    <p style="margin:0 0 16px;font-size:16px;color:#374151;">
      <strong>{{firm_name}}</strong> has requested edit access to your Tempo Books account.
    </p>
    <table cellpadding="0" cellspacing="0"
           style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:6px;padding:16px;margin:0 0 24px;width:100%;">
      <tr><td style="padding-bottom:12px;">
        <p style="margin:0 0 4px;font-size:12px;color:#6b7280;text-transform:uppercase;letter-spacing:.05em;">Reason</p>
        <p style="margin:0;font-size:15px;color:#111827;">{{access_note}}</p>
      </td></tr>
      <tr><td>
        <p style="margin:0 0 4px;font-size:12px;color:#6b7280;text-transform:uppercase;letter-spacing:.05em;">Requested until</p>
        <p style="margin:0;font-size:15px;color:#111827;">{{requested_expiry}}</p>
      </td></tr>
    </table>
    <table cellpadding="0" cellspacing="0"><tr>
      <td style="padding-right:12px;">
        <table cellpadding="0" cellspacing="0"><tr>
          <td style="background:#0F6E56;border-radius:6px;">
            <a href="{{approve_url}}"
               style="display:inline-block;padding:12px 24px;font-size:14px;font-weight:bold;color:#fff;text-decoration:none;font-family:Arial,sans-serif;">
              Approve Access
            </a>
          </td>
        </tr></table>
      </td>
      <td>
        <table cellpadding="0" cellspacing="0"><tr>
          <td style="background:#ef4444;border-radius:6px;">
            <a href="{{deny_url}}"
               style="display:inline-block;padding:12px 24px;font-size:14px;font-weight:bold;color:#fff;text-decoration:none;font-family:Arial,sans-serif;">
              Deny
            </a>
          </td>
        </tr></table>
      </td>
    </tr></table>
  </td></tr>`),
  },

  // 9 ── access_response ────────────────────────────────────────────────────────
  {
    name:        'access_response',
    description: 'Sent to accountant firm when client approves or denies access — status_colour and body_text pre-rendered',
    subject:     'Edit access request {{status_word}} \u2014 Tempo Books',
    from_email:  'noreply@gettempo.ca',
    from_name:   'Tempo Books',
    variables:   ['firm_name', 'status_word', 'status_colour', 'body_text', 'business_name'],
    html_body: wrap(`
  ${hero('Access Request \u2014 <span style="color:{{status_colour}};">{{status_word}}</span>', '#ffffff', '#111827', '#e5e7eb')}
  <tr><td style="padding:36px 40px;">
    <p style="margin:0 0 24px;font-size:16px;color:#374151;">{{body_text}}</p>
    <p style="margin:0;font-size:13px;color:#6b7280;">Log in to Tempo Books to view your firm portal.</p>
  </td></tr>`),
  },

  // 10 ── trial_reminder_cron ──────────────────────────────────────────────────
  {
    name:        'trial_reminder_cron',
    description: 'CRON-triggered trial reminder — reminder_subject, day_text, accent_colour pre-rendered',
    subject:     '{{reminder_subject}}',
    from_email:  'noreply@gettempo.ca',
    from_name:   'Tempo Books',
    variables:   ['reminder_subject', 'day_text', 'trial_end_date', 'accent_colour', 'portal_url'],
    html_body: wrap(`
  ${hero('Your Tempo Books free trial is ending soon.')}
  <tr><td style="padding:36px 40px;">
    <p style="margin:0 0 16px;font-size:16px;color:#111827;">Hi there,</p>
    <p style="margin:0 0 16px;font-size:16px;color:#374151;">
      Your Tempo Books free trial ends in <strong style="color:{{accent_colour}};">{{day_text}}</strong>
      on {{trial_end_date}}.
    </p>
    <p style="margin:0 0 32px;font-size:16px;color:#374151;">
      To keep uninterrupted access to your books, reports, and bank sync, make sure your payment method
      is up to date before your trial ends.
    </p>
    ${cta('Manage Subscription \u2192', '{{portal_url}}')}
    <p style="margin:0;font-size:14px;color:#6b7280;">Questions? Reply to this email and we\u2019ll help you out.</p>
  </td></tr>`),
  },

  // 11 ── upcoming_payment ─────────────────────────────────────────────────────
  {
    name:        'upcoming_payment',
    description: 'Sent before subscription renewal charge',
    subject:     'Your Tempo Books subscription renews on {{renewal_date}}',
    from_email:  'noreply@gettempo.ca',
    from_name:   'Tempo Books',
    variables:   ['plan_name', 'renewal_date', 'amount', 'portal_url'],
    html_body: wrap(`
  ${hero('Upcoming subscription renewal.')}
  <tr><td style="padding:36px 40px;">
    <p style="margin:0 0 16px;font-size:16px;color:#111827;">Hi there,</p>
    <p style="margin:0 0 16px;font-size:16px;color:#374151;">
      Your <strong>{{plan_name}}</strong> subscription will renew on <strong>{{renewal_date}}</strong>
      for <strong>{{amount}}</strong>.
    </p>
    <p style="margin:0 0 32px;font-size:16px;color:#374151;">
      No action is needed if your payment details are up to date.
      To make changes, visit your subscription settings.
    </p>
    ${cta('Manage Subscription \u2192', '{{portal_url}}', '#1B3A5C')}
  </td></tr>`),
  },

  // 12 ── ai_cap_warning ───────────────────────────────────────────────────────
  {
    name:        'ai_cap_warning',
    description: 'AI credit quota warning — warning_subject, body_text, accent_colour pre-rendered',
    subject:     '{{warning_subject}}',
    from_email:  'noreply@gettempo.ca',
    from_name:   'Tempo Books',
    variables:   ['warning_subject', 'body_text', 'accent_colour', 'pricing_url'],
    html_body: wrap(`
  ${hero('AI usage update for your Tempo Books account.')}
  <tr><td style="padding:36px 40px;">
    <p style="margin:0 0 16px;font-size:16px;color:#111827;">Hi there,</p>
    <p style="margin:0 0 32px;font-size:16px;color:#374151;">{{body_text}}</p>
    ${cta('Upgrade Plan \u2192', '{{pricing_url}}')}
  </td></tr>`),
  },

  // 13 ── cancellation_confirmation ────────────────────────────────────────────
  {
    name:        'cancellation_confirmation',
    description: 'Sent when a subscription is cancelled',
    subject:     'Your Tempo Books subscription has been cancelled',
    from_email:  'noreply@gettempo.ca',
    from_name:   'Tempo Books',
    variables:   ['plan_name', 'access_end_date', 'resubscribe_url'],
    html_body: wrap(`
  ${hero('Subscription cancelled.', '#FEF2F2', '#991B1B', '#FECACA')}
  <tr><td style="padding:36px 40px;">
    <p style="margin:0 0 16px;font-size:16px;color:#111827;">Hi there,</p>
    <p style="margin:0 0 16px;font-size:16px;color:#374151;">
      Your <strong>{{plan_name}}</strong> subscription has been cancelled. You\u2019ll retain access to
      all features until <strong>{{access_end_date}}</strong>.
    </p>
    <p style="margin:0 0 32px;font-size:16px;color:#374151;">
      Changed your mind? You can resubscribe at any time to restore full access.
    </p>
    ${cta('Resubscribe \u2192', '{{resubscribe_url}}', '#0F6E56')}
  </td></tr>`),
  },

  // 14 ── lead_acknowledgement ─────────────────────────────────────────────────
  {
    name:        'lead_acknowledgement',
    description: 'Sent to marketing form leads — confirms we received their demo request',
    subject:     'Thanks for your interest in Tempo Books',
    from_email:  'admin@gettempo.ca',
    from_name:   'Adesanya Ehinmidu',
    variables:   ['first_name'],
    html_body: wrap(`
  ${hero('We\u2019ve received your demo request.')}
  <tr><td style="padding:36px 40px;">
    <p style="margin:0 0 16px;font-size:16px;color:#333333;">Hi {{first_name}},</p>
    <p style="margin:0 0 16px;font-size:16px;color:#333333;line-height:1.6;">
      Thank you for your interest in Tempo Books. We\u2019ve received your request and someone from
      our team will be in touch within one business day to walk you through the platform personally.
    </p>
    <p style="margin:0 0 24px;font-size:16px;color:#333333;line-height:1.6;">
      In the meantime, you\u2019re welcome to start your free 60-day trial immediately \u2014
      no credit card required.
    </p>
    ${cta('Start free trial \u2192', 'https://gettempo.ca/sign-up')}
    <p style="margin:0;font-size:15px;color:#555555;">
      Adesanya Ehinmidu<br/>
      <span style="color:#888888;">Founder \u2014 Tempo Books</span>
    </p>
  </td></tr>`),
  },

];

// ── Service ──────────────────────────────────────────────────────────────────

@Injectable()
export class TemplateSeedService implements OnModuleInit {
  private readonly logger = new Logger(TemplateSeedService.name);

  constructor(
    @InjectRepository(EmailTemplate)
    private readonly repo: Repository<EmailTemplate>,
  ) {}

  async onModuleInit(): Promise<void> {
    let seeded = 0;
    for (const t of TEMPLATES) {
      const existing = await this.repo.findOne({ where: { name: t.name } });
      if (!existing) {
        await this.repo.save(
          this.repo.create({
            name:        t.name,
            description: t.description,
            subject:     t.subject,
            html_body:   t.html_body,
            from_email:  t.from_email,
            from_name:   t.from_name,
            variables:   t.variables,
            is_active:   true,
            version:     1,
          }),
        );
        seeded++;
      }
    }
    if (seeded > 0) {
      this.logger.log(`Email template seed: ${seeded} new template(s) created`);
    } else {
      this.logger.log(`Email template seed: all ${TEMPLATES.length} templates already present`);
    }
  }
}
