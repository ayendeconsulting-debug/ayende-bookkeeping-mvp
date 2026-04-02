'use server';

import { revalidatePath } from 'next/cache';
import { api } from '@/lib/api';

export async function createTaxCode(data: {
  code: string;
  name: string;
  rate: number;
  tax_type: string;
  tax_account_id: string;
}) {
  try {
    await api('/tax/codes', { method: 'POST', body: JSON.stringify(data) });
    revalidatePath('/tax');
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function updateTaxCode(id: string, data: {
  name?: string;
  rate?: number;
  is_active?: boolean;
}) {
  try {
    await api(`/tax/codes/${id}`, { method: 'PATCH', body: JSON.stringify(data) });
    revalidatePath('/tax');
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function deactivateTaxCode(id: string) {
  try {
    await api(`/tax/codes/${id}`, { method: 'DELETE' });
    revalidatePath('/tax');
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
