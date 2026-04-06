'use server';

import { revalidatePath } from 'next/cache';
import { api } from '@/lib/api';

export interface Province {
  province_code: string;
  province_name: string;
  tax_rate: number;
  tax_name: string;
}

export async function getProvinces(): Promise<Province[]> {
  try {
    const data = await api<Province[]>('/tax/provinces');
    return data;
  } catch {
    return [];
  }
}

export async function createClient(data: {
  name: string;
  businessType: 'sole_prop' | 'corp' | 'partnership';
  country: 'CA' | 'US';
  province_code?: string;
  hst_registration_number?: string;
  hst_reporting_frequency?: 'monthly' | 'quarterly' | 'annual';
  seedTemplate: 'standard_ca' | 'standard_us' | 'blank';
  clientEmail?: string;
  clientFirstName?: string;
}) {
  try {
    await api('/firms/me/clients', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    revalidatePath('/accountant/clients');
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
