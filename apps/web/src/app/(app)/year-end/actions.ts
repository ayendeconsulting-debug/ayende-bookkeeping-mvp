'use server';

import { api, apiGet } from '@/lib/api';
import { auth } from '@clerk/nextjs/server';

const API_URL = process.env.API_URL || 'http://localhost:3005';

/* â”€â”€ Generate year-end AI report (async job) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
export async function generateYearEndReport(fiscalYearEnd: string) {
  try {
    const result = await api<{ job_id: string }>('/ai/year-end', {
      method: 'POST',
      body: JSON.stringify({ fiscalYearEnd }),
    });
    return { success: true, data: result };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/* â”€â”€ Poll AI job status â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
export async function checkYearEndJob(jobId: string) {
  try {
    const result = await apiGet<{
      status: 'queued' | 'processing' | 'complete' | 'failed';
      result?: unknown;
    }>(`/ai/jobs/${jobId}`);
    return { success: true, data: result };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/* â”€â”€ Export year-end report to PDF (async job) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
export async function exportYearEndPdf(report: unknown) {
  try {
    const result = await api<{ job_id: string }>('/ai/year-end/export-pdf', {
      method: 'POST',
      body: JSON.stringify(report),
    });
    return { success: true, data: result };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/* â”€â”€ Poll PDF export job status â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
export async function checkYearEndPdfStatus(jobId: string) {
  try {
    const result = await apiGet<{
      job_id: string;
      status: 'queued' | 'processing' | 'complete' | 'failed';
      download_url?: string;
      filename?: string;
    }>(`/ai/year-end/pdf-status/${jobId}`);
    return { success: true, data: result };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/* â”€â”€ Download year-end PDF (authenticated stream â†’ base64) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
export async function downloadYearEndPdfFile(jobId: string): Promise<{
  success: boolean;
  base64?: string;
  filename?: string;
  error?: string;
}> {
  try {
    const { getToken } = await auth();
    const token = await getToken();

    const res = await fetch(`${API_URL}/ai/year-end/download/${jobId}`, {
      headers: { Authorization: `Bearer ${token ?? ''}` },
    });

    if (!res.ok) return { success: false, error: `Download failed: ${res.status}` };

    const arrayBuffer = await res.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString('base64');
    const contentDisposition = res.headers.get('content-disposition') ?? '';
    const filenameMatch = contentDisposition.match(/filename="([^"]+)"/);
    const filename = filenameMatch?.[1] ?? `year-end-report-${jobId}.pdf`;

    return { success: true, base64, filename };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

