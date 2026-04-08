'use server';

import { revalidatePath } from 'next/cache';
import { api } from '@/lib/api';

export async function createAccount(data: {
  account_code: string;
  account_name: string;
  account_type: string;
  account_subtype?: string;
}) {
  try {
    await api('/accounts', { method: 'POST', body: JSON.stringify(data) });
    revalidatePath('/accounts');
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function updateAccount(id: string, data: {
  account_name?: string;
  account_code?: string;
}) {
  try {
    await api(`/accounts/${id}`, { method: 'PATCH', body: JSON.stringify(data) });
    revalidatePath('/accounts');
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function deactivateAccount(id: string) {
  try {
    await api(`/accounts/${id}/deactivate`, { method: 'PATCH' });
    revalidatePath('/accounts');
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/* ── Phase 12: Seed standard default chart of accounts ───────────────────── */
export async function seedDefaultAccounts(): Promise<{
  success: boolean;
  data?: { added: number; skipped: number };
  error?: string;
}> {
  try {
    const result = await api<{ added: number; skipped: number }>(
      '/accounts/seed-defaults',
      { method: 'POST' },
    );
    revalidatePath('/accounts');
    return { success: true, data: result };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
