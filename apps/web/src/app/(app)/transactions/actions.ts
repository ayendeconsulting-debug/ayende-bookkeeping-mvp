'use server';

import { revalidatePath } from 'next/cache';
import { api } from '@/lib/api';

/* ── Classify a raw transaction ──────────────────────────────────────────── */

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

/* ── Post a classified transaction to the ledger ─────────────────────────── */

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

/* ── Get AI classification suggestion ────────────────────────────────────── */

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
