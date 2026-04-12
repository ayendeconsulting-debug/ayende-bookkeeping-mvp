'use server';

import { auth } from '@clerk/nextjs/server';

const API_URL = process.env.API_URL || 'http://localhost:3005';

export async function createFirm(
  name: string,
  subdomain: string,
): Promise<{ success: true; firm: unknown } | { success: false; error: string }> {
  const { getToken } = await auth();
  const token = await getToken();

  if (!token) {
    return { success: false, error: 'Not authenticated.' };
  }

  const res = await fetch(`${API_URL}/firms`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ name, subdomain }),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    return { success: false, error: body.message ?? 'Failed to create firm.' };
  }

  const firm = await res.json();
  return { success: true, firm };
}
