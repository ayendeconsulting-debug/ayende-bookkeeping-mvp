'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@clerk/nextjs';

interface DemoAccessResult {
  hasDemoAccess: boolean;
  isAdmin: boolean;
  loading: boolean;
}

/**
 * Returns whether the current user has demo or platform admin access.
 *
 * Calls GET /demo/check — returns 200 for platform_role: 'demo' or 'admin',
 * 403 for all other users.
 *
 * Used to show the Demo Mode indicator in the sidebar without exposing
 * admin-only surfaces to demo users.
 */
export function useDemoAccess(): DemoAccessResult {
  const { getToken } = useAuth();
  const [hasDemoAccess, setHasDemoAccess] = useState(false);
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
          `${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3005'}/demo/check`,
          { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' },
        );

        if (!cancelled && res.ok) {
          const data = await res.json();
          setHasDemoAccess(true);
          setIsAdmin(data.is_admin ?? false);
        }
      } catch {
        // Non-fatal — silently treat as no demo access
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    check();
    return () => { cancelled = true; };
  }, [getToken]);

  return { hasDemoAccess, isAdmin, loading };
}
