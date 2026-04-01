import { auth } from '@clerk/nextjs/server';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3005';

/**
 * Server-side API client for Ayende Bookkeeping API.
 *
 * Automatically attaches the Clerk JWT from the current session.
 * Use in Server Components and Server Actions only.
 *
 * For client-side calls, use the useApi hook instead.
 *
 * @example
 * const taxCodes = await api('/tax/codes');
 * const report = await api('/reports/trial-balance?startDate=2024-01-01&endDate=2024-12-31');
 */
export async function api<T = any>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const { getToken } = await auth();
  const token = await getToken();

  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
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

  // Handle 204 No Content
  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}

/**
 * Convenience wrappers
 */
export const apiGet = <T = any>(path: string) =>
  api<T>(path, { method: 'GET' });

export const apiPost = <T = any>(path: string, body: unknown) =>
  api<T>(path, { method: 'POST', body: JSON.stringify(body) });

export const apiPatch = <T = any>(path: string, body: unknown) =>
  api<T>(path, { method: 'PATCH', body: JSON.stringify(body) });

export const apiDelete = <T = any>(path: string) =>
  api<T>(path, { method: 'DELETE' });
