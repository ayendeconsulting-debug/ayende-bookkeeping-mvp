'use server';

import { api } from '@/lib/api';

/**
 * Fetch AI narrative for Income Statement or Balance Sheet.
 */
export async function getReportNarrative(
  type: 'income-statement' | 'balance-sheet',
  params: Record<string, string>,
): Promise<{ success: boolean; narrative?: string; error?: string }> {
  try {
    const query = new URLSearchParams(params).toString();
    const data = await api(`/ai/narrative/${type}?${query}`, { method: 'GET' });
    const narrative =
      data?.narrative ?? data?.summary ?? data?.content ?? 'No narrative available.';
    return { success: true, narrative };
  } catch (error: any) {
    return { success: false, error: error.message ?? 'Failed to generate narrative.' };
  }
}

/**
 * Fetch a report export (PDF or CSV) and return as base64.
 * Client uses this to trigger a file download without exposing the JWT.
 */
export async function downloadReport(
  type: string,
  format: 'pdf' | 'csv',
  params: Record<string, string>,
): Promise<{ success: boolean; data?: string; filename?: string; error?: string }> {
  try {
    const query = new URLSearchParams(params).toString();
    const { auth } = await import('@clerk/nextjs/server');
    const { getToken } = await auth();
    const token = await getToken();

    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3005';
    const response = await fetch(
      `${apiUrl}/reports/export/${type}/${format}?${query}`,
      {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    );

    if (!response.ok) {
      throw new Error(`Export failed: ${response.status}`);
    }

    const buffer = await response.arrayBuffer();
    const base64 = Buffer.from(buffer).toString('base64');
    const date = new Date().toISOString().split('T')[0];
    const filename = `${type}-${date}.${format}`;

    return { success: true, data: base64, filename };
  } catch (error: any) {
    return { success: false, error: error.message ?? 'Export failed.' };
  }
}
