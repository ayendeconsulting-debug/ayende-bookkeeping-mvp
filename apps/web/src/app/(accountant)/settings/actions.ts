'use server';

import { revalidatePath } from 'next/cache';
import { api } from '@/lib/api';

export interface FirmSettings {
  id: string;
  name: string;
  subdomain: string;
  logo_url: string | null;
  brand_colour: string | null;
  owner_clerk_id: string;
}

export async function getFirm(): Promise<FirmSettings | null> {
  try {
    return await api<FirmSettings>('/firms/me');
  } catch {
    return null;
  }
}

export async function updateFirm(data: {
  name?: string;
  subdomain?: string;
  logo_url?: string;
  brand_colour?: string;
}) {
  try {
    await api('/firms/me', {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
    revalidatePath('/accountant/settings');
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function checkSubdomainAvailability(
  subdomain: string,
  currentSubdomain: string,
): Promise<{ available: boolean; message: string }> {
  if (subdomain === currentSubdomain) {
    return { available: true, message: 'This is your current subdomain.' };
  }
  if (!/^[a-z0-9-]+$/.test(subdomain)) {
    return { available: false, message: 'Only lowercase letters, numbers, and hyphens allowed.' };
  }
  if (subdomain.length < 3) {
    return { available: false, message: 'Subdomain must be at least 3 characters.' };
  }
  try {
    const res = await api<{ name: string | null }>(`/firms/branding/${subdomain}`);
    if (res.name === null) {
      return { available: true, message: 'This subdomain is available.' };
    }
    return { available: false, message: 'This subdomain is already taken.' };
  } catch {
    return { available: false, message: 'Could not check availability.' };
  }
}
