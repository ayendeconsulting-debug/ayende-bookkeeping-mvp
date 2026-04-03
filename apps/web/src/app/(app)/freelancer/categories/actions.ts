'use server';

import { revalidatePath } from 'next/cache';
import { api } from '@/lib/api';
import { Account } from '@/types';

export async function createExpenseCategory(data: {
  account_name: string;
  account_code: string;
}): Promise<{ success: boolean; data?: Account; error?: string }> {
  try {
    const result = await api<Account>('/accounts', {
      method: 'POST',
      body: JSON.stringify({
        account_name: data.account_name,
        account_code: data.account_code,
        account_type: 'expense',
        is_active: true,
      }),
    });
    revalidatePath('/freelancer/categories');
    return { success: true, data: result };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function toggleCategoryActive(
  id: string,
  isActive: boolean,
): Promise<{ success: boolean; error?: string }> {
  try {
    await api(`/accounts/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ is_active: isActive }),
    });
    revalidatePath('/freelancer/categories');
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
