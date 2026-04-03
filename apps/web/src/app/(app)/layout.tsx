import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { UserButton } from '@clerk/nextjs';
import { Sidebar } from '@/components/sidebar';
import { AiChatWidget } from '@/components/ai-chat-widget';
import { BusinessMode } from '@/types';

const API_URL = process.env.API_URL || 'http://localhost:3005';

/**
 * Provisions the business record in the DB for the Clerk org.
 * Idempotent — safe to call on every page load.
 */
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

/**
 * Fetches the current business details using the Clerk JWT.
 * Returns null on error so the app degrades gracefully.
 */
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

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { userId, orgId, orgSlug, getToken } = await auth();

  if (!userId) redirect('/sign-in');
  if (!orgId) redirect('/sign-in?error=no-org');

  // Step 1: Provision the business record (idempotent)
  await provisionBusiness(orgId, orgSlug ?? 'My Business');

  // Step 2: Fetch business details
  const token = await getToken();
  let business: { settings?: Record<string, unknown>; mode?: string } | null = null;

  if (token) {
    business = await getMyBusiness(token);

    // If mode_selected is not set, redirect to onboarding
    if (business && !business.settings?.mode_selected) {
      redirect('/onboarding');
    }
  }

  const mode = (business?.mode ?? 'business') as BusinessMode;

  return (
    // bg-background uses the CSS var — white in light mode, dark navy in dark mode
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar mode={mode} />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top bar — bg-card and border-border respond to dark mode automatically */}
        <header className="h-14 border-b border-border bg-card flex items-center justify-end px-6 flex-shrink-0">
          <UserButton
            appearance={{
              elements: {
                avatarBox: 'w-8 h-8',
              },
            }}
          />
        </header>
        {/* Page content */}
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>

      {/* Persistent AI chat widget — available on all authenticated screens */}
      <AiChatWidget />
    </div>
  );
}
