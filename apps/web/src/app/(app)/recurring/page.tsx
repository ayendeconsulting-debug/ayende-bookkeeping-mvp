import { apiGet } from '@/lib/api';
import { RecurringTransaction, Account } from '@/types';
import { RecurringManager } from '@/components/recurring-manager';

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

export default async function RecurringPage() {
  const [recurring, accounts] = await Promise.all([getRecurring(), getAccounts()]);
  return <RecurringManager initialRecurring={recurring} accounts={accounts} />;
}
