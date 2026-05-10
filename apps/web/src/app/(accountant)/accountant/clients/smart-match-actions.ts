'use server';

import { api } from '@/lib/api';

export interface FirmSmartMatchRun {
  id: string;
  firm_id: string;
  initiated_by_user_id: string;
  client_count: number;
  clients_complete: number;
  status: 'running' | 'complete' | 'failed';
  started_at: string;
  completed_at: string | null;
}

export async function runFirmSmartMatch(): Promise<{
  success: boolean;
  data?: { run_id: string; client_count: number; queued: boolean };
  error?: string;
}> {
  try {
    const result = await api<{ run_id: string; client_count: number; queued: boolean }>(
      '/firms/smart-match/run',
      { method: 'POST' },
    );
    return { success: true, data: result };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function getFirmSmartMatchStatus(): Promise<{
  success: boolean;
  data?: FirmSmartMatchRun | null;
  error?: string;
}> {
  try {
    const result = await api<FirmSmartMatchRun | null>('/firms/smart-match/status');
    return { success: true, data: result };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}