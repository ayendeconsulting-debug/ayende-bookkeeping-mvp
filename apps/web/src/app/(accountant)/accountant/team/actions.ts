'use server';

import { revalidatePath } from 'next/cache';
import { api } from '@/lib/api';

export interface StaffMember {
  id: string;
  clerk_user_id: string;
  role: 'firm_owner' | 'staff';
  invited_email: string | null;
  invited_at: string;
  accepted_at: string | null;
}

export async function getStaff(): Promise<StaffMember[]> {
  try {
    return await api<StaffMember[]>('/firms/me/staff');
  } catch {
    return [];
  }
}

export async function inviteStaff(data: { email: string; firstName?: string }) {
  try {
    await api('/firms/me/staff/invite', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    revalidatePath('/accountant/team');
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function removeStaff(staffRowId: string) {
  try {
    await api(`/firms/me/staff/${staffRowId}`, { method: 'DELETE' });
    revalidatePath('/accountant/team');
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
