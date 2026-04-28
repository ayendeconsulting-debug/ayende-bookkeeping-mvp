'use server';

import { auth } from '@clerk/nextjs/server';
import { cookies } from 'next/headers';
import { apiGet, apiPost } from '@/lib/api';

const API_URL = process.env.API_URL || 'http://localhost:3005';

// ============================================================================
// Response types - mirror controller DTOs from Phase 31b.6
// ============================================================================

export interface PreflightResult {
  receipts_found: number;
  receipts_with_extract: number;
  receipts_needing_extract: number;
  ai_cap_remaining: number;
  ai_cap_exceeded_by: number;
  business_plan: string;
}

export interface SubmitResult {
  job_id: string;
  status: string;
  receipts_total: number;
  extracts_required: number;
  cap_partial: boolean;
}

export type ReceiptExportStatusValue =
  | 'queued'
  | 'running'
  | 'complete'
  | 'failed';

export interface ExportStatusResponse {
  job_id: string;
  status: ReceiptExportStatusValue;
  receipts_total: number;
  extracts_required: number;
  extracts_completed: number;
  extracts_failed: number;
  extracts_cap_exceeded: number;
  start_date: string;
  end_date: string;
  created_at: string;
  completed_at: string | null;
  expires_at: string | null;
  error_message: string | null;
}

export interface DownloadResponse {
  url: string;
  expires_in: number;
}

// ============================================================================
// Tagged result for submit - the only action that needs status-code branching
// ============================================================================

export type SubmitOutcome =
  | { kind: 'ok'; data: SubmitResult }
  | { kind: 'cap_exceeded'; preflight: PreflightResult }
  | { kind: 'already_running'; existing_job_id: string }
  | { kind: 'bad_request'; message: string }
  | { kind: 'error'; message: string };

// ============================================================================
// Generic result for the other three actions
// ============================================================================

export type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };

// ============================================================================
// Preflight - count receipts in range and report AI cap impact.
// No DB writes; safe to call repeatedly on date-range change.
// ============================================================================

export async function preflightExport(
  startDate: string,
  endDate: string,
): Promise<ActionResult<PreflightResult>> {
  try {
    const data = await apiPost<PreflightResult>(
      '/reports/receipt-export/preflight',
      { startDate, endDate },
    );
    return { success: true, data };
  } catch (err: any) {
    return { success: false, error: err?.message ?? 'Preflight failed' };
  }
}

// ============================================================================
// Submit - raw fetch (not the api() wrapper) because we need status-code
// branching:
//   200/201 -> ok            -> modal switches to polling
//   400     -> bad_request   -> modal shows inline error
//   409     -> cap_exceeded  -> modal re-reveals warning + checkbox
//   429     -> already_running -> modal switches to polling on existing job
//   other   -> error         -> modal shows generic error toast
// ============================================================================

export async function submitExport(
  startDate: string,
  endDate: string,
  acknowledge_partial: boolean,
): Promise<SubmitOutcome> {
  const { getToken } = await auth();
  const token = await getToken();
  const cookieStore = await cookies();
  const clientBusinessId = cookieStore.get('client-business-id')?.value;

  let res: Response;
  try {
    res = await fetch(`${API_URL}/reports/receipt-export/submit`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(clientBusinessId
          ? { 'X-Client-Business-Id': clientBusinessId }
          : {}),
      },
      body: JSON.stringify({ startDate, endDate, acknowledge_partial }),
    });
  } catch (err: any) {
    return { kind: 'error', message: err?.message ?? 'Network error' };
  }

  // Best-effort body parse; tolerate non-JSON bodies on edge errors.
  let body: any = {};
  try {
    body = await res.json();
  } catch {
    // ignore parse errors
  }

  if (res.ok) {
    return { kind: 'ok', data: body as SubmitResult };
  }

  if (res.status === 409 && body?.preflight) {
    return {
      kind: 'cap_exceeded',
      preflight: body.preflight as PreflightResult,
    };
  }

  if (res.status === 429 && body?.existing_job_id) {
    return {
      kind: 'already_running',
      existing_job_id: body.existing_job_id as string,
    };
  }

  if (res.status === 400) {
    return {
      kind: 'bad_request',
      message: body?.message ?? 'Invalid request',
    };
  }

  return {
    kind: 'error',
    message: body?.message ?? `Submit failed (${res.status})`,
  };
}

// ============================================================================
// Status - poll the job's progress. Modal calls this every 3s while
// status is 'queued' or 'running'.
// ============================================================================

export async function getExportStatus(
  jobId: string,
): Promise<ActionResult<ExportStatusResponse>> {
  try {
    const data = await apiGet<ExportStatusResponse>(
      `/reports/receipt-export/status/${jobId}`,
    );
    return { success: true, data };
  } catch (err: any) {
    return { success: false, error: err?.message ?? 'Status check failed' };
  }
}

// ============================================================================
// Download URL - issue a 15-minute presigned S3 URL. Modal calls this
// when the user clicks Download, then redirects window.location to the URL.
// Each click issues a fresh URL (no client-side caching).
// ============================================================================

export async function getExportDownloadUrl(
  jobId: string,
): Promise<ActionResult<DownloadResponse>> {
  try {
    const data = await apiGet<DownloadResponse>(
      `/reports/receipt-export/download/${jobId}`,
    );
    return { success: true, data };
  } catch (err: any) {
    return { success: false, error: err?.message ?? 'Download failed' };
  }
}
