'use server';

import { apiPatch } from '@/lib/api';

export async function assignPersonalCategory(
  transactionId: string,
  categoryId: string | null,
): Promise<{ success: boolean; error?: string }> {
  try {
    await apiPatch(`/personal/transactions/${transactionId}/category`, {
      category_id: categoryId,
    });
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message ?? 'Failed to assign category' };
  }
}

export async function bulkAssignPersonalCategory(
  transactionIds: string[],
  categoryId: string | null,
): Promise<{ success: boolean; assigned: number; error?: string }> {
  try {
    const results = await Promise.allSettled(
      transactionIds.map((id) =>
        apiPatch(`/personal/transactions/${id}/category`, { category_id: categoryId }),
      ),
    );
    const assigned = results.filter((r) => r.status === 'fulfilled').length;
    const failed   = results.filter((r) => r.status === 'rejected').length;
    if (failed > 0 && assigned === 0) {
      return { success: false, assigned: 0, error: 'All assignments failed' };
    }
    return { success: true, assigned };
  } catch (err: any) {
    return { success: false, assigned: 0, error: err?.message ?? 'Bulk assign failed' };
  }
}

import { api } from '@/lib/api';
import { revalidatePath } from 'next/cache';

export async function findSimilarPersonalTransactions(rawTransactionId: string): Promise<{
  success: boolean;
  data?: {
    similar: Array<{ id: string; transaction_date: string; description: string; amount: number }>;
    category_id: string | null;
    category_name: string | null;
    category_color: string | null;
    keyword: string;
  };
  error?: string;
}> {
  try {
    const result = await api('/personal/similar', {
      method: 'POST',
      body: JSON.stringify({ rawTransactionId }),
    });
    return { success: true, data: result as any };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function createPersonalRuleFromSimilar(data: {
  match_type: string;
  match_value: string;
  budget_category_id: string;
  priority?: number;
}): Promise<{ success: boolean; error?: string }> {
  try {
    await api('/personal/rules', {
      method: 'POST',
      body: JSON.stringify({
        match_type: data.match_type,
        match_value: data.match_value,
        budget_category_id: data.budget_category_id,
        priority: data.priority ?? 10,
      }),
    });
    revalidatePath('/personal/rules');
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
