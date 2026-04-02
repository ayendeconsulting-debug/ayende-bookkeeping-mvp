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

export async function createArAp(payload: {
  type: 'receivable' | 'payable';
  party_name: string;
  party_email?: string;
  amount: number;
  due_date: string;
  description?: string;
}) {
  const result = await apiCall('POST', '/ar-ap', payload);
  if (result.success) revalidatePath('/ar-ap');
  return result;
}

export async function updateArAp(id: string, payload: {
  party_name?: string;
  party_email?: string;
  due_date?: string;
  description?: string;
}) {
  const result = await apiCall('PATCH', `/ar-ap/${id}`, payload);
  if (result.success) revalidatePath('/ar-ap');
  return result;
}

export async function payArAp(id: string, payload: {
  amount: number;
  payment_date: string;
  bank_account_id: string;
  contra_account_id: string;
  notes?: string;
}) {
  const result = await apiCall('POST', `/ar-ap/${id}/pay`, payload);
  if (result.success) revalidatePath('/ar-ap');
  return result;
}

export async function voidArAp(id: string) {
  const result = await apiCall('POST', `/ar-ap/${id}/void`);
  if (result.success) revalidatePath('/ar-ap');
  return result;
}
