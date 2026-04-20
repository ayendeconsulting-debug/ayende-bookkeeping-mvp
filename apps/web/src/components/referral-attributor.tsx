'use client';

import { useEffect, useRef } from 'react';

/**
 * ReferralAttributor
 *
 * Fires a single POST to /api/proxy/referrals/attribute on mount.
 * The proxy reads the HttpOnly tempo_ref cookie; if present, it calls
 * the backend to attribute the signup to the referral partner and then
 * clears the cookie. If no cookie exists, the proxy returns immediately.
 *
 * Renders nothing. Safe to include on any authenticated page.
 */
export function ReferralAttributor() {
  const fired = useRef(false);

  useEffect(() => {
    if (fired.current) return;
    fired.current = true;

    fetch('/api/proxy/referrals/attribute', { method: 'POST' }).catch(() => {});
  }, []);

  return null;
}
