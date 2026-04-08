import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import { AppShell } from '@/components/app-shell';
import { AlertBanner, AlertState } from '@/components/alert-banner';
import { BusinessMode } from '@/types';

const API_URL = process.env.API_URL || 'http://localhost:3005';

const GRACE_PERIOD_DAYS = 7;

// Routes inside (app) that are exempt from the subscription gate
const BILLING_EXEMPT_PATHS = [
  '/billing/success',
  '/billing/cancel',
  '/settings',
  '/dashboard',
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
): Promise<{ settings?: Record<string, unknown>; mode?: string; created_at?: string } | null> {
  try {
    const res = await fetch(`${API_URL}/businesses/me`, {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      cache: 'no-store',
    });

    // 451 â€“ legal re-acceptance required
    if (res.status === 451) {
      redirect('/legal/update');
    }

    if (!res.ok) return null;
    return res.json();
  } catch (err: any) {
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

async function getBillingAlerts(token: string): Promise<AlertState[]> {
  try {
    const res = await fetch(`${API_URL}/billing/alerts`, {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      cache: 'no-store',
    });
    if (!res.ok) return [];
    return res.json();
  } catch {
    return [];
  }
}

function isGracePeriodExpired(createdAt: string | undefined): boolean {
  if (!createdAt) return false;
  const created = new Date(createdAt).getTime();
  const now = Date.now();
  const diffDays = (now - created) / (1000 * 60 * 60 * 24);
  return diffDays > GRACE_PERIOD_DAYS;
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
  let business: { settings?: Record<string, unknown>; mode?: string; created_at?: string } | null = null;
  let subscription = null;
  let alerts: AlertState[] = [];

  if (token) {
    [business, subscription, alerts] = await Promise.all([
      getMyBusiness(token),
      getSubscriptionStatus(token),
      getBillingAlerts(token),
    ]);

    // â”€â”€ Onboarding gate â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    if (business && !business.settings?.mode_selected) {
      redirect('/onboarding');
    }

    // â”€â”€ Subscription gate â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    const headersList = await headers();
    const pathname    = headersList.get('x-pathname') ?? '';
    const isExempt    = BILLING_EXEMPT_PATHS.some((p) => pathname.startsWith(p));

    if (!isExempt && business?.settings?.mode_selected) {
      // Hard-redirect on 'cancelled' â€” unambiguous signal the user cancelled.
      if (subscription?.status === 'cancelled') {
        redirect('/pricing?start=1');
      }

      // Redirect on 'none' only after the grace period has elapsed.
      // 'none' within the first 7 days is treated as a Stripe webhook delay â€”
      // never lock out a newly registered user.
      if (
        subscription?.status === 'none' &&
        isGracePeriodExpired(business.created_at)
      ) {
        redirect('/pricing?start=1');
      }
    }
  }

  const mode = (business?.mode ?? 'business') as BusinessMode;

  return (
    <AppShell mode={mode}>
      <AlertBanner alerts={alerts} />
      {children}
    </AppShell>
  );
}

