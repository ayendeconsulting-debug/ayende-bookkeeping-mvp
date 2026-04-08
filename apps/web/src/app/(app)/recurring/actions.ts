'use server';

import { revalidatePath } from 'next/cache';
import { api } from '@/lib/api';

export async function createRecurring(data: {
  description: string;
  amount: number;
  debit_account_id: string;
  credit_account_id: string;
  frequency: string;
  start_date: string;
  end_date?: string;
  notes?: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    await api('/recurring', { method: 'POST', body: JSON.stringify(data) });
    revalidatePath('/recurring');
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function updateRecurring(
  id: string,
  data: { description?: string; amount?: number; end_date?: string; notes?: string },
): Promise<{ success: boolean; error?: string }> {
  try {
    await api(`/recurring/${id}`, { method: 'PATCH', body: JSON.stringify(data) });
    revalidatePath('/recurring');
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function pauseRecurring(id: string): Promise<{ success: boolean; error?: string }> {
  try {
    await api(`/recurring/${id}/pause`, { method: 'POST' });
    revalidatePath('/recurring');
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function resumeRecurring(id: string): Promise<{ success: boolean; error?: string }> {
  try {
    await api(`/recurring/${id}/resume`, { method: 'POST' });
    revalidatePath('/recurring');
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function cancelRecurring(id: string): Promise<{ success: boolean; error?: string }> {
  try {
    await api(`/recurring/${id}`, { method: 'DELETE' });
    revalidatePath('/recurring');
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
