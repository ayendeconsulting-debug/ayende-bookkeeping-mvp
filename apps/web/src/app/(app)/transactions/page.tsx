import { apiGet } from '@/lib/api';
import { Account, TaxCode, RawTransaction } from '@/types';
import { TransactionInbox } from '@/components/transaction-inbox';

interface PageProps {
  searchParams: Promise<{
    status?: string;
    search?: string;
    page?: string;
  }>;
}

async function getTransactions(status?: string, search?: string, page?: string) {
  try {
    const limit = 20;
    const offset = ((parseInt(page ?? '1') - 1) * limit);
    const params = new URLSearchParams();
    if (status && status !== 'all') params.set('status', status);
    if (search) params.set('search', search);
    params.set('limit', String(limit));
    params.set('offset', String(offset));

    return await apiGet<{ data: RawTransaction[]; total: number }>(
      `/classification/raw?${params.toString()}`,
    );
  } catch {
    return { data: [], total: 0 };
  }
}

async function getAccounts() {
  try {
    return await apiGet<Account[]>('/accounts');
  } catch {
    return [];
  }
}

async function getTaxCodes() {
  try {
    return await apiGet<TaxCode[]>('/tax/codes');
  } catch {
    return [];
  }
}

export default async function TransactionsPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const { status, search, page } = params;

  const [txResult, accounts, taxCodes] = await Promise.all([
    getTransactions(status, search, page),
    getAccounts(),
    getTaxCodes(),
  ]);

  return (
    <TransactionInbox
      initialTransactions={txResult.data}
      totalCount={txResult.total}
      accounts={accounts}
      taxCodes={taxCodes}
      currentStatus={status ?? 'all'}
      currentSearch={search ?? ''}
      currentPage={parseInt(page ?? '1')}
    />
  );
}
