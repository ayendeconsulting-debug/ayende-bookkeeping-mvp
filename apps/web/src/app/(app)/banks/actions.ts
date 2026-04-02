'use server';

import { revalidatePath } from 'next/cache';
import { api } from '@/lib/api';

/**
 * Create a Plaid Link token to initiate the bank connection flow.
 * Called client-side via Server Action before opening Plaid Link.
 */
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

/**
 * Exchange the public_token returned by Plaid Link for a permanent access_token.
 * Called after Plaid Link onSuccess callback.
 */
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

/**
 * Disconnect a bank — revokes Plaid token and soft-deletes locally.
 */
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
