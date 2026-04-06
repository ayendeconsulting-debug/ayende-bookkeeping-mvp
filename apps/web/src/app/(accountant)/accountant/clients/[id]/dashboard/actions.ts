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

export interface AccessRequest {
  id: string;
  firm_id: string;
  business_id: string;
  requested_by_clerk_id: string;
  access_type: string;
  status: 'pending' | 'approved' | 'denied' | 'expired';
  access_note: string | null;
  requested_at: string;
  responded_at: string | null;
  expires_at: string | null;
  custom_expires_at: string | null;
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

export async function getAccessRequests(businessId: string): Promise<AccessRequest[]> {
  try {
    return await api<AccessRequest[]>(`/firms/me/clients/${businessId}/access-requests`);
  } catch {
    return [];
  }
}

export async function createAccessRequest(data: {
  businessId: string;
  accessNote: string;
  durationType: '90_days' | 'year_end' | 'custom';
  customExpiresAt?: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    await api('/firms/me/clients/access-request', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function revokeAccessRequest(
  requestId: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    await api(`/firms/me/clients/access-request/${requestId}`, {
      method: 'DELETE',
    });
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function getClientAuditLog(
  businessId: string,
): Promise<{ data: any[]; total: number }> {
  try {
    return await api(`/firms/me/clients/${businessId}/audit-log?limit=50`);
  } catch {
    return { data: [], total: 0 };
  }
}

