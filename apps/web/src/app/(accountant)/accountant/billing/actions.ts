'use server';

import { api } from '@/lib/api';

export interface BillingSummary {
  activeClients: number;
  billableClients: number;
  staffCount: number;
  billableSeats: number;
  baseMonthly: number;
  clientsMonthly: number;
  seatsMonthly: number;
  estimatedMonthly: number;
}

export async function getBillingSummary(): Promise<BillingSummary | null> {
  try {
    return await api<BillingSummary>('/firms/me/billing-summary');
  } catch {
    return null;
  }
}

export async function getPortalUrl(): Promise<{ url: string } | null> {
  try {
    return await api<{ url: string }>('/billing/create-portal-session', {
      method: 'POST',
      body: JSON.stringify({ return_url: `${process.env.NEXT_PUBLIC_APP_URL ?? 'https://gettempo.ca'}/accountant/billing` }),
    });
  } catch {
    return null;
  }
}
