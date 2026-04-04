export interface AbandonedCartTemplateVars {
  checkoutUrl: string;
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

export function abandonedCartTemplate(vars: AbandonedCartTemplateVars): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Complete your Tempo setup</title>
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
            <p style="margin:0;font-size:17px;font-weight:bold;color:#0F6E56;font-family:Arial,sans-serif;">
              You were this close.
            </p>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="padding:36px 40px;">
            <p style="margin:0 0 16px;font-size:16px;color:#333333;line-height:1.6;">
              You started setting up your Tempo subscription but didn't quite finish.
            </p>
            <p style="margin:0 0 28px;font-size:16px;color:#333333;line-height:1.6;">
              Your books are waiting. Pick up where you left off — your free 60-day trial is still
              available, with no charge until the trial ends.
            </p>

            <!-- CTA -->
            <table cellpadding="0" cellspacing="0" style="margin-bottom:20px;">
              <tr>
                <td style="background:#0F6E56;border-radius:6px;">
                  <a href="${vars.checkoutUrl}"
                     style="display:inline-block;padding:14px 32px;font-size:16px;font-weight:bold;
                            color:#ffffff;text-decoration:none;font-family:Arial,sans-serif;">
                    Complete your setup →
                  </a>
                </td>
              </tr>
            </table>

            <p style="margin:0;font-size:13px;color:#aaaaaa;">This link expires in 24 hours.</p>
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
