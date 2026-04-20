import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EmailTemplate } from './email-template.entity';
import { AutomationRule } from './automation-rule.entity';

// -- Layout helpers ---------------------------------------------------------

const LOGO = `
  <div style="display:inline-flex;align-items:center;gap:8px;">
    <div style="width:28px;height:28px;background:#0F6E56;border-radius:6px;display:inline-flex;align-items:center;justify-content:center;">
      <svg viewBox="0 0 16 16" width="16" height="16">
        <rect x="1" y="10" width="3" height="5" rx="0.5" fill="white" opacity="0.5"/>
        <rect x="6.5" y="7" width="3" height="8" rx="0.5" fill="white" opacity="0.75"/>
        <rect x="12" y="3" width="3" height="12" rx="0.5" fill="white"/>
      </svg>
    </div>
    <span style="font-size:18px;font-weight:bold;color:#ffffff;font-family:Arial,sans-serif;letter-spacing:-.3px;">Tempo Books</span>
  </div>`;

function wrap(inner: string): string {
  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f9fafb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;">
  <div style="max-width:600px;margin:40px auto;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,.1);">
    <div style="background:#0F6E56;padding:24px 40px;">
      ${LOGO}
    </div>
    <table width="100%" cellpadding="0" cellspacing="0">
      ${inner}
    </table>
    <div style="padding:20px 40px;background:#f9fafb;border-top:1px solid #f3f4f6;text-align:center;">
      <p style="margin:0;font-size:12px;color:#9CA3AF;">
        Tempo Books &nbsp;&middot;&nbsp;
        <a href="https://gettempo.ca" style="color:#0F6E56;text-decoration:none;">gettempo.ca</a>
      </p>
    </div>
  </div>
</body></html>`;
}

function hero(
  text: string,
  bg     = '#0F6E56',
  colour = '#ffffff',
  border = '#0F6E56',
): string {
  return `
  <tr>
    <td style="background:${bg};padding:24px 40px;border-bottom:1px solid ${border};">
      <p style="margin:0;font-size:20px;font-weight:bold;color:${colour};font-family:Arial,sans-serif;line-height:1.3;">
        ${text}
      </p>
    </td>
  </tr>`;
}

function cta(
  label:          string,
  urlPlaceholder: string,
  colour          = '#0F6E56',
): string {
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

function check(strong: string, rest: string): string {
  return `
  <tr>
    <td style="padding:10px 0;border-bottom:1px solid #f0f0f0;vertical-align:top;width:28px;">
      <span style="color:#0F6E56;font-size:18px;line-height:1;">&#10003;</span>
    </td>
    <td style="padding:10px 0 10px 12px;border-bottom:1px solid #f0f0f0;">
      <p style="margin:0;font-size:15px;color:#333333;">
        <strong>${strong}</strong> ${rest}
      </p>
    </td>
  </tr>`;
}

function bullet(text: string): string {
  return `
  <tr>
    <td style="padding:8px 0;border-bottom:1px solid #f0f0f0;vertical-align:top;width:20px;">
      <span style="color:#0F6E56;font-size:16px;line-height:1;">&bull;</span>
    </td>
    <td style="padding:8px 0 8px 12px;border-bottom:1px solid #f0f0f0;">
      <p style="margin:0;font-size:15px;color:#333333;">${text}</p>
    </td>
  </tr>`;
}

// -- Template definitions ---------------------------------------------------

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

  // 1 -- signup_welcome ------------------------------------------------------
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

  // 2 -- admin_signup_alert --------------------------------------------------
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

  // 3 -- trial_ending --------------------------------------------------------
  {
    name:        'trial_ending',
    description: 'Trial ending notification \u2014 body_text and subject_line are pre-rendered by EmailService',
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

  // 4 -- payment_failed ------------------------------------------------------
  {
    name:        'payment_failed',
    description: 'Stripe payment failure alert \u2014 retry_note is pre-rendered by EmailService',
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

  // 5 -- abandoned_cart ------------------------------------------------------
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

  // 6 -- invoice_email -------------------------------------------------------
  {
    name:        'invoice_email',
    description: 'Invoice sent to client \u2014 complex pre-rendered HTML vars passed by EmailService',
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

  // 7 -- staff_invite --------------------------------------------------------
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

  // 8 -- access_request ------------------------------------------------------
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

  // 9 -- access_response -----------------------------------------------------
  {
    name:        'access_response',
    description: 'Sent to accountant firm when client approves or denies access \u2014 status_colour and body_text pre-rendered',
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

  // 10 -- trial_reminder_cron ------------------------------------------------
  {
    name:        'trial_reminder_cron',
    description: 'CRON-triggered trial reminder \u2014 reminder_subject, day_text, accent_colour pre-rendered',
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

  // 11 -- upcoming_payment ---------------------------------------------------
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

  // 12 -- ai_cap_warning -----------------------------------------------------
  {
    name:        'ai_cap_warning',
    description: 'AI credit quota warning \u2014 warning_subject, body_text, accent_colour pre-rendered',
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

  // 13 -- cancellation_confirmation ------------------------------------------
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

  // 14 -- lead_acknowledgement -----------------------------------------------
  {
    name:        'lead_acknowledgement',
    description: 'Sent to marketing form leads \u2014 confirms we received their demo request',
    subject:     'Thanks for your interest in Tempo Books',
    from_email:  'ade.ehinmidu@gettempo.ca',
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
      In the meantime, you\u2019re welcome to start your free 60-day trial immediately.
      A card is required to start \u2014 you won\u2019t be charged until your 60-day trial ends.
    </p>
    ${cta('Start free trial \u2192', 'https://gettempo.ca/sign-up')}
    <p style="margin:0;font-size:15px;color:#555555;">
      Adesanya Ehinmidu<br/>
      <span style="color:#888888;">Founder \u2014 Tempo Books</span>
    </p>
  </td></tr>`),
  },

  // 15 -- cold_outreach ------------------------------------------------------
  {
    name:        'cold_outreach',
    description: 'Sent automatically when a Cold lead is manually created \u2014 introduces Tempo Books with CRA emphasis',
    subject:     'Most Canadian small businesses overpay CRA. Here\u2019s how to stop.',
    from_email:  'ade.ehinmidu@gettempo.ca',
    from_name:   'Adesanya Ehinmidu',
    variables:   ['first_name'],
    html_body: wrap(`
  ${hero('Most Canadian small businesses overpay CRA. Here\u2019s how to stop.')}
  <tr><td style="padding:36px 40px;">
    <p style="margin:0 0 16px;font-size:16px;color:#333333;">Hi {{first_name}},</p>

    <p style="margin:0 0 16px;font-size:16px;color:#333333;line-height:1.7;">
      Every year, the Canada Revenue Agency keeps millions of dollars that small business owners, freelancers,
      and individuals never claim \u2014 not because the deductions weren\u2019t real, but because the
      paperwork wasn\u2019t right.
    </p>

    <p style="margin:0 0 16px;font-size:16px;color:#333333;line-height:1.7;">
      Studies consistently show the average Canadian misses thousands in legitimate deductions annually \u2014
      simply because their records weren\u2019t organized enough to defend the claims at filing time.
      That\u2019s money you earned. And it\u2019s sitting with CRA.
    </p>

    <p style="margin:0 0 16px;font-size:16px;color:#333333;line-height:1.7;">
      We built Tempo Books because of lived experience. I\u2019ve been there personally \u2014 scrambling to
      collect bank statements and receipts weeks before the filing deadline, not knowing exactly what I could
      claim, and not fully understanding what my accountant was doing on my behalf until CRA came asking
      questions. That moment of panic \u2014 realizing your financial story isn\u2019t as clear as it should be \u2014
      is something no one should have to go through.
    </p>

    <p style="margin:0 0 28px;font-size:16px;color:#333333;line-height:1.7;">
      Whether you run a corporation, freelance under your own name, or simply want to stop leaving money
      with CRA \u2014 the problem has never been effort. It has always been the lack of the right system.
      Tempo Books is that system.
    </p>

    <p style="margin:0 0 12px;font-size:15px;font-weight:bold;color:#0F6E56;">Here\u2019s what Tempo does differently:</p>
    <table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 28px;">
      ${check('Every transaction documented', '\u2014 automatically classified and posted to the correct expense account so every deduction is defensible at audit')}
      ${check('HST/GST calculated on every transaction', '\u2014 configure your remittance period once (monthly, quarterly, or annually) and Tempo prepares your exact remittance amount when it\u2019s due. No guessing. No overpaying. No surprises.')}
      ${check('Real-time financial reports', '\u2014 Income Statement, Balance Sheet, and CRA remittance report always current, not just at tax time')}
      ${check('AI anomaly detection', '\u2014 flags unusual charges before they become expensive problems')}
      ${check('6-year receipt repository', '\u2014 every document CRA might ask for, stored and searchable')}
    </table>

    <table width="100%" cellpadding="0" cellspacing="0"
           style="background:#EDF7F2;border-radius:6px;margin:0 0 28px;">
      <tr><td style="padding:16px 20px;">
        <p style="margin:0;font-size:15px;color:#065F46;line-height:1.6;">
          The businesses that claim every dollar they\u2019re owed aren\u2019t bigger or smarter \u2014
          they just have better systems.
        </p>
      </td></tr>
    </table>

    ${cta('Start your free 60-day trial \u2192', 'https://gettempo.ca/sign-up')}

    <p style="margin:-16px 0 24px;font-size:13px;color:#888888;font-style:italic;">
      A card is required to start \u2014 you won\u2019t be charged until your 60-day trial ends.
    </p>

    <p style="margin:0;font-size:15px;color:#555555;">
      Adesanya Ehinmidu<br/>
      <span style="color:#888888;">Founder \u2014 Tempo Books &nbsp;|&nbsp;
        <a href="https://gettempo.ca" style="color:#0F6E56;text-decoration:none;">gettempo.ca</a>
      </span>
    </p>
  </td></tr>`),
  },

  // -- PARTNERSHIP TEMPLATES (16-21) -----------------------------------------

  // 16 -- partnership_mission_fund -------------------------------------------
  {
    name:        'partnership_mission_fund',
    description: 'Partnership outreach to mission-aligned funds (BOF, FACE) \u2014 sponsored access model',
    subject:     'Tempo Books \u2014 Black-owned bookkeeping platform for your members',
    from_email:  'ade.ehinmidu@gettempo.ca',
    from_name:   'Adesanya Ehinmidu',
    variables:   ['contact_name', 'organization_name'],
    html_body: wrap(`
  ${hero('Bookkeeping infrastructure for your members.', '#f8fafc', '#1B3A5C', '#e2e8f0')}
  <tr><td style="padding:36px 40px;">
    <p style="margin:0 0 16px;font-size:16px;color:#333333;">Dear {{contact_name}},</p>

    <p style="margin:0 0 16px;font-size:16px;color:#333333;line-height:1.7;">
      My name is Adesanya Ehinmidu. I am the founder of <strong>Tempo Books</strong> \u2014 a
      Black-owned Canadian bookkeeping platform built specifically for small and Black-owned businesses.
    </p>

    <p style="margin:0 0 16px;font-size:16px;color:#333333;line-height:1.7;">
      Tempo Books is exactly the kind of Black-owned business {{organization_name}} exists to support.
      I am reaching out because your mandate includes companies like ours \u2014 and I believe a
      partnership between us would serve your members directly.
    </p>

    <p style="margin:0 0 16px;font-size:16px;color:#333333;line-height:1.7;">
      Every year, thousands of Black business owners across Canada overpay CRA by $2,000 to $10,000 in
      missed deductions and unclaimed input tax credits. The cause is not dishonesty \u2014 it is
      disorganization. Most lack access to affordable bookkeeping tools that work month-to-month,
      not just at tax time.
    </p>

    <p style="margin:0 0 12px;font-size:15px;font-weight:bold;color:#0F6E56;">What Tempo Books delivers for your members:</p>
    <table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 28px;">
      ${check('12,000+ Banks supported via Plaid Canada &amp; United States', '\u2014 transactions import automatically, no manual entry ever')}
      ${check('AI transaction classification', '\u2014 every expense posted to the correct account and defensible at audit')}
      ${check('HST/GST auto-split on every transaction', '\u2014 CRA remittance report (GST34 lines 101\u2013113) always one click away')}
      ${check('6-year receipt repository', '\u2014 stored in the format CRA accepts for audits, from date of upload')}
      ${check('Real-time Income Statement and Balance Sheet', '\u2014 financial clarity every month, not just at tax time')}
      ${check('AI anomaly detection', '\u2014 flags unusual charges before they become expensive problems')}
      ${check('60-day free trial', '\u2014 no charge until the trial ends')}
    </table>

    <table width="100%" cellpadding="0" cellspacing="0"
           style="background:#EDF7F2;border-radius:6px;margin:0 0 28px;">
      <tr><td style="padding:16px 20px;">
        <p style="margin:0;font-size:15px;color:#065F46;line-height:1.6;">
          <strong>I would like to explore a partnership where {{organization_name}} members receive
          full access to Tempo Books at no personal cost, funded through your existing program budget.</strong>
          As a Black-owned platform built for this community, this is exactly the kind of ecosystem
          investment your mandate exists to make.
        </p>
      </td></tr>
    </table>

    <p style="margin:0 0 28px;font-size:16px;color:#333333;line-height:1.7;">
      I have attached a one-page Partnership Brief with details on how this would work.
      I would welcome 20 minutes of your time to discuss what a pilot could look like.
    </p>

    <p style="margin:0 0 4px;font-size:15px;color:#555555;">
      Thank you for everything you do for this community \u2014 and for considering this.
    </p>
    <p style="margin:0;font-size:15px;color:#555555;">
      Adesanya Ehinmidu<br/>
      <span style="color:#888888;">Founder \u2014 Tempo Books &nbsp;|&nbsp;
        <a href="mailto:ade.ehinmidu@gettempo.ca" style="color:#0F6E56;text-decoration:none;">ade.ehinmidu@gettempo.ca</a>
        &nbsp;|&nbsp;
        <a href="https://gettempo.ca" style="color:#0F6E56;text-decoration:none;">gettempo.ca</a>
      </span>
    </p>
  </td></tr>`),
  },

  // 17 -- partnership_community_workshop -------------------------------------
  {
    name:        'partnership_community_workshop',
    description: 'Partnership outreach to community / workshop organizations (CBCC, BEBC) \u2014 member pricing + workshop model',
    subject:     'Bookkeeping workshops for {{organization_name}} members \u2014 Tempo Books (Black-owned)',
    from_email:  'ade.ehinmidu@gettempo.ca',
    from_name:   'Adesanya Ehinmidu',
    variables:   ['contact_name', 'organization_name', 'org_program_type'],
    html_body: wrap(`
  ${hero('A bookkeeping partnership for your members.', '#f8fafc', '#1B3A5C', '#e2e8f0')}
  <tr><td style="padding:36px 40px;">
    <p style="margin:0 0 16px;font-size:16px;color:#333333;">Dear {{contact_name}},</p>

    <p style="margin:0 0 16px;font-size:16px;color:#333333;line-height:1.7;">
      My name is Adesanya Ehinmidu. I am the founder of <strong>Tempo Books</strong> \u2014 a
      Black-owned Canadian bookkeeping platform built for small and Black-owned businesses.
    </p>

    <p style="margin:0 0 16px;font-size:16px;color:#333333;line-height:1.7;">
      Tempo Books is exactly the kind of Black-owned business {{organization_name}} exists to support.
      I have followed your work supporting Black entrepreneurs through {{org_program_type}}, and I
      believe there is a natural fit between what you deliver and what we have built.
    </p>

    <p style="margin:0 0 16px;font-size:16px;color:#333333;line-height:1.7;">
      Most small business owners we speak with share the same challenge: they know bookkeeping matters,
      but they have never had a tool that makes it manageable. Tax season becomes a scramble, deductions
      get missed, and CRA compliance feels out of reach. Tempo Books changes that \u2014 the platform
      connects to 12,000+ Banks supported via Plaid Canada &amp; United States, classifies every
      transaction with AI, auto-splits HST/GST, and stores receipts for 6 years in the format CRA
      requires for audits, all CRA-ready every month.
    </p>

    <p style="margin:0 0 12px;font-size:15px;font-weight:bold;color:#0F6E56;">I would like to propose two things:</p>
    <table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 28px;">
      ${bullet('<strong>A co-branded bookkeeping workshop</strong> for your members, delivered by Tempo Books, covering CRA compliance, receipt management, and monthly close basics \u2014 at no cost to {{organization_name}}.')}
      ${bullet('<strong>A permanent member pricing arrangement</strong> where {{organization_name}} members lock in our Pro plan at $25/month CAD, permanently, even after the public price returns to $49/month.')}
    </table>

    <table width="100%" cellpadding="0" cellspacing="0"
           style="background:#EDF7F2;border-radius:6px;margin:0 0 28px;">
      <tr><td style="padding:16px 20px;">
        <p style="margin:0;font-size:15px;color:#065F46;line-height:1.6;">
          There is no cost to {{organization_name}}. Your members sign up individually and you deliver
          an exclusive, lasting financial benefit to your community. As a Black-owned platform, I built
          Tempo specifically for entrepreneurs like your members.
        </p>
      </td></tr>
    </table>

    <p style="margin:0 0 28px;font-size:16px;color:#333333;line-height:1.7;">
      I have attached a one-page overview. Would you be open to a short call to discuss timing?
    </p>

    <p style="margin:0 0 4px;font-size:15px;color:#555555;">Thank you,</p>
    <p style="margin:0;font-size:15px;color:#555555;">
      Adesanya Ehinmidu<br/>
      <span style="color:#888888;">Founder \u2014 Tempo Books &nbsp;|&nbsp;
        <a href="mailto:ade.ehinmidu@gettempo.ca" style="color:#0F6E56;text-decoration:none;">ade.ehinmidu@gettempo.ca</a>
        &nbsp;|&nbsp;
        <a href="https://gettempo.ca" style="color:#0F6E56;text-decoration:none;">gettempo.ca</a>
      </span>
    </p>
  </td></tr>`),
  },

  // 18 -- partnership_government_program -------------------------------------
  {
    name:        'partnership_government_program',
    description: 'Partnership outreach to government programs (BEP, FedDev Ontario) \u2014 infrastructure framing',
    subject:     'Bookkeeping infrastructure for {{program_name}} participants \u2014 Tempo Books',
    from_email:  'ade.ehinmidu@gettempo.ca',
    from_name:   'Adesanya Ehinmidu',
    variables:   ['contact_name', 'organization_name', 'program_name'],
    html_body: wrap(`
  ${hero('Financial infrastructure for program participants.', '#f8fafc', '#1B3A5C', '#e2e8f0')}
  <tr><td style="padding:36px 40px;">
    <p style="margin:0 0 16px;font-size:16px;color:#333333;">Dear {{contact_name}},</p>

    <p style="margin:0 0 16px;font-size:16px;color:#333333;line-height:1.7;">
      My name is Adesanya Ehinmidu. I am the founder of <strong>Tempo Books</strong> \u2014 a
      Black-owned Canadian bookkeeping platform designed for small and Black-owned businesses.
    </p>

    <p style="margin:0 0 16px;font-size:16px;color:#333333;line-height:1.7;">
      Tempo Books is exactly the kind of Black-owned business {{program_name}} was designed to support.
      I am reaching out because your mandate includes companies like ours \u2014 and I believe our
      platform directly serves the entrepreneurs your program is investing in.
    </p>

    <p style="margin:0 0 16px;font-size:16px;color:#333333;line-height:1.7;">
      {{program_name}} represents a significant public investment in Black entrepreneurship across Canada.
      That level of commitment deserves infrastructure to match \u2014 including the financial tools that
      help funded businesses survive past year one. The most common reason small businesses fail is not
      lack of revenue, but lack of financial visibility. Disorganized books mean missed deductions,
      unclaimed input tax credits, and a scramble at filing time \u2014 costing Canadian small business
      owners $2,000 to $10,000 annually in overpaid taxes alone.
    </p>

    <p style="margin:0 0 12px;font-size:15px;font-weight:bold;color:#0F6E56;">Tempo Books addresses this directly:</p>
    <table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 28px;">
      ${check('12,000+ Banks supported via Plaid Canada &amp; United States', '\u2014 transactions import automatically, zero manual entry')}
      ${check('AI-powered transaction classification', '\u2014 learns from corrections, improves month over month')}
      ${check('HST/GST engine', '\u2014 generates CRA remittance reports with GST34 lines 101\u2013113 pre-calculated')}
      ${check('6-year receipt repository', '\u2014 every document stored from date of upload in the format CRA accepts for audits')}
      ${check('Real double-entry accounting', '\u2014 Income Statement and Balance Sheet always current')}
      ${check('Fiscal year locking', '\u2014 retroactive changes blocked once a period is filed')}
      ${check('60-day free trial', '\u2014 no charge until the trial ends')}
    </table>

    <table width="100%" cellpadding="0" cellspacing="0"
           style="background:#EDF7F2;border-radius:6px;margin:0 0 28px;">
      <tr><td style="padding:16px 20px;">
        <p style="margin:0;font-size:15px;color:#065F46;line-height:1.6;">
          I would like to discuss how Tempo Books could serve as a bookkeeping resource for
          {{program_name}} participants \u2014 either through sponsored access or as a recommended
          tool within your ecosystem partner network.
        </p>
      </td></tr>
    </table>

    <p style="margin:0 0 28px;font-size:16px;color:#333333;line-height:1.7;">
      I have attached a Partnership Brief with details on the platform and proposed engagement models.
      I am happy to provide a demo or additional documentation your team may need for evaluation.
    </p>

    <p style="margin:0 0 4px;font-size:15px;color:#555555;">Thank you for your consideration.</p>
    <p style="margin:0;font-size:15px;color:#555555;">
      Adesanya Ehinmidu<br/>
      <span style="color:#888888;">Founder \u2014 Tempo Books &nbsp;|&nbsp;
        <a href="mailto:ade.ehinmidu@gettempo.ca" style="color:#0F6E56;text-decoration:none;">ade.ehinmidu@gettempo.ca</a>
        &nbsp;|&nbsp;
        <a href="https://gettempo.ca" style="color:#0F6E56;text-decoration:none;">gettempo.ca</a>
      </span>
    </p>
  </td></tr>`),
  },

  // 19 -- partnership_bank_program -------------------------------------------
  {
    name:        'partnership_bank_program',
    description: 'Partnership outreach to bank entrepreneur programs (RBC, TD, Scotiabank) \u2014 sponsored access + revenue share models',
    subject:     'Bookkeeping support for {{bank_name}} Black entrepreneur clients \u2014 Tempo Books',
    from_email:  'ade.ehinmidu@gettempo.ca',
    from_name:   'Adesanya Ehinmidu',
    variables:   ['contact_name', 'bank_name'],
    html_body: wrap(`
  ${hero('Bookkeeping support for your entrepreneur clients.', '#f8fafc', '#1B3A5C', '#e2e8f0')}
  <tr><td style="padding:36px 40px;">
    <p style="margin:0 0 16px;font-size:16px;color:#333333;">Dear {{contact_name}},</p>

    <p style="margin:0 0 16px;font-size:16px;color:#333333;line-height:1.7;">
      My name is Adesanya Ehinmidu. I am the founder of <strong>Tempo Books</strong> \u2014 a
      Black-owned Canadian bookkeeping platform built for small and Black-owned businesses.
    </p>

    <p style="margin:0 0 16px;font-size:16px;color:#333333;line-height:1.7;">
      Tempo Books is exactly the kind of Black-owned business {{bank_name}}\u2019s entrepreneur programs
      exist to support. I am reaching out because your mandate includes companies like ours \u2014 and
      because our platform directly serves the entrepreneurs your program is investing in.
    </p>

    <p style="margin:0 0 16px;font-size:16px;color:#333333;line-height:1.7;">
      {{bank_name}}\u2019s commitment to Black entrepreneurship is well documented. The businesses you
      support face a challenge your program is uniquely positioned to address: most of them do not have
      organized books. This means missed deductions, unclaimed input tax credits, and a scramble every
      tax season. For businesses that have received financing, the stakes are higher \u2014 disorganized
      books make it harder to demonstrate financial health, access follow-on capital, and survive a
      CRA audit.
    </p>

    <p style="margin:0 0 12px;font-size:15px;font-weight:bold;color:#0F6E56;">Tempo Books automates the entire bookkeeping process:</p>
    <table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 28px;">
      ${check('12,000+ Banks supported via Plaid Canada &amp; United States', '\u2014 including {{bank_name}}, transactions import automatically')}
      ${check('AI-powered classification', '\u2014 learns your client\u2019s patterns over time')}
      ${check('Automatic HST/GST splitting', '\u2014 CRA remittance report (GST34 lines 101\u2013113) always ready')}
      ${check('6-year CRA-compliant receipt storage', '\u2014 audit-ready from date of upload')}
      ${check('Real double-entry accounting', '\u2014 Income Statement and Balance Sheet updated in real time')}
      ${check('AI anomaly detection', '\u2014 flags unusual charges before they become expensive problems')}
      ${check('60-day free trial', '\u2014 no charge until the trial ends')}
    </table>

    <p style="margin:0 0 12px;font-size:15px;font-weight:bold;color:#0F6E56;">Two potential models:</p>
    <table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 28px;">
      ${bullet('<strong>Sponsored Access:</strong> {{bank_name}} subscribes on behalf of program participants at a negotiated bulk rate. Businesses get full Pro access at no personal cost.')}
      ${bullet('<strong>Revenue Share Referral:</strong> {{bank_name}} recommends Tempo Books to clients. We handle billing, support, and onboarding. {{bank_name}} earns a commission on every conversion.')}
    </table>

    <table width="100%" cellpadding="0" cellspacing="0"
           style="background:#EDF7F2;border-radius:6px;margin:0 0 28px;">
      <tr><td style="padding:16px 20px;">
        <p style="margin:0;font-size:15px;color:#065F46;line-height:1.6;">
          Either model gives {{bank_name}}\u2019s clients clean, audit-ready books from day one \u2014
          and gives your program a measurable financial literacy outcome.
        </p>
      </td></tr>
    </table>

    <p style="margin:0 0 28px;font-size:16px;color:#333333;line-height:1.7;">
      I have attached a one-page Partnership Brief. I would welcome the opportunity to discuss a pilot.
    </p>

    <p style="margin:0 0 4px;font-size:15px;color:#555555;">Thank you,</p>
    <p style="margin:0;font-size:15px;color:#555555;">
      Adesanya Ehinmidu<br/>
      <span style="color:#888888;">Founder \u2014 Tempo Books &nbsp;|&nbsp;
        <a href="mailto:ade.ehinmidu@gettempo.ca" style="color:#0F6E56;text-decoration:none;">ade.ehinmidu@gettempo.ca</a>
        &nbsp;|&nbsp;
        <a href="https://gettempo.ca" style="color:#0F6E56;text-decoration:none;">gettempo.ca</a>
      </span>
    </p>
  </td></tr>`),
  },

  // 20 -- partnership_cra_liaison --------------------------------------------
  {
    name:        'partnership_cra_liaison',
    description: 'Outreach to CRA Liaison Officer Initiative \u2014 resource listing framing, no endorsement ask',
    subject:     'Bookkeeping platform for small businesses \u2014 Tempo Books (Black-owned, Canadian)',
    from_email:  'ade.ehinmidu@gettempo.ca',
    from_name:   'Adesanya Ehinmidu',
    variables:   ['contact_name'],
    html_body: wrap(`
  ${hero('Helping small businesses act on CRA guidance.', '#f8fafc', '#1B3A5C', '#e2e8f0')}
  <tr><td style="padding:36px 40px;">
    <p style="margin:0 0 16px;font-size:16px;color:#333333;">Dear {{contact_name}},</p>

    <p style="margin:0 0 16px;font-size:16px;color:#333333;line-height:1.7;">
      My name is Adesanya Ehinmidu. I am the founder of <strong>Tempo Books</strong> \u2014 a
      Black-owned Canadian bookkeeping platform for small businesses.
    </p>

    <p style="margin:0 0 16px;font-size:16px;color:#333333;line-height:1.7;">
      The CRA Liaison Officer program provides a valuable service by helping small businesses understand
      their tax obligations before problems arise. I have built a tool that addresses the other half of
      that equation: making sure those businesses can actually maintain organized books on an ongoing basis.
    </p>

    <p style="margin:0 0 16px;font-size:16px;color:#333333;line-height:1.7;">
      Many small business owners understand what CRA requires. They simply lack the tools to do it
      consistently. Tempo Books automates bank syncing across 12,000+ Banks supported via Plaid
      Canada &amp; United States, AI-powered transaction categorization, HST/GST splitting, and
      receipt storage \u2014 giving business owners CRA-ready books every month, not just at filing time.
    </p>

    <p style="margin:0 0 12px;font-size:15px;font-weight:bold;color:#0F6E56;">Specifically, the platform provides:</p>
    <table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 28px;">
      ${check('Automatic HST/GST calculation', '\u2014 GST34 lines 101\u2013113 pre-calculated, remittance always one click away')}
      ${check('6-year receipt repository', '\u2014 digital images stored and searchable, meeting CRA\u2019s record-keeping requirements')}
      ${check('Real double-entry accounting', '\u2014 every transaction balanced, every journal entry auditable')}
      ${check('Fiscal year locking', '\u2014 prevents retroactive changes to closed periods')}
      ${check('AI anomaly detection', '\u2014 flags unusual charges before they attract CRA attention')}
    </table>

    <table width="100%" cellpadding="0" cellspacing="0"
           style="background:#EDF7F2;border-radius:6px;margin:0 0 28px;">
      <tr><td style="padding:16px 20px;">
        <p style="margin:0;font-size:15px;color:#065F46;line-height:1.6;">
          I would like to explore whether Tempo Books could be included as a recommended resource in
          Liaison Officer workshops and educational materials \u2014 not as an endorsement, but as an
          available tool that helps business owners put your guidance into practice.
        </p>
      </td></tr>
    </table>

    <p style="margin:0 0 28px;font-size:16px;color:#333333;line-height:1.7;">
      I have attached a brief overview of the platform. I am happy to provide a walkthrough or answer
      any questions about how the tool supports CRA compliance.
    </p>

    <p style="margin:0 0 4px;font-size:15px;color:#555555;">Thank you for your time.</p>
    <p style="margin:0;font-size:15px;color:#555555;">
      Adesanya Ehinmidu<br/>
      <span style="color:#888888;">Founder \u2014 Tempo Books &nbsp;|&nbsp;
        <a href="mailto:ade.ehinmidu@gettempo.ca" style="color:#0F6E56;text-decoration:none;">ade.ehinmidu@gettempo.ca</a>
        &nbsp;|&nbsp;
        <a href="https://gettempo.ca" style="color:#0F6E56;text-decoration:none;">gettempo.ca</a>
      </span>
    </p>
  </td></tr>`),
  },

  // 21 -- partnership_followup -----------------------------------------------
  {
    name:        'partnership_followup',
    description: 'Follow-up to all Wave 1 partnership contacts who did not respond within 10\u201314 business days',
    subject:     'Re: Tempo Books \u2014 following up',
    from_email:  'ade.ehinmidu@gettempo.ca',
    from_name:   'Adesanya Ehinmidu',
    variables:   ['contact_name', 'organization_name', 'original_send_date'],
    html_body: wrap(`
  ${hero('Following up on our partnership inquiry.', '#f8fafc', '#1B3A5C', '#e2e8f0')}
  <tr><td style="padding:36px 40px;">
    <p style="margin:0 0 16px;font-size:16px;color:#333333;">Dear {{contact_name}},</p>

    <p style="margin:0 0 16px;font-size:16px;color:#333333;line-height:1.7;">
      I wanted to follow up on the email I sent on {{original_send_date}} regarding a potential
      partnership between {{organization_name}} and Tempo Books.
    </p>

    <p style="margin:0 0 16px;font-size:16px;color:#333333;line-height:1.7;">
      I understand your schedule is busy. I will keep this brief.
    </p>

    <p style="margin:0 0 28px;font-size:16px;color:#333333;line-height:1.7;">
      <strong>Tempo Books</strong> is a Black-owned Canadian bookkeeping platform that gives small and
      Black-owned businesses clean, CRA-ready books every month. The platform connects to 12,000+ Banks
      supported via Plaid Canada &amp; United States, automates transaction classification with AI,
      handles HST/GST with a one-click CRA remittance report, and maintains a 6-year CRA-compliant
      receipt repository \u2014 all included from the first day of a 60-day free trial.
    </p>

    <table width="100%" cellpadding="0" cellspacing="0"
           style="background:#EDF7F2;border-radius:6px;margin:0 0 28px;">
      <tr><td style="padding:16px 20px;">
        <p style="margin:0;font-size:15px;color:#065F46;line-height:1.6;">
          Tempo Books is exactly the kind of Black-owned business {{organization_name}} exists to support.
          I would welcome even 15 minutes to explore whether a partnership makes sense.
        </p>
      </td></tr>
    </table>

    <p style="margin:0 0 28px;font-size:16px;color:#333333;line-height:1.7;">
      If the timing is not right, no problem at all \u2014 I am happy to reconnect later in the year.
    </p>

    <p style="margin:0 0 4px;font-size:15px;color:#555555;">Thank you,</p>
    <p style="margin:0;font-size:15px;color:#555555;">
      Adesanya Ehinmidu<br/>
      <span style="color:#888888;">Founder \u2014 Tempo Books &nbsp;|&nbsp;
        <a href="mailto:ade.ehinmidu@gettempo.ca" style="color:#0F6E56;text-decoration:none;">ade.ehinmidu@gettempo.ca</a>
        &nbsp;|&nbsp;
        <a href="https://gettempo.ca" style="color:#0F6E56;text-decoration:none;">gettempo.ca</a>
      </span>
    </p>
  </td></tr>`),
  },

];

