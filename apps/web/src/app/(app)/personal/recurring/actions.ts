'use server';

import { revalidatePath } from 'next/cache';
import { api } from '@/lib/api';
import { RecurringDetectionCandidate } from '@/types';

export async function confirmDetection(
  candidate: RecurringDetectionCandidate,
): Promise<{ success: boolean; error?: string }> {
  try {
    await api('/personal/recurring-detections/confirm', {
      method: 'POST',
      body: JSON.stringify(candidate),
    });
    revalidatePath('/personal/recurring');
    revalidatePath('/personal/dashboard');
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function dismissDetection(
  key: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    await api('/personal/recurring-detections/dismiss', {
      method: 'POST',
      body: JSON.stringify({ key }),
    });
    revalidatePath('/personal/recurring');
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
