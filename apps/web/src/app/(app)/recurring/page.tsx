import { apiGet } from '@/lib/api';
import { RecurringTransaction, Account } from '@/types';
import { RecurringManager } from '@/components/recurring-manager';

// Phase 12: detection candidate shape returned by GET /recurring/detections
export interface BusinessDetectionCandidate {
  key: string;
  description: string;
  averageAmount: number;
  frequency: 'weekly' | 'monthly' | 'quarterly' | 'annually';
  occurrences: number;
  nextEstimatedDate: string;
}

async function getRecurring(): Promise<RecurringTransaction[]> {
  try {
    return await apiGet<RecurringTransaction[]>('/recurring');
  } catch {
    return [];
  }
}

async function getAccounts(): Promise<Account[]> {
  try {
    return await apiGet<Account[]>('/accounts?activeOnly=true');
  } catch {
    return [];
  }
}

// Phase 12: fetch detected patterns — non-fatal, returns empty array on error
async function getDetections(): Promise<BusinessDetectionCandidate[]> {
  try {
    return await apiGet<BusinessDetectionCandidate[]>('/recurring/detections');
  } catch {
    return [];
  }
}

export default async function RecurringPage() {
  const [recurring, accounts, detections] = await Promise.all([
    getRecurring(),
    getAccounts(),
    getDetections(),
  ]);
  return (
    <RecurringManager
      initialRecurring={recurring}
      accounts={accounts}
      initialDetections={detections}
    />
  );
}
