'use server';

import { api } from '@/lib/api';
import { ClientListItem } from '@/app/(accountant)/accountant/clients/actions';

export interface ClientOverview {
  businessId: string;
  businessName: string;
  revenueMtd: number;
  expensesMtd: number;
  netIncomeMtd: number;
  uncategorisedCount: number;
  outstandingHst: number;
  lastTransactionDate: string | null;
}

export async function getClientDetails(businessId: string): Promise<ClientListItem | null> {
  try {
    const clients = await api<ClientListItem[]>('/firms/me/clients');
    return clients.find((c) => c.businessId === businessId) ?? null;
  } catch {
    return null;
  }
}

export async function getClientOverview(businessId: string): Promise<ClientOverview | null> {
  try {
    return await api<ClientOverview>(`/firms/me/clients/${businessId}/overview`);
  } catch {
    return null;
  }
}
