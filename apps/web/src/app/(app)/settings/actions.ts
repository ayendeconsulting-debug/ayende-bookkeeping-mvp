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
    const result = await api<{ url: string }>('/billing/portal', {
      method: 'POST',
      body: JSON.stringify({ return_url: 'https://gettempo.ca/settings' }),
    });
    return { success: true, url: result.url };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// ── Phase 9: Tax Settings ─────────────────────────────────────────────────────

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
