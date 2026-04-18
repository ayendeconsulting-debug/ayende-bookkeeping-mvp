import { UnsubscribeForm } from './unsubscribe-form';

const API_URL = process.env.API_URL || 'http://127.0.0.1:3005';

interface PageProps {
  searchParams: Promise<{ token?: string }> | { token?: string };
}

export default async function UnsubscribePage({ searchParams }: PageProps) {
  const params = await Promise.resolve(searchParams);
  const token  = params.token ?? '';

  let initialPrefs = null;
  let initialError: string | null = null;

  if (!token) {
    initialError = 'Missing or invalid unsubscribe link. Please use the link from your email.';
  } else {
    try {
      const url = `${API_URL}/unsubscribe?token=${encodeURIComponent(token)}`;
      const res = await fetch(url, { cache: 'no-store' });
      const text = await res.text();
      let data: Record<string, unknown> = {};
      try { data = JSON.parse(text); } catch { /* not JSON */ }

      if (!res.ok) {
        const msg = (data.message as string) ?? text.slice(0, 200);
        initialError = `[${res.status}] ${msg}`;
      } else {
        initialPrefs = data as any;
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'unknown';
      initialError = `Network error: ${msg}`;
    }
  }

  return (
    <UnsubscribeForm
      token={token}
      initialPrefs={initialPrefs}
      initialError={initialError}
    />
  );
}