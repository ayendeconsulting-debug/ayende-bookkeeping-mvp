export interface WelcomeTemplateVars {
  firstName: string;
  trialEndDate: string;
  dashboardUrl: string;
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

export function welcomeTemplate(vars: WelcomeTemplateVars): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Welcome to Tempo</title>
</head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:40px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0"
             style="max-width:600px;background:#ffffff;border-radius:8px;overflow:hidden;border:1px solid #e5e7eb;">

        ${emailHeader}

        <!-- Hero band -->
        <tr>
          <td style="background:#EDF7F2;padding:20px 40px;border-bottom:1px solid #c6e8d8;">
            <p style="margin:0;font-size:18px;font-weight:bold;color:#0F6E56;font-family:Arial,sans-serif;">
              Your 60-day free trial has started 🎉
            </p>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="padding:36px 40px;">
            <p style="margin:0 0 16px;font-size:16px;color:#333333;">Hi ${vars.firstName},</p>
            <p style="margin:0 0 16px;font-size:16px;color:#333333;">
              You're in. Welcome to Tempo — smart bookkeeping built for Canadian and US small businesses.
            </p>
            <p style="margin:0 0 8px;font-size:16px;color:#333333;font-weight:bold;">Here's what to do first:</p>

            <!-- Steps -->
            <table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 28px;">
              <tr>
                <td style="padding:10px 0;border-bottom:1px solid #f0f0f0;vertical-align:top;width:32px;">
                  <span style="display:inline-block;width:24px;height:24px;background:#0F6E56;border-radius:50%;
                               color:#fff;font-size:13px;font-weight:bold;text-align:center;line-height:24px;">1</span>
                </td>
                <td style="padding:10px 0 10px 12px;border-bottom:1px solid #f0f0f0;">
                  <p style="margin:0;font-size:15px;color:#333333;">
                    <strong>Connect your bank</strong> — link accounts via Plaid for automatic transaction import
                  </p>
                </td>
              </tr>
              <tr>
                <td style="padding:10px 0;border-bottom:1px solid #f0f0f0;vertical-align:top;width:32px;">
                  <span style="display:inline-block;width:24px;height:24px;background:#0F6E56;border-radius:50%;
                               color:#fff;font-size:13px;font-weight:bold;text-align:center;line-height:24px;">2</span>
                </td>
                <td style="padding:10px 0 10px 12px;border-bottom:1px solid #f0f0f0;">
                  <p style="margin:0;font-size:15px;color:#333333;">
                    <strong>Review your chart of accounts</strong> — pre-seeded and ready to go
                  </p>
                </td>
              </tr>
              <tr>
                <td style="padding:10px 0;vertical-align:top;width:32px;">
                  <span style="display:inline-block;width:24px;height:24px;background:#0F6E56;border-radius:50%;
                               color:#fff;font-size:13px;font-weight:bold;text-align:center;line-height:24px;">3</span>
                </td>
                <td style="padding:10px 0 10px 12px;">
                  <p style="margin:0;font-size:15px;color:#333333;">
                    <strong>Record your first transaction</strong> — or import a bank statement to get started
                  </p>
                </td>
              </tr>
            </table>

            <p style="margin:0 0 28px;font-size:15px;color:#555555;background:#f9f9f9;
                       border-left:3px solid #0F6E56;padding:12px 16px;border-radius:0 4px 4px 0;">
              Your trial ends on <strong>${vars.trialEndDate}</strong>. No charge until then — and you can cancel anytime.
            </p>

            <!-- CTA -->
            <table cellpadding="0" cellspacing="0">
              <tr>
                <td style="background:#0F6E56;border-radius:6px;">
                  <a href="${vars.dashboardUrl}"
                     style="display:inline-block;padding:14px 32px;font-size:16px;font-weight:bold;
                            color:#ffffff;text-decoration:none;font-family:Arial,sans-serif;">
                    Go to your dashboard →
                  </a>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="background:#f4f4f5;padding:24px 40px;border-top:1px solid #e5e7eb;">
            <p style="margin:0 0 4px;font-size:13px;color:#888888;">Questions? Reply to this email and we'll get back to you.</p>
            <p style="margin:0;font-size:13px;color:#888888;">— The Tempo Team<br/>Administration</p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}
