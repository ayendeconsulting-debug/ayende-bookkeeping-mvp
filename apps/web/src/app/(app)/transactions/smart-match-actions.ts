'use server';

import { revalidatePath } from 'next/cache';
import { api } from '@/lib/api';

export async function getSmartMatchCounts() {
  try {
    const result = await api<{ suggested: number; cap_exceeded: number; failed: number; manual: number }>(
      '/smart-match/counts',
    );
    return { success: true, data: result };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function confirmSmartMatch(rawTransactionId: string) {
  try {
    await api(`/smart-match/${rawTransactionId}/confirm`, {
      method: 'POST',
      body: JSON.stringify({}),
    });
    revalidatePath('/transactions');
    revalidatePath('/dashboard');
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function overrideSmartMatch(
  rawTransactionId: string,
  data: { accountId: string; taxCodeId?: string },
) {
  try {
    await api(`/smart-match/${rawTransactionId}/override`, {
      method: 'POST',
      body: JSON.stringify({ accountId: data.accountId, taxCodeId: data.taxCodeId }),
    });
    revalidatePath('/transactions');
    revalidatePath('/dashboard');
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function bulkConfirmSmartMatch(rawTransactionIds?: string[]) {
  try {
    const result = await api<{ confirmed: number; skipped: number; errors: number }>(
      '/smart-match/bulk-confirm',
      { method: 'POST', body: JSON.stringify({ rawTransactionIds }) },
    );
    revalidatePath('/transactions');
    revalidatePath('/dashboard');
    return { success: true, data: result };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function runSmartMatch() {
  try {
    await api('/smart-match/run', { method: 'POST' });
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}