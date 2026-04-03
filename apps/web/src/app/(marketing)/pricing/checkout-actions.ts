'use server';

import { auth } from '@clerk/nextjs/server';

const API_URL = process.env.API_URL || 'http://localhost:3005';

export async function createCheckoutSession(
  plan: string,
  billingCycle: string,
): Promise<{ url?: string; error?: string }> {
  try {
    const { getToken } = await auth();
    const token = await getToken();

    if (!token) {
      return { error: 'Please sign in to start your trial.' };
    }

    const res = await fetch(`${API_URL}/billing/create-checkout-session`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ plan, billing_cycle: billingCycle }),
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      return { error: body.message ?? 'Failed to create checkout session' };
    }

    const data = await res.json();
    return { url: data.url };
  } catch (err) {
    return { error: 'Something went wrong. Please try again.' };
  }
}
