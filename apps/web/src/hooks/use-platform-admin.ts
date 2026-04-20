'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@clerk/nextjs';

/**
 * Returns whether the current user is a Tempo platform admin.
 * Calls GET /admin/check -- the same endpoint used by the admin page
 * server-side guard. Result is cached for the lifetime of the component.
 */
export function usePlatformAdmin(): { isAdmin: boolean; loading: boolean } {
  const { getToken } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function check() {
      try {
        const token = await getToken();
        if (!token) {
          if (!cancelled) setLoading(false);
          return;
        }
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3005'}/admin/check`,
          { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' },
        );
        if (!cancelled) setIsAdmin(res.ok);
      } catch {
        // Non-fatal -- silently treat as non-admin
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    check();
    return () => { cancelled = true; };
  }, [getToken]);

  return { isAdmin, loading };
}
