import { auth } from '@clerk/nextjs/server';
import { cookies } from 'next/headers';

const API_URL = process.env.API_URL || 'http://localhost:3005';

/**
 * Server-side API client for the Tempo Books API.
 *
 * Automatically attaches the Clerk JWT from the current session.
 * Use in Server Components and Server Actions only.
 *
 * When an accountant is viewing a client's books, the Next.js frontend
 * sets a `client-business-id` cookie. This function reads that cookie and
 * forwards it as X-Client-Business-Id so the NestJS ClientContextMiddleware
 * can transparently switch the business context server-side.
 */
export async function api<T = any>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const { getToken, orgId } = await auth();
  const token = await getToken();
  if (path.includes('income-statement')) {
    console.log('[API] orgId:', orgId, 'token prefix:', token?.substring(0, 50));
  }

  // Read client context cookie (set when accountant opens client books)
  const cookieStore = await cookies();
  const clientBusinessId = cookieStore.get('client-business-id')?.value;

  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      // Forward client context header when in accountant mode
      ...(clientBusinessId ? { 'X-Client-Business-Id': clientBusinessId } : {}),
      ...(options.headers ?? {}),
    },
  });

  if (!response.ok) {
    let message = `API error: ${response.status} ${response.statusText}`;
    try {
      const body = await response.json();
      message = body.message ?? message;
    } catch {
      // ignore parse errors
    }
    throw new Error(message);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}

export const apiGet    = <T = any>(path: string)                => api<T>(path, { method: 'GET' });
export const apiPost   = <T = any>(path: string, body: unknown) => api<T>(path, { method: 'POST',  body: JSON.stringify(body) });
export const apiPatch  = <T = any>(path: string, body: unknown) => api<T>(path, { method: 'PATCH', body: JSON.stringify(body) });
export const apiDelete = <T = any>(path: string)                => api<T>(path, { method: 'DELETE' });