// -- Templates that must be force-updated on every deploy -------------------
const FORCE_UPDATE_NAMES = new Set<string>([
  'cold_outreach',
  'lead_acknowledgement',
  'partnership_mission_fund',
  'partnership_community_workshop',
  'partnership_government_program',
  'partnership_bank_program',
  'partnership_cra_liaison',
  'partnership_followup',
]);

interface SeedRule {
  name: string;
  trigger_event: string;
  template_name: string;
  delay_minutes: number;
}

const RULE_SEEDS: SeedRule[] = [
  { name: 'Welcome on signup',            trigger_event: 'user.created',           template_name: 'signup_welcome',            delay_minutes: 0  },
  { name: 'Trial ending \u2014 7 days',   trigger_event: 'trial.ending_7d',        template_name: 'trial_ending',              delay_minutes: 0  },
  { name: 'Trial ending \u2014 3 days',   trigger_event: 'trial.ending_3d',        template_name: 'trial_ending',              delay_minutes: 0  },
  { name: 'Trial ending \u2014 today',    trigger_event: 'trial.ending_0d',        template_name: 'trial_ending',              delay_minutes: 0  },
  { name: 'Payment failed',               trigger_event: 'payment.failed',         template_name: 'payment_failed',            delay_minutes: 0  },
  { name: 'Abandoned cart',               trigger_event: 'cart.abandoned',         template_name: 'abandoned_cart',            delay_minutes: 60 },
  { name: 'New lead acknowledgement',     trigger_event: 'lead.created',           template_name: 'lead_acknowledgement',      delay_minutes: 0  },
  { name: 'Upcoming payment reminder',    trigger_event: 'upcoming.payment',       template_name: 'upcoming_payment',          delay_minutes: 0  },
  { name: 'AI quota warning',             trigger_event: 'ai.cap_warning',         template_name: 'ai_cap_warning',            delay_minutes: 0  },
  { name: 'Subscription cancelled',       trigger_event: 'subscription.cancelled', template_name: 'cancellation_confirmation', delay_minutes: 0  },
  { name: 'Trial reminder (cron)',        trigger_event: 'trial.reminder_cron',    template_name: 'trial_reminder_cron',       delay_minutes: 0  },
  { name: 'Cold lead outreach',           trigger_event: 'lead.cold_created',      template_name: 'cold_outreach',             delay_minutes: 0  },
];

