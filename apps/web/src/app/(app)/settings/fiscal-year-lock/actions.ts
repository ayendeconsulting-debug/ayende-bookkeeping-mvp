'use server';

import { revalidatePath } from 'next/cache';
import { api } from '@/lib/api';

export interface FiscalYearSummary {
  year: number;
  entry_count: number;
  is_locked: boolean;
  locked_at: string | null;
  locked_by: string | null;
}

export async function getFiscalYears() {
  try {
    const result = await api<FiscalYearSummary[]>('/fiscal-years');
    return { success: true, data: result };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function lockFiscalYear(year: number) {
  try {
    const result = await api<FiscalYearSummary>(`/fiscal-years/${year}/lock`, {
      method: 'POST',
    });
    revalidatePath('/settings/fiscal-year-lock');
    return { success: true, data: result };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
