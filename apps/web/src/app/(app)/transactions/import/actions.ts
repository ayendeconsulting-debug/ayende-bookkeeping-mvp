'use server';

import { revalidatePath } from 'next/cache';
import { api, apiGet } from '@/lib/api';

export interface ImportBatch {
  id: string;
  file_name: string;
  file_type: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  total_rows: number;
  processed_rows: number;
  duplicate_rows: number;
  error_rows: number;
  error_message: string | null;
  created_at: string;
  completed_at: string | null;
}

// ── Get pre-signed S3 upload URL ───────────────────────────────────────────

export async function getImportUploadUrl(data: {
  file_name: string;
  file_type: string;
  file_size_bytes: number;
}): Promise<{ success: boolean; data?: { upload_url: string; s3_key: string; s3_bucket: string }; error?: string }> {
  try {
    const result = await api<{ upload_url: string; s3_key: string; s3_bucket: string }>(
      '/import/upload-url',
      { method: 'POST', body: JSON.stringify(data) },
    );
    return { success: true, data: result };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// ── Create batch record after S3 upload ───────────────────────────────────

export async function createImportBatch(data: {
  file_name: string;
  file_type: string;
  file_size: number;
  s3_key: string;
  s3_bucket: string;
  source_account_id: string;
}): Promise<{ success: boolean; data?: ImportBatch; error?: string }> {
  try {
    const result = await api<ImportBatch>(
      '/import/batches',
      { method: 'POST', body: JSON.stringify(data) },
    );
    revalidatePath('/transactions/import');
    return { success: true, data: result };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// ── Poll batch status ──────────────────────────────────────────────────────

export async function getImportBatch(id: string): Promise<{ success: boolean; data?: ImportBatch; error?: string }> {
  try {
    const result = await apiGet<ImportBatch>(`/import/batches/${id}`);
    return { success: true, data: result };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// ── List batches (paginated) ───────────────────────────────────────────────

export async function listImportBatches(page = 1): Promise<{
  success: boolean;
  data?: { data: ImportBatch[]; total: number; page: number; limit: number };
  error?: string;
}> {
  try {
    const result = await apiGet<{ data: ImportBatch[]; total: number; page: number; limit: number }>(
      `/import/batches?page=${page}&limit=10`,
    );
    return { success: true, data: result };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
