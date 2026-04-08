'use server';

import { revalidatePath } from 'next/cache';
import { api } from '@/lib/api';

/* â”€â”€ Bulk classify â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
export async function bulkClassifyTransactions(data: {
  rawTransactionIds: string[];
  accountId: string;
  taxCodeId?: string;
}) {
  try {
    const result = await api<{ classified: number; skipped: number; errors: string[] }>(
      '/classification/bulk-classify',
      {
        method: 'POST',
        body: JSON.stringify(data),
      },
    );
    revalidatePath('/transactions');
    revalidatePath('/dashboard');
    return { success: true, data: result };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/* â”€â”€ Tag a transaction as Personal or Business (Freelancer Mode) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
export async function tagTransaction(transactionId: string, isPersonal: boolean) {
  try {
    await api(`/classification/raw/${transactionId}/tag`, {
      method: 'PATCH',
      body: JSON.stringify({ is_personal: isPersonal }),
    });
    revalidatePath('/transactions');
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/* â”€â”€ Classify a raw transaction â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
export async function classifyTransaction(data: {
  rawTransactionId: string;
  accountId: string;
  sourceAccountId: string;
  taxCodeId?: string;
  classificationMethod: string;
}) {
  try {
    const result = await api('/classification/classify', {
      method: 'POST',
      body: JSON.stringify({
        rawTransactionId: data.rawTransactionId,
        accountId: data.accountId,
        sourceAccountId: data.sourceAccountId,
        taxCodeId: data.taxCodeId || undefined,
        classificationMethod: data.classificationMethod,
      }),
    });
    revalidatePath('/transactions');
    revalidatePath('/dashboard');
    return { success: true, data: result };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/* â”€â”€ Post a classified transaction to the ledger â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
export async function postTransaction(data: {
  classifiedId: string;
  sourceAccountId: string;
}) {
  try {
    const result = await api(`/classification/post/${data.classifiedId}`, {
      method: 'POST',
      body: JSON.stringify({ sourceAccountId: data.sourceAccountId }),
    });
    revalidatePath('/transactions');
    revalidatePath('/dashboard');
    return { success: true, data: result };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/* â”€â”€ Get AI classification suggestion â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
export async function getAiSuggestion(rawTransactionId: string) {
  try {
    const result = await api(`/ai/classify/${rawTransactionId}`, {
      method: 'POST',
      body: JSON.stringify({}),
    });
    return { success: true, data: result };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/* â”€â”€ Phase 12: Run auto-classification rules against all pending txs â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
export async function runBatchRules() {
  try {
    const result = await api<{ total: number; classified: number; skipped: number }>(
      '/classification/rules/run-batch',
      { method: 'POST' },
    );
    revalidatePath('/transactions');
    revalidatePath('/dashboard');
    return { success: true, data: result };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/* â”€â”€ Phase 13: Explain a transaction via AI (async job) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
export async function explainTransaction(rawTransactionId: string) {
  try {
    const result = await api<{ job_id: string }>(
      `/ai/explain/${rawTransactionId}`,
      { method: 'POST' },
    );
    return { success: true, data: result };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/* â”€â”€ Phase 13: Poll an AI job for status + result â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
export async function pollAiJob(jobId: string) {
  try {
    const result = await api<{
      status: 'queued' | 'processing' | 'complete' | 'failed';
      result?: unknown;
    }>(`/ai/jobs/${jobId}`);
    return { success: true, data: result };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/* â”€â”€ Document actions â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
export async function getDocumentUploadUrl(data: {
  rawTransactionId: string;
  fileName: string;
  fileType: string;
  fileSizeBytes: number;
}) {
  try {
    const result = await api<{ upload_url: string; s3_key: string; s3_bucket: string }>(
      '/documents/upload',
      {
        method: 'POST',
        body: JSON.stringify({
          raw_transaction_id: data.rawTransactionId,
          file_name: data.fileName,
          file_type: data.fileType,
          file_size_bytes: data.fileSizeBytes,
        }),
      },
    );
    return { success: true, data: result };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function saveDocumentRecord(data: {
  rawTransactionId: string;
  s3Key: string;
  s3Bucket: string;
  fileName: string;
  fileType: string;
  fileSizeBytes: number;
}) {
  try {
    const result = await api('/documents', {
      method: 'POST',
      body: JSON.stringify({
        raw_transaction_id: data.rawTransactionId,
        s3_key: data.s3Key,
        s3_bucket: data.s3Bucket,
        file_name: data.fileName,
        file_type: data.fileType,
        file_size_bytes: data.fileSizeBytes,
      }),
    });
    return { success: true, data: result };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function getDocumentDownloadUrl(documentId: string) {
  try {
    const result = await api<{ url: string; expires_in: number }>(
      `/documents/${documentId}/url`,
    );
    return { success: true, data: result };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function deleteDocument(documentId: string) {
  try {
    await api(`/documents/${documentId}`, { method: 'DELETE' });
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

