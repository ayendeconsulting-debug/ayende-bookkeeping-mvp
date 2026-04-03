import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { AppShell } from '@/components/app-shell';
import { BillingBanner } from '@/components/billing-banner';
import { BusinessMode } from '@/types';

const API_URL = process.env.API_URL || 'http://localhost:3005';

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
    if (!res.ok) return null;
    return res.json();
  } catch {
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

    if (business && !business.settings?.mode_selected) {
      redirect('/onboarding');
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
