'use server';

import { revalidatePath } from 'next/cache';
import { api } from '@/lib/api';

export interface ClientListItem {
  firmClientId: string;
  businessId: string;
  businessName: string;
  country: string;
  province_code: string | null;
  hst_registration_number: string | null;
  status: 'active' | 'archived';
  added_at: string;
}

export async function getClients(): Promise<ClientListItem[]> {
  try {
    const data = await api<ClientListItem[]>('/firms/me/clients');
    return data;
  } catch {
    return [];
  }
}

export async function archiveClient(firmClientId: string) {
  try {
    await api(`/firms/me/clients/${firmClientId}`, { method: 'DELETE' });
    revalidatePath('/accountant/clients');
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
