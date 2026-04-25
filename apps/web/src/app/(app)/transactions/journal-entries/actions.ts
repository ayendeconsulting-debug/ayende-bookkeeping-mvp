'use server';

import { revalidatePath } from 'next/cache';
import { api, apiGet } from '@/lib/api';

export interface JournalLine {
  id?: string;
  line_number: number;
  account_id: string;
  account?: { id: string; name: string; code?: string };
  debit_amount: number;
  credit_amount: number;
  description?: string;
}

export interface JournalEntry {
  id: string;
  entry_number: string;
  entry_date: string;
  description: string;
  reference_number?: string;
  je_type?: string;
  manual_entry?: boolean;
  status: 'draft' | 'posted' | 'locked';
  notes?: string;
  lines: JournalLine[];
  created_at: string;
  posted_at?: string;
}

export interface CreateJEPayload {
  entry_date: string;
  description: string;
  reference_number?: string;
  je_type?: string;
  manual_entry?: boolean;
  notes?: string;
  lines: {
    line_number: number;
    account_id: string;
    debit_amount: number;
    credit_amount: number;
    description?: string;
  }[];
}

// ── Create draft JE ───────────────────────────────────────────────────────────
export async function createJournalEntry(data: CreateJEPayload): Promise<{
  success: boolean; data?: JournalEntry; error?: string;
}> {
  try {
    const result = await api<JournalEntry>('/journal-entries', {
      method: 'POST',
      body: JSON.stringify({ ...data, manual_entry: true }),
    });
    revalidatePath('/transactions/journal-entries');
    return { success: true, data: result };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// ── Post a draft JE ───────────────────────────────────────────────────────────
export async function postJournalEntry(id: string): Promise<{
  success: boolean; error?: string;
}> {
  try {
    await api(`/journal-entries/${id}/post`, { method: 'POST' });
    revalidatePath('/transactions/journal-entries');
    revalidatePath('/reports/income-statement');
    revalidatePath('/reports/balance-sheet');
    revalidatePath('/reports/general-ledger');
    revalidatePath('/reports/trial-balance');
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// ── Update a draft JE ─────────────────────────────────────────────────────────
export async function updateJournalEntry(id: string, data: CreateJEPayload): Promise<{
  success: boolean; data?: JournalEntry; error?: string;
}> {
  try {
    const result = await api<JournalEntry>(`/journal-entries/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ ...data, manual_entry: true }),
    });
    revalidatePath('/transactions/journal-entries');
    return { success: true, data: result };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// ── Delete a draft JE ─────────────────────────────────────────────────────────
export async function deleteJournalEntry(id: string): Promise<{
  success: boolean; error?: string;
}> {
  try {
    await api(`/journal-entries/${id}`, { method: 'DELETE' });
    revalidatePath('/transactions/journal-entries');
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// ── List draft JEs ────────────────────────────────────────────────────────────
export async function listDraftJournalEntries(): Promise<{
  success: boolean; data?: JournalEntry[]; error?: string;
}> {
  try {
    const result = await apiGet<JournalEntry[]>('/journal-entries?status=draft');
    return { success: true, data: result };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
