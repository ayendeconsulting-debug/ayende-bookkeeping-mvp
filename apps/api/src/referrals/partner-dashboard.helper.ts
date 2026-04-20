import * as crypto from 'crypto';

const EXPIRY_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

/**
 * Generate a signed magic-link token for the partner dashboard.
 * Payload: base64url(email|timestamp).hmac
 * Uses PARTNER_DASHBOARD_SECRET env var (NFR-9).
 */
export function generatePartnerToken(email: string): string {
  const secret = process.env.PARTNER_DASHBOARD_SECRET;
  if (!secret) throw new Error('PARTNER_DASHBOARD_SECRET not configured');
  const payload = `${email.toLowerCase().trim()}|${Date.now()}`;
  const payloadB64 = Buffer.from(payload).toString('base64url');
  const hmac = crypto
    .createHmac('sha256', secret)
    .update(payloadB64)
    .digest('base64url');
  return `${payloadB64}.${hmac}`;
}

/**
 * Verify a partner dashboard token. Returns the email if valid, null otherwise.
 * Checks HMAC signature and 7-day expiry (NFR-4).
 */
export function verifyPartnerToken(token: string): string | null {
  const secret = process.env.PARTNER_DASHBOARD_SECRET;
  if (!secret) return null;
  try {
    const dotIndex = token.lastIndexOf('.');
    if (dotIndex === -1) return null;
    const payloadB64 = token.slice(0, dotIndex);
    const providedHmac = token.slice(dotIndex + 1);
    const expectedHmac = crypto
      .createHmac('sha256', secret)
      .update(payloadB64)
      .digest('base64url');
    const a = Buffer.from(providedHmac);
    const b = Buffer.from(expectedHmac);
    if (a.length !== b.length) return null;
    if (!crypto.timingSafeEqual(a, b)) return null;
    const payload = Buffer.from(payloadB64, 'base64url').toString('utf-8');
    const pipeIndex = payload.lastIndexOf('|');
    if (pipeIndex === -1) return null;
    const email = payload.slice(0, pipeIndex);
    const timestamp = parseInt(payload.slice(pipeIndex + 1), 10);
    if (isNaN(timestamp)) return null;
    if (Date.now() - timestamp > EXPIRY_MS) return null;
    return email;
  } catch {
    return null;
  }
}
