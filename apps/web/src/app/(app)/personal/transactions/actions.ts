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
