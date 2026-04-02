'use server';

import { auth } from '@clerk/nextjs/server';
import { revalidatePath } from 'next/cache';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3005';

async function getAuthHeaders() {
  const { getToken } = await auth();
  const token = await getToken();
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

async function apiCall(method: string, path: string, body?: unknown) {
  const res = await fetch(`${API_URL}${path}`, {
    method,
    headers: await getAuthHeaders(),
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    return { success: false as const, error: err.message ?? `Request failed (${res.status})` };
  }
  const data = res.status === 204 ? undefined : await res.json();
  return { success: true as const, data };
}

export async function createRecurring(payload: {
  description: string;
  amount: number;
  currency_code?: string;
  debit_account_id: string;
  credit_account_id: string;
  frequency: string;
  start_date: string;
  end_date?: string;
  is_personal?: boolean;
  notes?: string;
}) {
  const result = await apiCall('POST', '/recurring', payload);
  if (result.success) revalidatePath('/recurring');
  return result;
}

export async function updateRecurring(id: string, payload: {
  description?: string;
  amount?: number;
  end_date?: string;
  is_personal?: boolean;
  notes?: string;
}) {
  const result = await apiCall('PATCH', `/recurring/${id}`, payload);
  if (result.success) revalidatePath('/recurring');
  return result;
}

export async function pauseRecurring(id: string) {
  const result = await apiCall('POST', `/recurring/${id}/pause`);
  if (result.success) revalidatePath('/recurring');
  return result;
}

export async function resumeRecurring(id: string) {
  const result = await apiCall('POST', `/recurring/${id}/resume`);
  if (result.success) revalidatePath('/recurring');
  return result;
}

export async function cancelRecurring(id: string) {
  const result = await apiCall('DELETE', `/recurring/${id}`);
  if (result.success) revalidatePath('/recurring');
  return result;
}
