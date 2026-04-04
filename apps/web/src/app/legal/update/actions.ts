'use server';

import { api } from '@/lib/api';
import { revalidatePath } from 'next/cache';

export async function getLegalStatus() {
  try {
    return await api('/legal/acceptance-status', { method: 'GET' });
  } catch {
    return null;
  }
}

export async function acceptLegal(documents: {
  document_type: string;
  document_version: string;
  acceptance_source: string;
}[]) {
  try {
    await api('/legal/accept', {
      method: 'POST',
      body: JSON.stringify({ documents }),
    });
    revalidatePath('/legal/update');
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
