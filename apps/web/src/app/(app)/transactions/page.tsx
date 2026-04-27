import { Suspense } from 'react';
import { apiGet } from '@/lib/api';
import { Account, TaxCode, RawTransaction, Business, BusinessMode, BudgetCategoryWithSpending, BucketCounts } from '@/types';
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
  try { return await apiGet<{ value: string; label: string }[]>('/classification/raw/source-accounts'); }
  catch { return []; }
}

async function getTransactionMonths() {
  try { return await apiGet<{ value: string; label: string }[]>('/classification/raw/transaction-months'); }
  catch { return []; }
}

// Phase 30: per-bucket counts for tab badges + header. See SRD v30.0 section 6.2.
async function getBucketCounts(
  search?: string,
  sourceAccountName?: string,
  month?: string,
): Promise<BucketCounts> {
  try {
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (sourceAccountName) params.set('sourceAccountName', sourceAccountName);
    if (month) params.set('month', month);
    const qs = params.toString();
    return await apiGet<BucketCounts>(
      `/classification/raw/counts${qs ? `?${qs}` : ''}`,
    );
  } catch {
    return { all: 0, needs_review: 0, business: 0, personal: 0, categorized: 0, posted: 0, ignored: 0 };
  }
}

export default async function TransactionsPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const { search, page, sourceAccountName, month } = params;
  // Phase 30b.1: hoist default so getTransactions() and the UI prop see the
  // same value. Without this, cold-load /transactions sends no status filter
  // (list shows all rows) but the tab strip highlights "Needs Review".
  const status = params.status ?? 'needs_review';

  const [txResult, accounts, taxCodes, business, sourceAccounts, transactionMonths, bucketCounts] = await Promise.all([
    getTransactions(status, search, page, sourceAccountName, month),
    getAccounts(),
    getTaxCodes(),
    getMyBusiness(),
    getSourceAccounts(),
    getTransactionMonths(),
    getBucketCounts(search, sourceAccountName, month),
  ]);

  const mode = (business?.mode ?? 'business') as BusinessMode;

  // Fetch budget categories for personal AND freelancer modes
  const budgetCategories =
    mode === 'personal' || mode === 'freelancer' ? await getBudgetCategories() : [];

  return (
    <Suspense fallback={<div className="p-8 text-center text-sm text-muted-foreground">Loading transactions...</div>}>
      <TransactionInbox
        initialTransactions={txResult.data}
        totalCount={txResult.total}
        accounts={accounts}
        taxCodes={taxCodes}
        currentStatus={status}
        currentSearch={search ?? ''}
        currentPage={parseInt(page ?? '1')}
        mode={mode}
        budgetCategories={budgetCategories}
        sourceAccounts={sourceAccounts}
        transactionMonths={transactionMonths}
        currentSourceAccount={sourceAccountName ?? ''}
        currentMonth={month ?? ''}
        bucketCounts={bucketCounts}
      />
    </Suspense>
  );
}

