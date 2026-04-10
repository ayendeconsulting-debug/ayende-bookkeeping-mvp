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
