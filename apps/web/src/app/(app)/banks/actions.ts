'use server';
import { revalidatePath } from 'next/cache';
import { api } from '@/lib/api';

export async function createLinkToken(): Promise<{
  success: boolean;
  link_token?: string;
  error?: string;
}> {
  try {
    const data = await api('/plaid/link-token', { method: 'POST' });
    return { success: true, link_token: data.link_token };
  } catch (error: any) {
    return { success: false, error: error.message ?? 'Failed to create link token.' };
  }
}

export async function exchangeToken(
  publicToken: string,
  institutionName: string,
  institutionId: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    await api('/plaid/exchange-token', {
      method: 'POST',
      body: JSON.stringify({
        public_token: publicToken,
        institution_name: institutionName,
        institution_id: institutionId,
      }),
    });
    revalidatePath('/banks');
    revalidatePath('/dashboard');
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message ?? 'Failed to connect bank.' };
  }
}

export async function disconnectBank(
  itemId: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    await api(`/plaid/items/${itemId}`, { method: 'DELETE' });
    revalidatePath('/banks');
    revalidatePath('/dashboard');
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message ?? 'Failed to disconnect bank.' };
  }
}

export async function syncBank(
  itemId: string,
): Promise<{ success: boolean; added?: number; modified?: number; removed?: number; error?: string }> {
  try {
    const data = await api<{ added: number; modified: number; removed: number }>(
      `/plaid/items/${itemId}/sync`,
      { method: 'POST' },
    );
    revalidatePath('/banks');
    revalidatePath('/transactions');
    revalidatePath('/dashboard');
    return { success: true, added: data.added, modified: data.modified, removed: data.removed };
  } catch (error: any) {
    return { success: false, error: error.message ?? 'Sync failed.' };
  }
}
