import { apiGet } from '@/lib/api';
import { Account, TaxCode, RawTransaction, Business, BusinessMode, BudgetCategoryWithSpending } from '@/types';
import { TransactionInbox } from '@/components/transaction-inbox';

interface PageProps {
  searchParams: Promise<{
    status?: string;
    search?: string;
    page?: string;
    sourceAccountName?: string;
    month?: string;
  }>;
}

async function getTransactions(
  status?: string,
  search?: string,
  page?: string,
  sourceAccountName?: string,
  month?: string,
) {
  try {
    const limit = 20;
    const offset = (parseInt(page ?? '1') - 1) * limit;
    const params = new URLSearchParams();
    if (status && status !== 'all') params.set('status', status);
    if (search) params.set('search', search);
    if (sourceAccountName) params.set('sourceAccountName', sourceAccountName);
    if (month) params.set('month', month);
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
  try { return await apiGet<Account[]>('/accounts'); }
  catch { return []; }
}

async function getTaxCodes() {
  try { return await apiGet<TaxCode[]>('/tax/codes'); }
  catch { return []; }
}

async function getMyBusiness() {
  try { return await apiGet<Business>('/businesses/me'); }
  catch { return null; }
}

async function getBudgetCategories() {
  try { return await apiGet<BudgetCategoryWithSpending[]>('/personal/budget-categories'); }
  catch { return []; }
}

async function getSourceAccounts() {
  try { return await apiGet<string[]>('/classification/raw/source-accounts'); }
  catch { return []; }
}

export default async function TransactionsPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const { status, search, page, sourceAccountName, month } = params;

  const [txResult, accounts, taxCodes, business, sourceAccounts] = await Promise.all([
    getTransactions(status, search, page, sourceAccountName, month),
    getAccounts(),
    getTaxCodes(),
    getMyBusiness(),
    getSourceAccounts(),
  ]);

  const mode = (business?.mode ?? 'business') as BusinessMode;
  const budgetCategories = mode === 'personal' ? await getBudgetCategories() : [];

  return (
    <TransactionInbox
      initialTransactions={txResult.data}
      totalCount={txResult.total}
      accounts={accounts}
      taxCodes={taxCodes}
      currentStatus={status ?? 'all'}
      currentSearch={search ?? ''}
      currentPage={parseInt(page ?? '1')}
      mode={mode}
      budgetCategories={budgetCategories}
      sourceAccounts={sourceAccounts}
      currentSourceAccount={sourceAccountName ?? ''}
      currentMonth={month ?? ''}
    />
  );
}
