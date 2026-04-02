'use server';

import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3005';

export async function saveModeSelection(
  mode: 'business' | 'freelancer' | 'personal',
  country: 'CA' | 'US',
): Promise<{ error?: string }> {
  const { getToken } = await auth();
  const token = await getToken();

  if (!token) {
    return { error: 'Not authenticated' };
  }

  try {
    const res = await fetch(`${API_URL}/businesses/me`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        mode,
        country,
        settings: { mode_selected: true },
      }),
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      return { error: body.message ?? 'Failed to save mode selection' };
    }
  } catch (err) {
    return { error: 'Network error — please try again' };
  }

  redirect('/dashboard');
}
