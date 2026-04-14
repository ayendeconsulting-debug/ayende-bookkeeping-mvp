'use server';

import { revalidatePath } from 'next/cache';
import { api, apiGet } from '@/lib/api';

export interface FinancedVehicle {
  id: string;
  name: string;
  purchase_price: number;
  down_payment: number;
  loan_amount: number;
  interest_rate: number;
  monthly_payment: number;
  loan_start_date: string;
  remaining_balance: number;
  business_use_pct: number;
  asset_account_id: string;
  loan_account_id: string;
  status: string;
  created_at: string;
  payments?: VehiclePayment[];
}

export interface VehiclePayment {
  id: string;
  vehicle_id: string;
  payment_date: string;
  total_payment: number;
  principal_amount: number;
  interest_amount: number;
  balance_after: number;
  journal_entry_id: string | null;
  created_at: string;
}

export interface AmortizationRow {
  period: number;
  payment: number;
  principal: number;
  interest: number;
  balance: number;
}

export async function getVehicles(): Promise<{ data?: FinancedVehicle[]; error?: string }> {
  try {
    const data = await apiGet<FinancedVehicle[]>('/vehicles');
    return { data };
  } catch (error: any) {
    return { error: error.message };
  }
}

export async function getVehicle(id: string): Promise<{ data?: FinancedVehicle; error?: string }> {
  try {
    const data = await apiGet<FinancedVehicle>(`/vehicles/${id}`);
    return { data };
  } catch (error: any) {
    return { error: error.message };
  }
}

export async function getAmortizationSchedule(id: string): Promise<{ data?: AmortizationRow[]; error?: string }> {
  try {
    const data = await apiGet<AmortizationRow[]>(`/vehicles/${id}/schedule`);
    return { data };
  } catch (error: any) {
    return { error: error.message };
  }
}

export async function createVehicle(payload: {
  name: string;
  purchase_price: number;
  down_payment: number;
  interest_rate: number;
  monthly_payment: number;
  loan_start_date: string;
  business_use_pct: number;
}): Promise<{ data?: FinancedVehicle; error?: string }> {
  try {
    const data = await api<FinancedVehicle>('/vehicles', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    revalidatePath('/personal/vehicles');
    revalidatePath('/freelancer/vehicles');
    return { data };
  } catch (error: any) {
    return { error: error.message };
  }
}

export async function updateVehicle(
  id: string,
  payload: { business_use_pct?: number; status?: string; monthly_payment?: number },
): Promise<{ error?: string }> {
  try {
    await api(`/vehicles/${id}`, { method: 'PATCH', body: JSON.stringify(payload) });
    revalidatePath('/personal/vehicles');
    revalidatePath('/freelancer/vehicles');
    return {};
  } catch (error: any) {
    return { error: error.message };
  }
}

export async function recordPayment(
  vehicleId: string,
  payload: {
    payment_date: string;
    total_payment: number;
    principal_amount: number;
    interest_amount: number;
  },
): Promise<{ data?: VehiclePayment; error?: string }> {
  try {
    const data = await api<VehiclePayment>(`/vehicles/${vehicleId}/payments`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    revalidatePath('/personal/vehicles');
    revalidatePath('/freelancer/vehicles');
    return { data };
  } catch (error: any) {
    return { error: error.message };
  }
}

export async function allocateUsage(
  vehicleId: string,
  payload: { period_start: string; period_end: string },
): Promise<{ data?: any; error?: string }> {
  try {
    const data = await api(`/vehicles/${vehicleId}/allocate`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    revalidatePath('/personal/vehicles');
    revalidatePath('/freelancer/vehicles');
    return { data };
  } catch (error: any) {
    return { error: error.message };
  }
}
