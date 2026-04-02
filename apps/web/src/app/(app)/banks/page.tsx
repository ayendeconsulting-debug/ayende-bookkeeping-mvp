import { apiGet } from '@/lib/api';
import { PlaidItem, PlaidAccount } from '@/types';
import { BankConnections } from '@/components/bank-connections';

async function getBanks(): Promise<PlaidItem[]> {
  try {
    return await apiGet('/plaid/items');
  } catch {
    return [];
  }
}

async function getAccountsForItem(itemId: string): Promise<PlaidAccount[]> {
  try {
    return await apiGet(`/plaid/items/${itemId}/accounts`);
  } catch {
    return [];
  }
}

export default async function BanksPage() {
  const banks = await getBanks();

  // Fetch accounts for all banks in parallel
  const accountResults = await Promise.all(
    banks.map((bank) => getAccountsForItem(bank.id)),
  );

  // Build a map of itemId → accounts[]
  const accountsByItem: Record<string, PlaidAccount[]> = {};
  banks.forEach((bank, i) => {
    accountsByItem[bank.id] = accountResults[i];
  });

  return (
    <BankConnections
      initialBanks={banks}
      accountsByItem={accountsByItem}
    />
  );
}
