'use server';

import { revalidatePath } from 'next/cache';
import { api } from '@/lib/api';

export async function createMileageLog(data: {
  trip_date: string;
  start_location: string;
  end_location: string;
  purpose: string;
  distance_km: number;
}) {
  try {
    const result = await api('/freelancer/mileage', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    revalidatePath('/freelancer/mileage');
    return { success: true, data: result };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function deleteMileageLog(id: string) {
  try {
    await api(`/freelancer/mileage/${id}`, { method: 'DELETE' });
    revalidatePath('/freelancer/mileage');
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
