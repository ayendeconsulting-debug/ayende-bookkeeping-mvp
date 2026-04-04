export interface TrialEndingTemplateVars {
  firstName: string;
  daysRemaining: number; // 14, 3, or 0
  trialEndDate: string;
  planName: string;
  planPrice: string;
  billingCycle: 'monthly' | 'annual';
  portalUrl: string;
}

const LOGO_URL = 'https://gettempo.ca/logo.svg';

const emailHeader = `
  <tr>
    <td style="background:#0F6E56;padding:24px 40px;">
      <img src="${LOGO_URL}" alt="Tempo" width="140" height="38"
           style="display:block;border:0;outline:none;text-decoration:none;"
           onerror="this.style.display='none';document.getElementById('logo-fallback').style.display='block'"/>
      <span id="logo-fallback"
            style="display:none;font-size:22px;font-weight:bold;color:#ffffff;font-family:Arial,sans-serif;">
        Tempo
      </span>
    </td>
  </tr>`;

function getSubject(daysRemaining: number): string {
  if (daysRemaining === 0) return 'Your Tempo trial ends today';
  return `Your Tempo trial ends in ${daysRemaining} days`;
}

function getPriceLabel(price: string, cycle: 'monthly' | 'annual'): string {
  return cycle === 'monthly' ? `${price}/month` : `${price}/year`;
}

export function trialEndingTemplate(vars: TrialEndingTemplateVars): { subject: string; html: string } {
  const subject = getSubject(vars.daysRemaining);
  const priceLabel = getPriceLabel(vars.planPrice, vars.billingCycle);

  let headlineText: string;
  let bodyText: string;
  let heroBg: string;
  let heroColor: string;

  if (vars.daysRemaining === 0) {
    headlineText = 'Your free trial ends today.';
    bodyText = `Your ${vars.planName} plan will continue and your payment method will be charged <strong>${priceLabel}</strong>. Everything stays exactly as it is — your books, your data, your settings.`;
    heroBg = '#FEF3C7';
    heroColor = '#92400E';
  } else if (vars.daysRemaining <= 3) {
    headlineText = `Your Tempo free trial ends in ${vars.daysRemaining} days.`;
    bodyText = `Your ${vars.planName} plan will continue automatically at <strong>${priceLabel}</strong>. Your payment method on file will be charged on <strong>${vars.trialEndDate}</strong>.`;
    heroBg = '#FEF9EC';
    heroColor = '#92400E';
  } else {
    headlineText = `Your Tempo free trial ends in ${vars.daysRemaining} days.`;
    bodyText = `After that, you'll be charged <strong>${priceLabel}</strong> for your ${vars.planName} plan. No action needed — your subscription continues automatically on <strong>${vars.trialEndDate}</strong>.`;
    heroBg = '#EDF7F2';
    heroColor = '#065F46';
  }

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${subject}</title>
</head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:40px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0"
             style="max-width:600px;background:#ffffff;border-radius:8px;overflow:hidden;border:1px solid #e5e7eb;">

        ${emailHeader}

        <!-- Hero band -->
        <tr>
          <td style="background:${heroBg};padding:20px 40px;border-bottom:1px solid #e5e7eb;">
            <p style="margin:0;font-size:17px;font-weight:bold;color:${heroColor};font-family:Arial,sans-serif;">
              ${headlineText}
            </p>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="padding:36px 40px;">
            <p style="margin:0 0 20px;font-size:16px;color:#333333;">Hi ${vars.firstName},</p>
            <p style="margin:0 0 28px;font-size:16px;color:#333333;line-height:1.6;">${bodyText}</p>

            <p style="margin:0 0 28px;font-size:15px;color:#555555;">
              Want to review or change your plan before then?
            </p>

            <!-- CTA -->
            <table cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
              <tr>
                <td style="background:#0F6E56;border-radius:6px;">
                  <a href="${vars.portalUrl}"
                     style="display:inline-block;padding:14px 32px;font-size:16px;font-weight:bold;
                            color:#ffffff;text-decoration:none;font-family:Arial,sans-serif;">
                    Manage your subscription →
                  </a>
                </td>
              </tr>
            </table>

            ${vars.daysRemaining === 0
              ? `<p style="margin:0;font-size:14px;color:#666666;">
                   If you have any questions before your billing starts, reply to this email.
                 </p>`
              : ''}
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="background:#f4f4f5;padding:24px 40px;border-top:1px solid #e5e7eb;">
            <p style="margin:0;font-size:13px;color:#888888;">— The Tempo Team<br/>Administration</p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;

  return { subject, html };
}
