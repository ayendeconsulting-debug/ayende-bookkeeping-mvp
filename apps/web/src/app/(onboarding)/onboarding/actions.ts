'use server';

import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';

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

/* ── Step 1: Save mode + country ──────────────────────────────────────────── */
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

/* ── Step 6 / Complete: Mark onboarding done and redirect ────────────────── */
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
