'use server';

import { api } from '@/lib/api';

export interface HstPeriod {
  id: string;
  business_id: string;
  period_start: string;
  period_end: string;
  frequency: 'monthly' | 'quarterly' | 'annual';
  status: 'open' | 'filed' | 'locked';
  total_hst_collected: number;
  total_itc_claimed: number;
  net_tax_owing: number;
  filed_at: string | null;
  locked_at: string | null;
  created_at: string;
}

export interface CraTransaction {
  journal_entry_id: string;
  entry_date: string;
  description: string;
  gross_amount: number;
  tax_amount: number;
  net_amount: number;
  tax_code: string;
  tax_code_name: string;
  tax_type: string;
  tax_category: string | null;
  itc_rate: number;
  itc_amount: number;
}

export interface CraReport {
  business_id: string;
  period: HstPeriod;
  generated_at: string;
  line_101_total_sales: number;
  line_103_hst_collected: number;
  line_106_itc_claimed: number;
  line_109_net_tax: number;
  line_111_instalments: number;
  line_113_balance: number;
  total_input_tax: number;
  total_itc_non_recoverable: number;
  unposted_transaction_count: number;
  transactions: CraTransaction[];
  disclaimer: string;
}

export async function getHstPeriods(): Promise<{ data?: HstPeriod[]; error?: string }> {
  try {
    const data = await api<HstPeriod[]>('/tax/hst/periods');
    return { data };
  } catch (error: any) {
    return { error: error.message };
  }
}

export async function getCraReport(
  periodId: string,
  instalmentsPaid: number = 0,
): Promise<{ data?: CraReport; error?: string }> {
  try {
    const data = await api<CraReport>(
      `/tax/hst/report?period_id=${periodId}&instalments_paid=${instalmentsPaid}`,
    );
    return { data };
  } catch (error: any) {
    return { error: error.message };
  }
}

export async function createHstPeriod(dto: {
  period_start: string;
  period_end: string;
  frequency: 'monthly' | 'quarterly' | 'annual';
}): Promise<{ data?: HstPeriod; error?: string }> {
  try {
    const data = await api<HstPeriod>('/tax/hst/periods', {
      method: 'POST',
      body: JSON.stringify(dto),
    });
    return { data };
  } catch (error: any) {
    return { error: error.message };
  }
}

export async function filePeriod(
  periodId: string,
): Promise<{ data?: HstPeriod; error?: string }> {
  try {
    const data = await api<HstPeriod>(`/tax/hst/periods/${periodId}/file`, {
      method: 'PATCH',
    });
    return { data };
  } catch (error: any) {
    return { error: error.message };
  }
}

export async function lockPeriod(
  periodId: string,
): Promise<{ data?: HstPeriod; error?: string }> {
  try {
    const data = await api<HstPeriod>(`/tax/hst/periods/${periodId}/lock`, {
      method: 'PATCH',
    });
    return { data };
  } catch (error: any) {
    return { error: error.message };
  }
}
