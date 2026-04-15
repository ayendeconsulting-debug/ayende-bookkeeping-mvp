'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@clerk/nextjs';

type SubscriptionPlan = 'starter' | 'pro' | 'accountant' | null;

interface UseSubscriptionResult {
  plan: SubscriptionPlan;
  loading: boolean;
}

export function useSubscription(): UseSubscriptionResult {
  const { getToken } = useAuth();
  const [plan, setPlan] = useState<SubscriptionPlan>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function fetchSubscription() {
      try {
        const token = await getToken();
        if (!token) { setLoading(false); return; }

        const res = await fetch('/api/proxy/billing/subscription', {
          headers: { Authorization: `Bearer ${token}` },
          cache: 'no-store',
        });

        if (!res.ok) { setLoading(false); return; }

        const data = await res.json();
        if (!cancelled) {
          setPlan(data.plan ?? null);
          setLoading(false);
        }
      } catch {
        if (!cancelled) setLoading(false);
      }
    }

    fetchSubscription();
    return () => { cancelled = true; };
  }, [getToken]);

  return { plan, loading };
}
