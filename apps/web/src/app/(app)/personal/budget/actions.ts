'use server';
import { revalidatePath } from 'next/cache';
import { api } from '@/lib/api';
import { BudgetCategory } from '@/types';

export async function createBudgetCategory(data: {
  name: string;
  monthly_target?: number;
  color?: string;
}): Promise<{ success: boolean; data?: BudgetCategory; error?: string }> {
  try {
    const result = await api<BudgetCategory>('/personal/budget-categories', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    revalidatePath('/personal/budget');
    revalidatePath('/personal/dashboard');
    return { success: true, data: result };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function updateBudgetCategory(
  id: string,
  data: { name?: string; monthly_target?: number | null; color?: string; sort_order?: number },
): Promise<{ success: boolean; error?: string }> {
  try {
    await api(`/personal/budget-categories/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
    revalidatePath('/personal/budget');
    revalidatePath('/personal/dashboard');
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function deleteBudgetCategory(
  id: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    await api(`/personal/budget-categories/${id}`, { method: 'DELETE' });
    revalidatePath('/personal/budget');
    revalidatePath('/personal/dashboard');
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function reorderBudgetCategories(
  items: { id: string; sort_order: number }[],
): Promise<{ success: boolean; error?: string }> {
  try {
    await api('/personal/budget-categories/reorder', {
      method: 'POST',
      body: JSON.stringify({ items }),
    });
    revalidatePath('/personal/budget');
    revalidatePath('/personal/dashboard');
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
