import { apiGet } from '@/lib/api';
import { Account } from '@/types';
import { AccountsManager } from '@/components/accounts-manager';

async function getAccounts(): Promise<Account[]> {
  try {
    return await apiGet('/accounts');
  } catch {
    return [];
  }
}

export default async function AccountsPage() {
  const accounts = await getAccounts();
  return <AccountsManager initialAccounts={accounts} />;
}