// -- Service ----------------------------------------------------------------

@Injectable()
export class TemplateSeedService implements OnModuleInit {
  private readonly logger = new Logger(TemplateSeedService.name);

  constructor(
    @InjectRepository(EmailTemplate)
    private readonly repo: Repository<EmailTemplate>,
    @InjectRepository(AutomationRule)
    private readonly ruleRepo: Repository<AutomationRule>,
  ) {}

  async onModuleInit(): Promise<void> {
    // -- 1. Seed / force-update templates ------------------------------------
    let templatesSeeded = 0;
    let templatesUpdated = 0;

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
        templatesSeeded++;
      } else if (FORCE_UPDATE_NAMES.has(t.name)) {
        // Force-update subject, html_body, and from_email.
        // Preserves admin edits to from_name and variables.
        existing.subject    = t.subject;
        existing.html_body  = t.html_body;
        existing.from_email = t.from_email;
        existing.version    = (existing.version ?? 1) + 1;
        await this.repo.save(existing);
        templatesUpdated++;
      }
    }

    if (templatesSeeded > 0)  this.logger.log(`Email template seed: ${templatesSeeded} new template(s) created`);
    if (templatesUpdated > 0) this.logger.log(`Email template seed: ${templatesUpdated} template(s) force-updated`);
    if (templatesSeeded === 0 && templatesUpdated === 0) {
      this.logger.log(`Email template seed: all ${TEMPLATES.length} templates already present`);
    }

    // -- 2. Seed automation rules -------------------------------------------
    let rulesSeeded = 0;
    for (const r of RULE_SEEDS) {
      const existingRule = await this.ruleRepo.findOne({ where: { name: r.name } });
      if (existingRule) continue;

      const template = await this.repo.findOne({ where: { name: r.template_name } });
      if (!template) {
        this.logger.warn(`Rule seed: template "${r.template_name}" not found -- skipping rule "${r.name}"`);
        continue;
      }

      await this.ruleRepo.save(
        this.ruleRepo.create({
          name:          r.name,
          trigger_event: r.trigger_event,
          template_id:   template.id,
          delay_minutes: r.delay_minutes,
          is_active:     true,
        }),
      );
      rulesSeeded++;
    }

    if (rulesSeeded > 0) {
      this.logger.log(`Automation rule seed: ${rulesSeeded} new rule(s) created`);
    } else {
      this.logger.log(`Automation rule seed: all ${RULE_SEEDS.length} rules already present`);
    }
  }
}
