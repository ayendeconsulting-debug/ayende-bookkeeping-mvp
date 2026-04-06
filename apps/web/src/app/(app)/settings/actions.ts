'use server';

import { revalidatePath } from 'next/cache';
import { api } from '@/lib/api';

export async function getBusinessSettings() {
  try {
    return await api('/businesses/me', { method: 'GET' });
  } catch {
    return null;
  }
}

export async function updateBusinessSettings(data: {
  name?: string;
  fiscal_year_end?: string;
  currency_code?: string;
}) {
  try {
    await api('/businesses/me', { method: 'PATCH', body: JSON.stringify(data) });
    revalidatePath('/settings');
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function verifyAccountingIntegrity() {
  try {
    const result = await api('/ledger/verify', { method: 'GET' });
    return { success: true, data: result };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function getCurrencyRates(base: string) {
  try {
    const result = await api<{
      base: string;
      rates: Record<string, number>;
      supported_currencies: string[];
    }>(`/currency/rates?base=${base}`);
    return { success: true, data: result };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function getSubscriptionStatus() {
  try {
    const result = await api('/billing/subscription', { method: 'GET' });
    return { success: true, data: result };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function createPortalSession() {
  try {
    const result = await api<{ url: string }>('/billing/create-portal-session', {
      method: 'POST',
      body: JSON.stringify({ return_url: 'https://gettempo.ca/settings' }),
    });
    return { success: true, url: result.url };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// ── Phase 9: Tax Settings ─────────────────────────────────────────────────

export async function getProvinces() {
  try {
    const result = await api<Array<{
      id: string;
      province_code: string;
      province_name: string;
      hst_rate: number | null;
      gst_rate: number;
      is_hst_province: boolean;
    }>>('/tax/provinces');
    return { success: true, data: result };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function updateTaxSettings(data: {
  province_code?: string;
  hst_registration_number?: string;
  hst_reporting_frequency?: 'monthly' | 'quarterly' | 'annual';
}) {
  try {
    await api('/businesses/me/tax-settings', {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
    revalidatePath('/settings');
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// ── Phase 11: Accountant Access ───────────────────────────────────────────

export interface AccessRequest {
  id: string;
  firm_id: string;
  business_id: string;
  requested_by_clerk_id: string;
  access_type: string;
  status: 'pending' | 'approved' | 'denied' | 'expired';
  access_note: string | null;
  requested_at: string;
  responded_at: string | null;
  expires_at: string | null;
  firm?: { id: string; name: string; logo_url: string | null; brand_colour: string | null };
}

export interface AuditLogEntry {
  id: string;
  business_id: string;
  firm_id: string;
  actor_clerk_id: string;
  actor_name: string;
  action: string;
  entity_type: string;
  entity_id: string;
  before_snapshot: Record<string, unknown> | null;
  after_snapshot: Record<string, unknown> | null;
  performed_at: string;
}

export async function getAccessRequests(): Promise<AccessRequest[]> {
  try {
    return await api<AccessRequest[]>('/businesses/me/access-requests');
  } catch {
    return [];
  }
}

export async function respondToAccessRequest(
  requestId: string,
  decision: 'approved' | 'denied',
  customExpiresAt?: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    await api(`/businesses/me/access-requests/${requestId}/respond`, {
      method: 'PATCH',
      body: JSON.stringify({ decision, customExpiresAt }),
    });
    revalidatePath('/settings');
    revalidatePath('/dashboard');
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function getAccountantActivity(
  startDate?: string,
  endDate?: string,
): Promise<{ data: AuditLogEntry[]; total: number }> {
  try {
    const params = new URLSearchParams();
    if (startDate) params.set('startDate', startDate);
    if (endDate) params.set('endDate', endDate);
    params.set('limit', '50');
    return await api(`/businesses/me/accountant-activity?${params.toString()}`);
  } catch {
    return { data: [], total: 0 };
  }
}
