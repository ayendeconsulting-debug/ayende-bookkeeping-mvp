'use server';

import { revalidatePath } from 'next/cache';
import { api } from '@/lib/api';

export async function createRule(data: {
  match_type: string;
  match_value: string;
  target_account_id: string;
  priority: number;
}) {
  try {
    await api('/classification/rules', { method: 'POST', body: JSON.stringify(data) });
    revalidatePath('/rules');
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function updateRule(id: string, data: {
  match_value?: string;
  target_account_id?: string;
  priority?: number;
}) {
  try {
    await api(`/classification/rules/${id}`, { method: 'PATCH', body: JSON.stringify(data) });
    revalidatePath('/rules');
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function deleteRule(id: string) {
  try {
    await api(`/classification/rules/${id}`, { method: 'DELETE' });
    revalidatePath('/rules');
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
