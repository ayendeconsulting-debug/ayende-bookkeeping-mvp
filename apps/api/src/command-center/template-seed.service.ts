import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EmailTemplate } from './email-template.entity';
import { AutomationRule } from './automation-rule.entity';

// -- Layout helpers ---------------------------------------------------------

function wrap(inner: string): string {
  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f4f4f4;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;">
  <div style="max-width:600px;margin:40px auto;background:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,.06);">
    <!-- LOGO BAR \u2014 White background -->
    <div style="background:#ffffff;padding:20px 32px;border-bottom:1px solid #e8e8e8;">
      <table cellpadding="0" cellspacing="0"><tr>
        <td style="vertical-align:middle;padding-right:10px;">
          <img src="https://gettempo.ca/tempo-logo-bar.png" alt="Tempo Books" width="36" height="36"
               style="display:block;border:0;border-radius:8px;" />
        </td>
        <td style="vertical-align:middle;">
          <span style="font-size:20px;font-weight:700;color:#1a1a2e;letter-spacing:-0.3px;font-family:Arial,sans-serif;">Tempo</span>
        </td>
      </tr></table>
    </div>
    <table width="100%" cellpadding="0" cellspacing="0">
      ${inner}
    </table>
    <!-- FOOTER \u2014 Green background -->
    <div style="background:#0F6E56;padding:16px 32px;text-align:center;">
      <p style="margin:0;font-size:11px;color:rgba(255,255,255,.75);font-family:Arial,sans-serif;">
        Tempo Books &nbsp;&middot;&nbsp; Ayende CX Inc. &nbsp;&middot;&nbsp; Toronto, Canada
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
  badgeText = 'Black-owned &nbsp;&middot;&nbsp; Canadian &nbsp;&middot;&nbsp; CRA-ready',
): string {
  const showBadge = bg === '#0F6E56' && badgeText;
  const badge = showBadge
    ? `
  <tr>
    <td style="background:#0F6E56;padding:10px 40px 24px;text-align:center;">
      <span style="display:inline-block;background:rgba(255,255,255,.18);color:#ffffff;
                   font-size:11px;font-weight:bold;letter-spacing:.07em;text-transform:uppercase;
                   padding:4px 14px;border-radius:99px;font-family:Arial,sans-serif;">
        ${badgeText}
      </span>
    </td>
  </tr>`
    : '';
  return `
  <tr>
    <td style="background:${bg};padding:28px 40px 10px;text-align:center;border-bottom:${showBadge ? 'none' : `1px solid ${border}`};">
      <h2 style="margin:0;font-family:Georgia,'Times New Roman',serif;font-size:22px;
                 font-weight:bold;color:${colour};line-height:1.35;text-align:center;">
        &ldquo;${text}&rdquo;
      </h2>
    </td>
  </tr>
  ${badge}`;
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
    <td style="padding:8px 0;border-bottom:1px solid #f0f0f0;vertical-align:top;width:20px;">
      <span style="color:#0F6E56;font-size:16px;line-height:1;">&#10003;</span>
    </td>
    <td style="padding:8px 0 8px 12px;border-bottom:1px solid #f0f0f0;">
      <p style="margin:0;font-size:15px;color:#333333;"><strong>${strong}</strong> ${rest}</p>
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

// -- Section label helper (partnership templates) ---------------------------
function sLabel(text: string): string {
  return `
    <p style="margin:28px 0 12px;font-size:12px;font-weight:700;color:#0F6E56;letter-spacing:1.2px;text-transform:uppercase;font-family:Arial,sans-serif;">
      ${text}
    </p>`;
}

// -- Signature block helper (partnership templates) -------------------------
function partnerSig(): string {
  return `
    <table width="100%" cellpadding="0" cellspacing="0">
      <tr><td style="border-top:1px solid #e8e8e8;padding-top:20px;">
        <p style="margin:0 0 2px;font-size:15px;font-weight:700;color:#1a1a2e;font-family:Arial,sans-serif;">Adesanya Ehinmidu</p>
        <p style="margin:0 0 2px;font-size:13px;color:#666666;font-family:Arial,sans-serif;">Founder &amp; CEO, Tempo Books</p>
        <p style="margin:0 0 2px;font-size:13px;font-family:Arial,sans-serif;">
          <a href="mailto:ade.ehinmidu@gettempo.ca" style="color:#0F6E56;text-decoration:none;">ade.ehinmidu@gettempo.ca</a>
        </p>
        <p style="margin:0;font-size:13px;font-family:Arial,sans-serif;">
          <a href="https://gettempo.ca" style="color:#0F6E56;text-decoration:none;">gettempo.ca</a>
        </p>
      </td></tr>
    </table>`;
}

// -- Bullet with green dot (partnership body) -------------------------------
function pBullet(html: string): string {
  return `
    <table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 4px;">
      <tr>
        <td width="24" valign="top" style="padding:4px 0;font-size:15px;color:#0F6E56;font-weight:bold;">&bull;</td>
        <td style="padding:4px 0;font-size:15px;color:#333333;line-height:1.7;font-family:Arial,sans-serif;">${html}</td>
      </tr>
    </table>`;
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
      Your books are waiting. Pick up where you left off in just a couple of clicks.
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
    <div style="background:#0F6E56;padding:24px 32px;">
      <table cellpadding="0" cellspacing="0"><tr>
        <td style="vertical-align:middle;padding-right:10px;">
          <img src="https://gettempo.ca/tempo-logo-bar.png" alt="Tempo Books" width="36" height="36"
               style="display:block;border-radius:7px;" />
        </td>
        <td style="vertical-align:middle;">
          <span style="font-size:17px;font-weight:bold;color:#ffffff;font-family:Arial,sans-serif;">Tempo Books</span>
        </td>
      </tr></table>
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
      In the meantime, you\u2019re welcome to get started \u2014 every plan has a free trial or
      money-back guarantee, and Starter and Pro don\u2019t require a credit card.
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

    ${cta('Start your free trial \u2192', 'https://gettempo.ca/sign-up')}

    <p style="margin:-16px 0 24px;font-size:13px;color:#888888;font-style:italic;">
      No credit card required for Starter and Pro. Accountant plans include a 30-day money-back guarantee.
    </p>

    <p style="margin:0;font-size:15px;color:#555555;">
      Adesanya Ehinmidu<br/>
      <span style="color:#888888;">Founder \u2014 Tempo Books &nbsp;|&nbsp;
        <a href="https://gettempo.ca" style="color:#0F6E56;text-decoration:none;">gettempo.ca</a>
      </span>
    </p>
  </td></tr>`),
  },

  // -- PARTNERSHIP TEMPLATES (16-22) -----------------------------------------

  // 16 -- partnership_mission_fund -------------------------------------------
  {
    name:        'partnership_mission_fund',
    description: 'Partnership outreach to mission-aligned funds (BOF, FACE) \u2014 sponsored access model',
    subject:     'Bookkeeping access for {{organization_name}} program participants',
    from_email:  'partnership@gettempo.ca',
    from_name:   'Adesanya Ehinmidu',
    variables:   ['contact_name', 'organization_name'],
    html_body: wrap(`
  ${hero('Financial clarity shouldn\u2019t be a privilege. Let\u2019s make it part of the program.', '#0F6E56', '#ffffff', '#0F6E56', 'Black-owned &nbsp;&middot;&nbsp; Canadian &nbsp;&middot;&nbsp; CRA-ready')}
  <tr><td style="padding:32px 32px 8px 32px;">
    <p style="margin:0 0 20px;font-size:15px;color:#333333;line-height:1.7;font-family:Arial,sans-serif;">
      Hi {{contact_name}},
    </p>

    <p style="margin:0 0 20px;font-size:15px;color:#333333;line-height:1.7;font-family:Arial,sans-serif;">
      I\u2019m writing because {{organization_name}}\u2019s work resonates deeply with why I built Tempo Books.
      You fund pathways to economic participation for Black entrepreneurs. We build the financial
      infrastructure they need to stay on that path.
    </p>

    ${sLabel('THE GAP')}
    <p style="margin:0 0 20px;font-size:15px;color:#333333;line-height:1.7;font-family:Arial,sans-serif;">
      The businesses your programs support often graduate with funding, mentorship, and networks \u2014
      but without a bookkeeping system. Within 90 days, most are back to shoeboxes of receipts and
      spreadsheets they don\u2019t trust. When tax season arrives, the businesses your program invested
      in are scrambling \u2014 not because they lack discipline, but because no one gave them the right system.
    </p>

    ${sLabel('THE PROPOSAL')}
    <p style="margin:0 0 16px;font-size:15px;color:#333333;line-height:1.7;font-family:Arial,sans-serif;">
      We\u2019d like to offer Tempo Books Pro to {{organization_name}} program participants as a
      sponsored resource. Your organization subscribes at a negotiated group rate. Each participant gets:
    </p>
    ${pBullet('<strong>A fully configured bookkeeping platform</strong> \u2014 connected to their Canadian bank account, with automatic transaction classification and CRA-ready reports.')}
    ${pBullet('<strong>HST remittance tracking</strong> \u2014 built in, not bolted on. No accountant required to stay compliant.')}
    ${pBullet('<strong>Quarterly outcome data</strong> \u2014 we\u2019ll provide aggregate reporting on participant engagement: transactions posted, reports generated, filing deadlines met. Measurable impact for your program reporting.')}

    ${sLabel('ABOUT TEMPO BOOKS')}
    <p style="margin:0 0 20px;font-size:15px;color:#333333;line-height:1.7;font-family:Arial,sans-serif;">
      Tempo Books is Black-owned, Canadian-built, and purpose-designed for the businesses your programs
      serve. It\u2019s not a scaled-down enterprise tool. It\u2019s bookkeeping built from scratch for
      sole proprietors and early-stage small businesses \u2014 the segment that falls through the
      cracks of every other platform.
    </p>

    ${sLabel('THE ASK')}
    <p style="margin:0 0 20px;font-size:15px;color:#333333;line-height:1.7;font-family:Arial,sans-serif;">
      I\u2019d welcome a conversation about how this might fit into your current programming. No deck
      required \u2014 just a 20-minute call to explore whether there\u2019s alignment.
    </p>
    <p style="margin:0 0 28px;font-size:15px;color:#333333;line-height:1.7;font-family:Arial,sans-serif;">
      Would any time in the next two weeks work?
    </p>
  </td></tr>
  <tr><td style="padding:0 32px 32px 32px;">${partnerSig()}</td></tr>`),
  },

  // 17 -- partnership_community_workshop -------------------------------------
  {
    name:        'partnership_community_workshop',
    description: 'Partnership outreach to community orgs (CBCC, BEBC Society) \u2014 workshop + $25/mo member pricing',
    subject:     'Free bookkeeping workshop for {{organization_name}} members',
    from_email:  'partnership@gettempo.ca',
    from_name:   'Adesanya Ehinmidu',
    variables:   ['contact_name', 'organization_name', 'org_program_type'],
    html_body: wrap(`
  ${hero('CRA-ready in 60 minutes \u2014 a free workshop for your members.', '#0F6E56', '#ffffff', '#0F6E56', 'Black-owned &nbsp;&middot;&nbsp; Canadian &nbsp;&middot;&nbsp; CRA-ready')}
  <tr><td style="padding:32px 32px 8px 32px;">
    <p style="margin:0 0 20px;font-size:15px;color:#333333;line-height:1.7;font-family:Arial,sans-serif;">
      Hi {{contact_name}},
    </p>

    <p style="margin:0 0 20px;font-size:15px;color:#333333;line-height:1.7;font-family:Arial,sans-serif;">
      Your members run businesses. Most of them are managing their books in spreadsheets, or not managing
      them at all. That\u2019s not a character flaw \u2014 it\u2019s a tooling gap. I\u2019d like to
      help you close it.
    </p>

    ${sLabel('THE OFFER')}
    <p style="margin:0 0 16px;font-size:15px;color:#333333;line-height:1.7;font-family:Arial,sans-serif;">
      We\u2019d like to run a free, co-branded workshop for {{organization_name}} members:
      <strong>&ldquo;CRA-Ready in 60 Minutes \u2014 Bookkeeping Essentials for Small Business Owners.&rdquo;</strong>
      Here\u2019s what we deliver:
    </p>
    ${pBullet('<strong>A 60-minute live session</strong> covering bank feed setup, transaction classification, HST tracking, and how to generate a CRA-ready Income Statement. Practical, not theoretical.')}
    ${pBullet('<strong>Tempo handles all logistics</strong> \u2014 we build the slide deck, run the session, handle Q&amp;A, and provide follow-up resources. Your team\u2019s only role is promotion to members.')}
    ${pBullet('<strong>Permanent member pricing: $25/mo</strong> (50% off our retail Pro plan) for any {{organization_name}} member who signs up. This isn\u2019t a trial discount \u2014 it\u2019s a permanent rate as a member benefit.')}
    ${pBullet('<strong>Co-branded throughout</strong> \u2014 the workshop, follow-up emails, and member landing page all carry {{organization_name}}\u2019s branding alongside Tempo\u2019s.')}

    ${sLabel('WHY THIS WORKS FOR YOUR MEMBERS')}
    <p style="margin:0 0 20px;font-size:15px;color:#333333;line-height:1.7;font-family:Arial,sans-serif;">
      Most small business owners don\u2019t need an accountant full-time. They need a system that keeps
      their books current so that when tax season comes, they\u2019re not scrambling. Tempo connects to
      their Canadian bank accounts, classifies transactions automatically, calculates HST, and generates
      the reports their accountant (or CRA) actually needs. It\u2019s built for the businesses your
      chamber represents.
    </p>

    ${sLabel('THE ASK')}
    <p style="margin:0 0 20px;font-size:15px;color:#333333;line-height:1.7;font-family:Arial,sans-serif;">
      Would {{organization_name}} be open to hosting a session? I\u2019m flexible on format \u2014
      virtual, in-person, or hybrid. Happy to do a 15-minute call to scope it.
    </p>
    <p style="margin:0 0 28px;font-size:15px;color:#333333;line-height:1.7;font-family:Arial,sans-serif;">
      What does your calendar look like in the next couple of weeks?
    </p>
  </td></tr>
  <tr><td style="padding:0 32px 32px 32px;">${partnerSig()}</td></tr>`),
  },

  // 18 -- partnership_government_program -------------------------------------
  {
    name:        'partnership_government_program',
    description: 'Partnership outreach to government programs (BEP, FedDev Ontario) \u2014 formal tone, two-model offer',
    subject:     'Bookkeeping resource for {{program_name}} participants \u2014 partnership inquiry',
    from_email:  'partnership@gettempo.ca',
    from_name:   'Adesanya Ehinmidu',
    variables:   ['contact_name', 'organization_name', 'program_name'],
    html_body: wrap(`
  ${hero('Equipping {{program_name}} participants with CRA-ready financial systems.', '#0F6E56', '#ffffff', '#0F6E56', 'CRA-ready &nbsp;&middot;&nbsp; Canadian-built &nbsp;&middot;&nbsp; Founder-led')}
  <tr><td style="padding:32px 32px 8px 32px;">
    <p style="margin:0 0 20px;font-size:15px;color:#333333;line-height:1.7;font-family:Arial,sans-serif;">
      Dear {{contact_name}},
    </p>

    <p style="margin:0 0 20px;font-size:15px;color:#333333;line-height:1.7;font-family:Arial,sans-serif;">
      I am writing to introduce Tempo Books and to explore whether our platform could serve as a resource
      for {{program_name}} participants. We have built a Canadian bookkeeping platform specifically
      designed for the early-stage small businesses and sole proprietors that your program supports.
    </p>

    ${sLabel('THE CHALLENGE')}
    <p style="margin:0 0 20px;font-size:15px;color:#333333;line-height:1.7;font-family:Arial,sans-serif;">
      Many entrepreneurs who participate in government-supported programs receive invaluable mentorship,
      funding, and networks \u2014 but graduate without a sustainable system for managing their finances.
      The result is predictable: disorganized records, missed tax obligations, and a gap between program
      investment and long-term business viability. Bookkeeping is rarely the most visible need, but it
      is often the first thing that fails.
    </p>

    ${sLabel('WHAT TEMPO BOOKS PROVIDES')}
    <p style="margin:0 0 20px;font-size:15px;color:#333333;line-height:1.7;font-family:Arial,sans-serif;">
      Tempo Books is a CRA-ready bookkeeping platform that connects to Canadian bank accounts via Plaid,
      classifies transactions automatically, enforces double-entry accounting standards, and generates
      Income Statements, Balance Sheets, and Trial Balances. All data is processed and stored in Canada.
      The platform is designed to be usable without an accounting background \u2014 which is precisely
      the profile of the businesses your program serves.
    </p>

    ${sLabel('TWO PARTNERSHIP MODELS')}
    <p style="margin:0 0 16px;font-size:15px;color:#333333;line-height:1.7;font-family:Arial,sans-serif;">
      We are flexible on structure and would welcome the opportunity to discuss whichever approach
      fits your program:
    </p>
    ${pBullet('<strong>Sponsored Access</strong> \u2014 Tempo Books Pro is included as a program deliverable. Your program subscribes at a negotiated group rate. We handle provisioning, onboarding, and support. You receive quarterly aggregate outcome data for program reporting.')}
    ${pBullet('<strong>Ecosystem Resource Listing</strong> \u2014 Tempo Books is listed as a recommended resource in your program materials. Participants sign up independently. No cost to your program. We provide a dedicated landing page for {{program_name}} participants.')}

    ${sLabel('THE ASK')}
    <p style="margin:0 0 20px;font-size:15px;color:#333333;line-height:1.7;font-family:Arial,sans-serif;">
      We would welcome a brief conversation to explore whether there is alignment. I am available at
      your convenience for a 20-minute call.
    </p>
    <p style="margin:0 0 28px;font-size:15px;color:#333333;line-height:1.7;font-family:Arial,sans-serif;">
      Would any time in the coming weeks suit your schedule?
    </p>
  </td></tr>
  <tr><td style="padding:0 32px 32px 32px;">${partnerSig()}</td></tr>`),
  },

  // 19 -- partnership_bank_sponsored -----------------------------------------
  {
    name:        'partnership_bank_sponsored',
    description: 'Bank partnership \u2014 sponsored access model for structured entrepreneur programs (TD Ready Commitment, RBC Future Launch)',
    subject:     'Bookkeeping infrastructure for {{program_name}} \u2014 partnership inquiry',
    from_email:  'partnership@gettempo.ca',
    from_name:   'Adesanya Ehinmidu',
    variables:   ['contact_name', 'bank_name', 'program_name'],
    html_body: wrap(`
  ${hero('Give {{program_name}} participants CRA-ready books from day one.', '#0F6E56', '#ffffff', '#0F6E56', 'CRA-ready &nbsp;&middot;&nbsp; Canadian-built &nbsp;&middot;&nbsp; Founder-led')}
  <tr><td style="padding:32px 32px 8px 32px;">
    <p style="margin:0 0 20px;font-size:15px;color:#333333;line-height:1.7;font-family:Arial,sans-serif;">
      Hi {{contact_name}},
    </p>

    <p style="margin:0 0 20px;font-size:15px;color:#333333;line-height:1.7;font-family:Arial,sans-serif;">
      I\u2019m reaching out because {{bank_name}}\u2019s {{program_name}} supports exactly the kind of
      businesses we built Tempo Books for \u2014 early-stage Canadian entrepreneurs who need
      professional-grade financial tools without the learning curve or the price tag.
    </p>

    ${sLabel('THE PROBLEM')}
    <p style="margin:0 0 20px;font-size:15px;color:#333333;line-height:1.7;font-family:Arial,sans-serif;">
      Most small businesses abandon their books within 90 days of starting. Not because they don\u2019t
      care, but because the tools weren\u2019t built for them. They\u2019re too complex, too expensive,
      or too disconnected from Canadian tax obligations. The result: missed HST remittances,
      disorganized records at tax time, and a gap between the support your program provides and the
      financial literacy that makes it stick.
    </p>

    ${sLabel('THE PROPOSAL')}
    <p style="margin:0 0 16px;font-size:15px;color:#333333;line-height:1.7;font-family:Arial,sans-serif;">
      We\u2019d like to offer Tempo Books Pro as a bundled resource for {{program_name}} participants.
      Here\u2019s what that looks like:
    </p>
    ${pBullet('<strong>Full Pro access at a negotiated per-seat rate</strong> \u2014 below our retail pricing, structured for program-scale deployment.')}
    ${pBullet('<strong>We handle provisioning, onboarding, and support</strong> \u2014 your team doesn\u2019t take on a new service burden.')}
    ${pBullet('<strong>Quarterly impact reporting</strong> \u2014 we\u2019ll provide usage metrics (transactions classified, reports generated, HST filed on time) so you can measure participant outcomes.')}
    ${pBullet('<strong>CRA-ready from day one</strong> \u2014 participants get automatic HST calculation, double-entry journal posting, and exportable Income Statements and Balance Sheets.')}

    ${sLabel('WHAT TEMPO BOOKS DOES')}
    <p style="margin:0 0 20px;font-size:15px;color:#333333;line-height:1.7;font-family:Arial,sans-serif;">
      Tempo Books is a Canadian-built bookkeeping platform purpose-built for sole proprietors, freelancers,
      and small businesses. It connects to Canadian banks via Plaid, classifies transactions automatically,
      posts them to a proper double-entry ledger, and generates CRA-ready financial reports. It\u2019s not
      a spreadsheet. It\u2019s not a receipt scanner. It\u2019s the bookkeeping system these businesses
      would have if they could afford a dedicated accountant.
    </p>

    ${sLabel('THE ASK')}
    <p style="margin:0 0 20px;font-size:15px;color:#333333;line-height:1.7;font-family:Arial,sans-serif;">
      I\u2019d love 20 minutes to walk you through the platform and scope a pilot for the next
      {{program_name}} cohort. No deck, no sales pitch \u2014 just a screen share and a conversation
      about whether this fits.
    </p>
    <p style="margin:0 0 28px;font-size:15px;color:#333333;line-height:1.7;font-family:Arial,sans-serif;">
      Would any time in the next two weeks work for you?
    </p>
  </td></tr>
  <tr><td style="padding:0 32px 32px 32px;">${partnerSig()}</td></tr>`),
  },

  // 20 -- partnership_bank_referral ------------------------------------------
  {
    name:        'partnership_bank_referral',
    description: 'Bank partnership \u2014 revenue share referral model for large SME client bases',
    subject:     'Referral partnership \u2014 bookkeeping for {{bank_name}} small business clients',
    from_email:  'partnership@gettempo.ca',
    from_name:   'Adesanya Ehinmidu',
    variables:   ['contact_name', 'bank_name'],
    html_body: wrap(`
  ${hero('A bookkeeping platform your small business clients already need.', '#0F6E56', '#ffffff', '#0F6E56', 'CRA-ready &nbsp;&middot;&nbsp; Canadian-built &nbsp;&middot;&nbsp; Founder-led')}
  <tr><td style="padding:32px 32px 8px 32px;">
    <p style="margin:0 0 20px;font-size:15px;color:#333333;line-height:1.7;font-family:Arial,sans-serif;">
      Hi {{contact_name}},
    </p>

    <p style="margin:0 0 20px;font-size:15px;color:#333333;line-height:1.7;font-family:Arial,sans-serif;">
      Your small business clients are already managing their banking with {{bank_name}}. The one thing
      most of them aren\u2019t managing well is their books \u2014 and that creates problems you see
      downstream: messy records, missed filings, and avoidable CRA friction.
    </p>

    ${sLabel('THE OPPORTUNITY')}
    <p style="margin:0 0 20px;font-size:15px;color:#333333;line-height:1.7;font-family:Arial,sans-serif;">
      Tempo Books is a Canadian-built bookkeeping platform that connects directly to your clients\u2019
      bank accounts via Plaid, classifies their transactions automatically, posts them to a proper
      double-entry ledger, and generates CRA-ready financial reports. We\u2019ve built the product
      your clients need but don\u2019t know how to ask for.
    </p>
    <p style="margin:0 0 20px;font-size:15px;color:#333333;line-height:1.7;font-family:Arial,sans-serif;">
      We\u2019re looking for a referral partner who can put it in front of them.
    </p>

    ${sLabel('HOW IT WORKS')}
    ${pBullet('<strong>{{bank_name}} recommends Tempo Books</strong> to small business clients through your existing advisory channels \u2014 branch advisors, digital marketplace, onboarding flows, or email communications.')}
    ${pBullet('<strong>We handle everything</strong> \u2014 billing, onboarding, support. Your team doesn\u2019t take on a service obligation.')}
    ${pBullet('<strong>{{bank_name}} earns a recurring commission</strong> on every client that converts to a paid subscription. We\u2019ll provide a partner dashboard with real-time visibility into referral volume, conversion rate, and commission accrual.')}
    ${pBullet('<strong>Clients stay with {{bank_name}}</strong> \u2014 Tempo deepens the banking relationship by making their financial data more organized, which improves the quality of every interaction they have with your advisors.')}

    ${sLabel('WHY TEMPO BOOKS')}
    <p style="margin:0 0 20px;font-size:15px;color:#333333;line-height:1.7;font-family:Arial,sans-serif;">
      We\u2019re not QuickBooks and we\u2019re not trying to be. Tempo is built specifically for Canadian
      sole proprietors and small businesses \u2014 the segment that\u2019s too small for enterprise
      accounting software but too serious to run their business on spreadsheets. HST is calculated
      automatically. Reports are CRA-ready. Bank feeds are Canadian-first via Plaid. And the platform
      is designed to be usable without an accounting background.
    </p>

    ${sLabel('THE ASK')}
    <p style="margin:0 0 20px;font-size:15px;color:#333333;line-height:1.7;font-family:Arial,sans-serif;">
      I\u2019d love 15 minutes to walk you through the partner dashboard and talk through terms.
      We\u2019re open to structuring a 90-day pilot with a defined referral cohort so you can evaluate
      conversion and retention metrics before committing.
    </p>
    <p style="margin:0 0 28px;font-size:15px;color:#333333;line-height:1.7;font-family:Arial,sans-serif;">
      Does any time in the next two weeks work?
    </p>
  </td></tr>
  <tr><td style="padding:0 32px 32px 32px;">${partnerSig()}</td></tr>`),
  },

  // 21 -- partnership_cra_liaison --------------------------------------------
  {
    name:        'partnership_cra_liaison',
    description: 'Outreach to CRA Liaison Officer Initiative \u2014 resource listing framing, no endorsement ask',
    subject:     'CRA-ready bookkeeping resource for small business clients',
    from_email:  'partnership@gettempo.ca',
    from_name:   'Adesanya Ehinmidu',
    variables:   ['contact_name'],
    html_body: wrap(`
  ${hero('A CRA-ready bookkeeping tool for the small businesses you support.', '#0F6E56', '#ffffff', '#0F6E56', 'CRA-ready &nbsp;&middot;&nbsp; Canadian-built &nbsp;&middot;&nbsp; Double-entry compliant')}
  <tr><td style="padding:32px 32px 8px 32px;">
    <p style="margin:0 0 20px;font-size:15px;color:#333333;line-height:1.7;font-family:Arial,sans-serif;">
      Dear {{contact_name}},
    </p>

    <p style="margin:0 0 20px;font-size:15px;color:#333333;line-height:1.7;font-family:Arial,sans-serif;">
      I am writing to introduce you to Tempo Books, a Canadian-built bookkeeping platform designed for
      sole proprietors and small businesses. I understand that CRA Liaison Officers work directly with
      small business owners to help them meet their tax obligations, and I believe Tempo Books may be
      a useful resource for the clients you support.
    </p>

    ${sLabel('WHAT TEMPO BOOKS DOES')}
    <p style="margin:0 0 20px;font-size:15px;color:#333333;line-height:1.7;font-family:Arial,sans-serif;">
      Tempo Books connects to Canadian bank accounts, imports transactions automatically, and posts them
      to a proper double-entry general ledger. The platform calculates HST on every transaction, enforces
      balanced journal entries, and generates CRA-ready financial statements including Income Statements,
      Balance Sheets, and Trial Balances. All data is processed and stored in Canada.
    </p>

    ${sLabel('WHY IT MATTERS FOR YOUR CLIENTS')}
    <p style="margin:0 0 20px;font-size:15px;color:#333333;line-height:1.7;font-family:Arial,sans-serif;">
      Many of the small businesses that engage with the Liaison Officer program struggle not with tax
      compliance intent but with the mechanics of recordkeeping. They do not have accountants. They do
      not use formal bookkeeping systems. When they file, their records are often incomplete or
      disorganized. Tempo Books addresses this gap by providing a structured, automated system that
      requires no accounting background to operate.
    </p>

    ${sLabel('WHAT I AM ASKING')}
    <p style="margin:0 0 20px;font-size:15px;color:#333333;line-height:1.7;font-family:Arial,sans-serif;">
      I am not asking for an endorsement. I understand that CRA maintains neutrality on commercial
      products. What I would appreciate is the opportunity to share a brief overview of the platform
      so that you can evaluate whether it merits inclusion in the resources you make available to small
      business clients. I am happy to provide a demo, documentation, or answer any questions about how
      the system works.
    </p>
    <p style="margin:0 0 28px;font-size:15px;color:#333333;line-height:1.7;font-family:Arial,sans-serif;">
      Would you be open to a brief call at your convenience?
    </p>
  </td></tr>
  <tr><td style="padding:0 32px 32px 32px;">${partnerSig()}</td></tr>`),
  },

  // 22 -- partnership_followup -----------------------------------------------
  {
    name:        'partnership_followup',
    description: 'Follow-up to all Wave 1 partnership contacts who did not respond within 10\u201314 business days',
    subject:     'Following up \u2014 {{organization_name}}',
    from_email:  'partnership@gettempo.ca',
    from_name:   'Adesanya Ehinmidu',
    variables:   ['contact_name', 'organization_name', 'original_send_date'],
    html_body: wrap(`
  <!-- NO HERO SECTION \u2014 logo bar flows directly into body -->
  <tr><td style="padding:32px 32px 8px 32px;">
    <p style="margin:0 0 20px;font-size:15px;color:#333333;line-height:1.7;font-family:Arial,sans-serif;">
      Hi {{contact_name}},
    </p>

    <p style="margin:0 0 20px;font-size:15px;color:#333333;line-height:1.7;font-family:Arial,sans-serif;">
      I sent a note on {{original_send_date}} about Tempo Books and a potential partnership with
      {{organization_name}}. I know these things can get buried, so I wanted to follow up briefly.
    </p>

    <p style="margin:0 0 20px;font-size:15px;color:#333333;line-height:1.7;font-family:Arial,sans-serif;">
      The short version: we\u2019ve built a Canadian bookkeeping platform for the small businesses
      your organization supports, and I think there\u2019s a fit worth exploring.
    </p>

    <p style="margin:0 0 20px;font-size:15px;color:#333333;line-height:1.7;font-family:Arial,sans-serif;">
      Would a 15-minute call this week or next work for you?
    </p>

    <p style="margin:0 0 28px;font-size:15px;color:#333333;line-height:1.7;font-family:Arial,sans-serif;">
      No worries at all if the timing isn\u2019t right.
    </p>
  </td></tr>
  <tr><td style="padding:0 32px 32px 32px;">${partnerSig()}</td></tr>`),
  },

];

// -- Templates that must be force-updated on every deploy -------------------
const FORCE_UPDATE_NAMES = new Set<string>([
  'signup_welcome',
  'trial_ending',
  'payment_failed',
  'abandoned_cart',
  'cold_outreach',
  'lead_acknowledgement',
  'partnership_mission_fund',
  'partnership_community_workshop',
  'partnership_government_program',
  'partnership_bank_sponsored',
  'partnership_bank_referral',
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
