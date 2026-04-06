'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@clerk/nextjs';

interface Firm {
  id: string;
  name: string;
  subdomain: string;
  logo_url: string | null;
  brand_colour: string | null;
  owner_clerk_id: string;
}

interface UseFirmResult {
  firm: Firm | null;
  loading: boolean;
  error: string | null;
  hasFirm: boolean;
}

export function useCurrentFirm(): UseFirmResult {
  const { getToken } = useAuth();
  const [firm, setFirm] = useState<Firm | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function fetchFirm() {
      try {
        const token = await getToken();
        if (!token) {
          setLoading(false);
          return;
        }

        const res = await fetch('/api/proxy/firms/me', {
          headers: { Authorization: `Bearer ${token}` },
          cache: 'no-store',
        });

        if (res.status === 404) {
          if (!cancelled) {
            setFirm(null);
            setLoading(false);
          }
          return;
        }

        if (!res.ok) throw new Error('Failed to fetch firm');

        const data = await res.json();
        if (!cancelled) {
          setFirm(data);
          setLoading(false);
        }
      } catch (err) {
        if (!cancelled) {
          setError((err as Error).message);
          setLoading(false);
        }
      }
    }

    fetchFirm();
    return () => { cancelled = true; };
  }, [getToken]);

  return { firm, loading, error, hasFirm: !!firm };
}
