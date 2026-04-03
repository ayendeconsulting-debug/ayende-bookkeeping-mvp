'use server';

import { revalidatePath } from 'next/cache';
import { api } from '@/lib/api';
import { SavingsGoal } from '@/types';

export async function createSavingsGoal(data: {
  name: string;
  target_amount: number;
  current_amount?: number;
  target_date?: string;
}): Promise<{ success: boolean; data?: SavingsGoal; error?: string }> {
  try {
    const result = await api<SavingsGoal>('/personal/savings-goals', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    revalidatePath('/personal/goals');
    revalidatePath('/personal/dashboard');
    return { success: true, data: result };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function updateSavingsGoal(
  id: string,
  data: {
    name?: string;
    target_amount?: number;
    current_amount?: number;
    target_date?: string;
    status?: string;
  },
): Promise<{ success: boolean; error?: string }> {
  try {
    await api(`/personal/savings-goals/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
    revalidatePath('/personal/goals');
    revalidatePath('/personal/dashboard');
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function deleteSavingsGoal(
  id: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    await api(`/personal/savings-goals/${id}`, { method: 'DELETE' });
    revalidatePath('/personal/goals');
    revalidatePath('/personal/dashboard');
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
