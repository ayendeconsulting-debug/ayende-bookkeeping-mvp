'use server';

import { revalidatePath } from 'next/cache';
import { api } from '@/lib/api';

export async function postPayroll(payload: {
  payroll_period: string;
  pay_date: string;
  gross_wages: number;
  wages_account_id: string;
  bank_account_id: string;
  deductions: Array<{
    label: string;
    amount: number;
    account_id: string;
  }>;
  notes?: string;
}) {
  try {
    const result = await api('/payroll', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    revalidatePath('/payroll');
    revalidatePath('/dashboard');
    return { success: true, data: result };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
