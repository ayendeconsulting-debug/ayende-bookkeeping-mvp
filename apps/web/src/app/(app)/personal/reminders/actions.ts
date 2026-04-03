'use server';

import { revalidatePath } from 'next/cache';
import { api } from '@/lib/api';

export async function snoozeReminder(
  key: string,
  due_date: string,
  snoozed_until: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    await api('/personal/upcoming-reminders/snooze', {
      method: 'POST',
      body: JSON.stringify({ key, due_date, snoozed_until }),
    });
    revalidatePath('/personal/reminders');
    revalidatePath('/personal/dashboard');
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function dismissReminder(
  key: string,
  due_date: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    await api('/personal/upcoming-reminders/dismiss', {
      method: 'POST',
      body: JSON.stringify({ key, due_date }),
    });
    revalidatePath('/personal/reminders');
    revalidatePath('/personal/dashboard');
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
