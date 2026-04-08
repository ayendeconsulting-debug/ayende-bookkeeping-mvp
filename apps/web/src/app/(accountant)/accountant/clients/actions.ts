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

export interface FirmAiUsage {
  used: number;
  cap: number;
  percentage: number;
}

export async function getClients(): Promise<ClientListItem[]> {
  try {
    const data = await api<ClientListItem[]>('/firms/me/clients');
    return data;
  } catch {
    return [];
  }
}

export async function getFirmAiUsage(): Promise<FirmAiUsage | null> {
  try {
    const data = await api<FirmAiUsage>('/ai/firm-usage');
    return data;
  } catch {
    // Non-accountant plan or no firm — return null, widget is hidden
    return null;
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
