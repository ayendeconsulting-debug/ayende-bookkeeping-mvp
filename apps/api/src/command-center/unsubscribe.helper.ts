import * as crypto from 'crypto';

// ── Category type ─────────────────────────────────────────────────────────────
export type UnsubscribeCategory = 'tips' | 'broadcasts' | 'partnership' | 'cold';

// ── Template → category map ───────────────────────────────────────────────────
// Templates NOT in this map are transactional — no unsubscribe check or footer.
export const TEMPLATE_CATEGORY_MAP: Record<string, UnsubscribeCategory> = {
  cold_outreach:                   'cold',
  partnership_mission_fund:        'partnership',
  partnership_community_workshop:  'partnership',
  partnership_government_program:  'partnership',
  partnership_bank_program:        'partnership',
  partnership_cra_liaison:         'partnership',
  partnership_followup:            'partnership',
  // Broadcast campaigns use 'broadcasts' — resolved dynamically in processor
};

// ── Token helpers ─────────────────────────────────────────────────────────────

export function generateToken(email: string, secret: string): string {
  const emailB64 = Buffer.from(email.toLowerCase().trim()).toString('base64url');
  const hmac = crypto
    .createHmac('sha256', secret)
    .update(emailB64)
    .digest('base64url');
  return `${emailB64}.${hmac}`;
}

export function verifyToken(token: string, secret: string): string | null {
  try {
    const dotIndex = token.lastIndexOf('.');
    if (dotIndex === -1) return null;
    const emailB64    = token.slice(0, dotIndex);
    const providedHmac = token.slice(dotIndex + 1);
    const expectedHmac = crypto
      .createHmac('sha256', secret)
      .update(emailB64)
      .digest('base64url');
    const a = Buffer.from(providedHmac);
    const b = Buffer.from(expectedHmac);
    if (a.length !== b.length) return null;
    if (!crypto.timingSafeEqual(a, b)) return null;
    return Buffer.from(emailB64, 'base64url').toString('utf-8');
  } catch {
    return null;
  }
}

// ── Footer injection ──────────────────────────────────────────────────────────

export function injectUnsubscribeFooter(
  html: string,
  token: string,
  appUrl: string,
): string {
  const link = `${appUrl}/unsubscribe?token=${encodeURIComponent(token)}`;
  const footer = `
  <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:8px;">
    <tr>
      <td style="padding:12px 40px 20px;text-align:center;">
        <p style="margin:0;font-size:11px;color:#9CA3AF;font-family:Arial,sans-serif;line-height:1.6;">
          You received this email from Tempo Books &mdash; 209 Queen Street West, Toronto, ON &mdash;
          <a href="${link}" style="color:#9CA3AF;text-decoration:underline;">Manage email preferences</a>
          &nbsp;or&nbsp;
          <a href="${link}" style="color:#9CA3AF;text-decoration:underline;">Unsubscribe</a>
        </p>
      </td>
    </tr>
  </table>`;

  if (html.includes('</body>')) {
    return html.replace('</body>', `${footer}</body>`);
  }
  return html + footer;
}
