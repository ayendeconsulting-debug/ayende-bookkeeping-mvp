'use server';

import { auth } from '@clerk/nextjs/server';

const API_URL = process.env.API_URL || 'http://localhost:3005';

export async function createFirm(
  name: string,
  subdomain: string,
): Promise<{ success: true; firm: unknown } | { success: false; error: string }> {
  const { getToken, userId } = await auth();
  const token = await getToken();

  // Diagnostic: log what we have server-side
  console.log('[createFirm] server userId from auth():', userId);
  console.log('[createFirm] token present:', !!token);
  console.log('[createFirm] token prefix:', token?.slice(0, 30));

  if (!token) {
    return { success: false, error: 'Not authenticated — no token.' };
  }

  if (!userId) {
    return { success: false, error: 'Not authenticated — no userId in session.' };
  }

  const res = await fetch(`${API_URL}/firms`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ name, subdomain }),
  });

  const data = await res.json().catch(() => ({}));
  console.log('[createFirm] backend status:', res.status, 'response:', JSON.stringify(data));

  if (!res.ok) {
    return { success: false, error: (data as any)?.message ?? `Backend error ${res.status}` };
  }

  return { success: true, firm: data };
}
