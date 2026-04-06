'use server';

import { api } from '@/lib/api';
import { ClientListItem } from '@/app/(accountant)/accountant/clients/actions';

export async function getClientDetails(businessId: string): Promise<ClientListItem | null> {
  try {
    const clients = await api<ClientListItem[]>('/firms/me/clients');
    return clients.find((c) => c.businessId === businessId) ?? null;
  } catch {
    return null;
  }
}
