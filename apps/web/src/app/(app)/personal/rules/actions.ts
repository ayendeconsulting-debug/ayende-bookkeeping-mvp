'use server';
import { revalidatePath } from 'next/cache';
import { api } from '@/lib/api';

export async function createPersonalRule(data: {
  match_type: string;
  match_value: string;
  budget_category_id: string;
  priority: number;
}) {
  try {
    await api('/personal/rules', { method: 'POST', body: JSON.stringify(data) });
    revalidatePath('/personal/rules');
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function updatePersonalRule(id: string, data: {
  match_value?: string;
  budget_category_id?: string;
  priority?: number;
}) {
  try {
    await api(`/personal/rules/${id}`, { method: 'PATCH', body: JSON.stringify(data) });
    revalidatePath('/personal/rules');
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function deletePersonalRule(id: string) {
  try {
    await api(`/personal/rules/${id}`, { method: 'DELETE' });
    revalidatePath('/personal/rules');
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function runPersonalRules() {
  try {
    const data = await api('/personal/rules/run', { method: 'POST', body: '{}' });
    revalidatePath('/transactions');
    return { success: true, data };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
