import { apiGet } from '@/lib/api';
import { RecurringTransaction, Account, Business } from '@/types';
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

async function getDetections(): Promise<BusinessDetectionCandidate[]> {
  try {
    return await apiGet<BusinessDetectionCandidate[]>('/recurring/detections');
  } catch {
    return [];
  }
}

async function getBusiness(): Promise<Business | null> {
  try {
    return await apiGet<Business>('/businesses/me');
  } catch {
    return null;
  }
}

export default async function RecurringPage() {
  const [recurring, accounts, detections, business] = await Promise.all([
    getRecurring(),
    getAccounts(),
    getDetections(),
    getBusiness(),
  ]);

  const isFreelancerMode = business?.mode === 'freelancer';

  return (
    <RecurringManager
      initialRecurring={recurring}
      accounts={accounts}
      initialDetections={detections}
      isFreelancerMode={isFreelancerMode}
    />
  );
}
