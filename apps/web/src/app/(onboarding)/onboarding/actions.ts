'use server';

import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';

const API_URL = process.env.API_URL || 'http://localhost:3005';

async function getAuthHeaders() {
  const { getToken } = await auth();
  const token = await getToken();
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

async function patchBusiness(data: Record<string, unknown>) {
  const res = await fetch(`${API_URL}/businesses/me`, {
    method: 'PATCH',
    headers: await getAuthHeaders(),
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    return { error: body.message ?? 'Request failed' };
  }
  return {};
}

/* ── Step 1: Save mode + country ─────────────────────────────────────────── */
export async function saveModeAndCountry(
  mode: 'business' | 'freelancer' | 'personal',
  country: 'CA' | 'US',
): Promise<{ error?: string }> {
  return patchBusiness({ mode, country });
}

/* ── Step 2: Save business details ───────────────────────────────────────── */
export async function saveBusinessDetails(data: {
  name: string;
  currency_code: string;
  fiscal_year_end?: string;
}): Promise<{ error?: string }> {
  return patchBusiness(data);
}

/* ── Phase 9: Get provinces for onboarding dropdown ─────────────────────── */
export async function getProvincesForOnboarding(): Promise<{
  data?: Array<{
    province_code: string;
    province_name: string;
    hst_rate: number | null;
    gst_rate: number;
    is_hst_province: boolean;
  }>;
  error?: string;
}> {
  try {
    const res = await fetch(`${API_URL}/tax/provinces`, {
      headers: await getAuthHeaders(),
      cache: 'no-store',
    });
    if (!res.ok) return { error: 'Failed to load provinces' };
    const data = await res.json();
    return { data };
  } catch {
    return { error: 'Network error loading provinces' };
  }
}

/* ── Phase 9: Save tax settings (province, HST number, frequency) ────────── */
export async function saveTaxSettings(data: {
  province_code?: string;
  hst_registration_number?: string;
  hst_reporting_frequency?: 'monthly' | 'quarterly' | 'annual';
}): Promise<{ error?: string }> {
  if (!data.province_code) return {};
  const res = await fetch(`${API_URL}/businesses/me/tax-settings`, {
    method: 'PATCH',
    headers: await getAuthHeaders(),
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    return { error: body.message ?? 'Failed to save tax settings' };
  }
  return {};
}

/* ── Step 3: Seed chart of accounts ──────────────────────────────────────── */
export async function seedAccounts(
  industry: string,
): Promise<{ seeded?: number; skipped?: boolean; error?: string }> {
  const res = await fetch(`${API_URL}/businesses/seed-accounts`, {
    method: 'POST',
    headers: await getAuthHeaders(),
    body: JSON.stringify({ industry }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    return { error: body.message ?? 'Failed to seed accounts' };
  }
  return res.json();
}

/* ── Step 4: Create first tax code (optional) ────────────────────────────── */
export async function createFirstTaxCode(data: {
  code: string;
  name: string;
  rate: number;
  tax_type: 'input' | 'output';
  tax_account_id: string;
}): Promise<{ error?: string }> {
  const res = await fetch(`${API_URL}/tax/codes`, {
    method: 'POST',
    headers: await getAuthHeaders(),
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    return { error: body.message ?? 'Failed to create tax code' };
  }
  return {};
}

/* ── Step 5: Fetch legal acceptance status ───────────────────────────────── */
export interface LegalStatusDocument {
  document_type: string;
  current_version: string;
  accepted_version: string | null;
  is_current: boolean;
}

export async function fetchLegalAcceptanceStatus(): Promise<{
  all_accepted: boolean;
  requires_reacceptance: boolean;
  documents: LegalStatusDocument[];
  error?: string;
}> {
  try {
    const res = await fetch(`${API_URL}/legal/acceptance-status`, {
      headers: await getAuthHeaders(),
      cache: 'no-store',
    });
    if (!res.ok) {
      return { all_accepted: false, requires_reacceptance: true, documents: [], error: 'Failed to fetch status' };
    }
    return res.json();
  } catch {
    return { all_accepted: false, requires_reacceptance: true, documents: [], error: 'Network error' };
  }
}

/* ── Step 5: Accept legal documents ──────────────────────────────────────── */
export async function acceptLegalDocuments(
  documents: {
    document_type: string;
    document_version: string;
    acceptance_source: string;
  }[],
): Promise<{ error?: string }> {
  const res = await fetch(`${API_URL}/legal/accept`, {
    method: 'POST',
    headers: await getAuthHeaders(),
    body: JSON.stringify({ documents }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    return { error: body.message ?? 'Failed to record legal acceptance' };
  }
  return {};
}

/* ── Phase 12 Step 6: Create Stripe checkout from onboarding ────────────── */
// Sets onboarding_checkout cookie so billing/success redirects to /banks
export async function createCheckoutSessionFromOnboarding(
  plan: 'starter' | 'pro' | 'accountant',
  billing_cycle: 'monthly' | 'annual',
): Promise<{ url?: string; error?: string }> {
  const res = await fetch(`${API_URL}/billing/create-checkout-session`, {
    method: 'POST',
    headers: await getAuthHeaders(),
    body: JSON.stringify({ plan, billing_cycle }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    return { error: body.message ?? 'Failed to create checkout session' };
  }
  const data = await res.json();

  // Mark this checkout as coming from onboarding so /billing/success
  // redirects to /banks (Step 7) instead of /dashboard
  const cookieStore = await cookies();
  cookieStore.set('onboarding_checkout', '1', {
    maxAge: 60 * 30, // 30 minutes — enough time to complete Stripe checkout
    path: '/',
    sameSite: 'lax',
  });

  return { url: data.url };
}

/* ── Step 7 / Complete: Mark onboarding done and redirect ────────────────── */
export async function completeOnboarding(
  destination: '/dashboard' | '/banks',
): Promise<void> {
  await patchBusiness({ settings: { mode_selected: true } });
  redirect(destination);
}

/* ── Legacy — kept for backward compatibility ────────────────────────────── */
export async function saveModeSelection(
  mode: 'business' | 'freelancer' | 'personal',
  country: 'CA' | 'US',
): Promise<{ error?: string }> {
  const result = await patchBusiness({
    mode,
    country,
    settings: { mode_selected: true },
  });
  if (result.error) return result;
  redirect('/dashboard');
}
