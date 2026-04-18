'use server';

export interface SavePrefsPayload {
  token: string;
  unsubscribe_tips: boolean;
  unsubscribe_broadcasts: boolean;
  unsubscribe_partnership: boolean;
  unsubscribe_cold: boolean;
  unsubscribed_all: boolean;
}

export async function savePreferences(
  payload: SavePrefsPayload,
): Promise<{ success: boolean; error?: string }> {
  const API_URL = process.env.API_URL || 'http://127.0.0.1:3005';
  try {
    const res = await fetch(`${API_URL}/unsubscribe`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      cache: 'no-store',
    });
    if (!res.ok) {
      return { success: false, error: 'Failed to save preferences.' };
    }
    return { success: true };
  } catch {
    return { success: false, error: 'Failed to save preferences. Please try again.' };
  }
}
