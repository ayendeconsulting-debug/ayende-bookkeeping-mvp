import { UnsubscribeForm } from './unsubscribe-form';

const API_URL = process.env.API_URL || 'http://127.0.0.1:3005';

interface PageProps {
  searchParams: Promise<{ token?: string }> | { token?: string };
}

export default async function UnsubscribePage({ searchParams }: PageProps) {
  // Support both Next.js 14 (sync) and 15 (async Promise) searchParams
  const params = await Promise.resolve(searchParams);
  const token  = params.token ?? '';

  let initialPrefs = null;
  let initialError: string | null = null;

  if (!token) {
    initialError = 'Missing or invalid unsubscribe link. Please use the link from your email.';
  } else {
    try {
      const res = await fetch(
        `${API_URL}/unsubscribe?token=${encodeURIComponent(token)}`,
        { cache: 'no-store' },
      );
      const data = await res.json();
      if (!res.ok || data.message || data.error) {
        initialError = 'This unsubscribe link is invalid. Please use the link from your email.';
      } else {
        initialPrefs = data;
      }
    } catch {
      initialError = 'Something went wrong loading your preferences. Please try again.';
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
