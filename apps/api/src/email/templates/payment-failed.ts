export interface PaymentFailedTemplateVars {
  firstName: string;
  amount: string;
  planName: string;
  nextRetryDate?: string;
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

export function paymentFailedTemplate(vars: PaymentFailedTemplateVars): string {
  const retryNote = vars.nextRetryDate
    ? `<p style="margin:0 0 20px;font-size:16px;color:#333333;line-height:1.6;">
         Stripe will retry automatically on <strong>${vars.nextRetryDate}</strong>, but we recommend
         updating your payment method now to avoid any interruption to your account.
       </p>`
    : `<p style="margin:0 0 20px;font-size:16px;color:#333333;line-height:1.6;">
         Please update your payment method to keep access to your account.
       </p>`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Action required — payment failed</title>
</head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:40px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0"
             style="max-width:600px;background:#ffffff;border-radius:8px;overflow:hidden;border:1px solid #e5e7eb;">

        ${emailHeader}

        <!-- Alert band -->
        <tr>
          <td style="background:#FEF2F2;padding:20px 40px;border-bottom:1px solid #FECACA;
                     border-left:4px solid #DC2626;">
            <p style="margin:0;font-size:17px;font-weight:bold;color:#DC2626;font-family:Arial,sans-serif;">
              ⚠️ Payment failed — action required
            </p>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="padding:36px 40px;">
            <p style="margin:0 0 16px;font-size:16px;color:#333333;">Hi ${vars.firstName},</p>
            <p style="margin:0 0 20px;font-size:16px;color:#333333;line-height:1.6;">
              We weren't able to process your payment of <strong>${vars.amount}</strong>
              for your Tempo ${vars.planName} subscription.
            </p>
            ${retryNote}

            <!-- CTA -->
            <table cellpadding="0" cellspacing="0" style="margin:8px 0 32px;">
              <tr>
                <td style="background:#DC2626;border-radius:6px;">
                  <a href="${vars.portalUrl}"
                     style="display:inline-block;padding:14px 32px;font-size:16px;font-weight:bold;
                            color:#ffffff;text-decoration:none;font-family:Arial,sans-serif;">
                    Update payment method →
                  </a>
                </td>
              </tr>
            </table>

            <p style="margin:0;font-size:14px;color:#666666;">
              If you believe this is an error, reply to this email and we'll help sort it out.
            </p>
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
}
