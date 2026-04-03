'use server';

import { auth } from '@clerk/nextjs/server';
import { revalidatePath } from 'next/cache';

const API_URL = process.env.API_URL || 'http://localhost:3005';

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

export async function createInvoice(payload: {
  client_name: string;
  client_email?: string;
  issue_date: string;
  due_date: string;
  invoice_number?: string;
  notes?: string;
  line_items: Array<{
    description: string;
    quantity: number;
    unit_price: number;
    tax_code_id?: string;
    sort_order?: number;
  }>;
}) {
  const result = await apiCall('POST', '/invoices', payload);
  if (result.success) revalidatePath('/invoices');
  return result;
}

export async function updateInvoice(id: string, payload: Partial<Parameters<typeof createInvoice>[0]>) {
  const result = await apiCall('PATCH', `/invoices/${id}`, payload);
  if (result.success) revalidatePath('/invoices');
  return result;
}

export async function sendInvoice(id: string) {
  const result = await apiCall('POST', `/invoices/${id}/send`);
  if (result.success) revalidatePath('/invoices');
  return result;
}

export async function recordPayment(id: string, payload: {
  amount: number;
  payment_date: string;
  bank_account_id: string;
  revenue_account_id: string;
  notes?: string;
}) {
  const result = await apiCall('POST', `/invoices/${id}/pay`, payload);
  if (result.success) revalidatePath('/invoices');
  return result;
}

export async function voidInvoice(id: string) {
  const result = await apiCall('POST', `/invoices/${id}/void`);
  if (result.success) revalidatePath('/invoices');
  return result;
}
