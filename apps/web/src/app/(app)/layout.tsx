import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import { AppShell } from '@/components/app-shell';
import { BillingBanner } from '@/components/billing-banner';
import { BusinessMode } from '@/types';

const API_URL = process.env.API_URL || 'http://localhost:3005';

// Routes inside (app) that are exempt from the subscription gate
const BILLING_EXEMPT_PATHS = [
  '/billing/success',
  '/billing/cancel',
  '/settings',
];

async function provisionBusiness(clerkOrgId: string, orgName: string): Promise<void> {
  try {
    const res = await fetch(`${API_URL}/businesses/provision`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ clerkOrgId, name: orgName }),
      cache: 'no-store',
    });
    if (!res.ok) {
      console.error('[provisionBusiness] Failed:', res.status, await res.text());
    }
  } catch (err) {
    console.error('[provisionBusiness] Error:', err);
  }
}

async function getMyBusiness(
  token: string,
): Promise<{ settings?: Record<string, unknown>; mode?: string } | null> {
  try {
    const res = await fetch(`${API_URL}/businesses/me`, {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      cache: 'no-store',
    });

    // 451 — legal re-acceptance required
    if (res.status === 451) {
      redirect('/legal/update');
    }

    if (!res.ok) return null;
    return res.json();
  } catch (err: any) {
    // redirect() throws internally in Next.js — re-throw so it propagates
    if (err?.digest?.startsWith('NEXT_REDIRECT')) throw err;
    return null;
  }
}

async function getSubscriptionStatus(token: string) {
  try {
    const res = await fetch(`${API_URL}/billing/subscription`, {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      cache: 'no-store',
    });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { userId, orgId, orgSlug, getToken } = await auth();

  if (!userId) redirect('/sign-in');
  if (!orgId)  redirect('/sign-in?error=no-org');

  await provisionBusiness(orgId, orgSlug ?? 'My Business');

  const token = await getToken();
  let business: { settings?: Record<string, unknown>; mode?: string } | null = null;
  let subscription = null;

  if (token) {
    [business, subscription] = await Promise.all([
      getMyBusiness(token),
      getSubscriptionStatus(token),
    ]);

    // ── Onboarding gate ───────────────────────────────────────────────────
    if (business && !business.settings?.mode_selected) {
      redirect('/onboarding');
    }

    // ── Subscription gate ─────────────────────────────────────────────────
    const headersList = await headers();
    const pathname    = headersList.get('x-pathname') ?? '';
    const isExempt    = BILLING_EXEMPT_PATHS.some((p) => pathname.startsWith(p));

    if (
      !isExempt &&
      business?.settings?.mode_selected &&
      subscription?.status === 'none'
    ) {
      redirect('/pricing?start=1');
    }
  }

  const mode = (business?.mode ?? 'business') as BusinessMode;

  return (
    <AppShell mode={mode}>
      <BillingBanner subscription={subscription} />
      {children}
    </AppShell>
  );
}
