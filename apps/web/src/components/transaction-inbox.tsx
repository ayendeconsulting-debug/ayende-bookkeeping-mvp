'use client';

import { useState, useCallback, useTransition } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { Search, SlidersHorizontal, CheckSquare, Wand2, Sparkles, Split, ArrowLeftRight, AlertTriangle, Tag, X, ArrowDownToLine } from 'lucide-react';
import { Account, TaxCode, RawTransaction, BusinessMode, BudgetCategoryWithSpending } from '@/types';
import { formatCurrency, cn } from '@/lib/utils';
import { ClassifyPanel } from '@/components/classify-panel';
import { TransactionExplainerPanel } from '@/components/transaction-explainer-panel';
import { SplitTransactionModal } from '@/components/split-transaction-modal';
import { TransferModal } from '@/components/transfer-modal';
import { PersonalCategoryPanel } from '@/components/personal-category-panel';
import { SimilarTransactionsModal } from '@/components/similar-transactions-modal';
import { AdminOnly } from '@/components/admin-only';
import { TransactionTagToggle } from '@/components/transaction-tag-toggle';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  bulkClassifyTransactions,
  runBatchRules,
  unclassifyTransaction,
  bulkPostTransactions,
  findSimilarTransactions,
} from '@/app/(app)/transactions/actions';
import { bulkAssignPersonalCategory, findSimilarPersonalTransactions } from '@/app/(app)/personal/transactions/actions';
import { toastSuccess, toastError } from '@/lib/toast';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';

interface TransactionInboxProps {
  initialTransactions: RawTransaction[];
  totalCount: number;
  accounts: Account[];
  taxCodes: TaxCode[];
  currentStatus: string;
  currentSearch: string;
  currentPage: number;
  mode?: BusinessMode;
  budgetCategories?: BudgetCategoryWithSpending[];
  sourceAccounts?: { value: string; label: string }[];
  transactionMonths?: { value: string; label: string }[];
  currentSourceAccount?: string;
  currentMonth?: string;
}

function getStatusTabs(isPersonal: boolean) {
  return [
    { key: 'all',        label: 'All' },
    { key: 'pending',    label: 'Pending' },
    { key: 'classified', label: 'Classified' },
    { key: isPersonal ? 'categorized' : 'posted', label: isPersonal ? 'Categorized' : 'Posted' },
  ];
}

function generateMonthOptions(): { value: string; label: string }[] {
  const options: { value: string; label: string }[] = [];
  const now = new Date();
  for (let i = 0; i < 24; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const label = d.toLocaleDateString('en-CA', { month: 'long', year: 'numeric' });
    options.push({ value, label });
  }
  return options;
}

function statusVariant(status: string): 'pending' | 'classified' | 'posted' | 'review' {
  const map: Record<string, 'pending' | 'classified' | 'posted' | 'review'> = {
    pending: 'pending', classified: 'classified', posted: 'posted',
    ignored: 'review', duplicate: 'review',
  };
  return map[status] ?? 'pending';
}

export function TransactionInbox({
  initialTransactions, totalCount, accounts, taxCodes,
  currentStatus, currentSearch, currentPage, mode = 'business',
  budgetCategories = [],
  sourceAccounts = [],
  transactionMonths = [],
  currentSourceAccount = '',
  currentMonth = '',
}: TransactionInboxProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [isBulkPending, startBulkTransition] = useTransition();
  const [isRunRulesPending, startRunRulesTransition] = useTransition();
  const [isPersonalBulkPending, startPersonalBulkTransition] = useTransition();

  const [searchValue, setSearchValue] = useState(currentSearch);
  const [selectedTx, setSelectedTx] = useState<RawTransaction | null>(null);
  const [panelOpen, setPanelOpen] = useState(false);
  const [postMode, setPostMode] = useState(false);

  const [explainerTx, setExplainerTx]     = useState<RawTransaction | null>(null);
  const [explainerOpen, setExplainerOpen] = useState(false);

  const [splitTx, setSplitTx]     = useState<RawTransaction | null>(null);
  const [splitOpen, setSplitOpen] = useState(false);

  const [transferTx, setTransferTx]     = useState<RawTransaction | null>(null);
  const [transferOpen, setTransferOpen] = useState(false);

  const [personalCatTx, setPersonalCatTx]     = useState<RawTransaction | null>(null);
  const [personalCatOpen, setPersonalCatOpen] = useState(false);

  const [ownerContribTx, setOwnerContribTx]     = useState<RawTransaction | null>(null);
  const [ownerContribOpen, setOwnerContribOpen] = useState(false);

  // Phase 22: Similar transactions modal state
  const [similarResult, setSimilarResult]   = useState<any | null>(null);
  const [similarOpen, setSimilarOpen]       = useState(false);
  const [lastClassifiedTxId, setLastClassifiedTxId] = useState<string | null>(null);

  // Business bulk
  const [selectedIds, setSelectedIds]               = useState<Set<string>>(new Set());
  const [bulkAccountId, setBulkAccountId]           = useState('');
  const [bulkTaxCodeId, setBulkTaxCodeId]           = useState('');
  const [bulkSourceAccountId, setBulkSourceAccountId] = useState('');

  // Personal bulk
  const [personalSelectedIds, setPersonalSelectedIds] = useState<Set<string>>(new Set());
  const [bulkCategoryId, setBulkCategoryId]           = useState('');

  const isFreelancer = mode === 'freelancer';
  const isPersonal   = mode === 'personal';
  const STATUS_TABS  = getStatusTabs(isPersonal);
  const MONTH_OPTIONS = generateMonthOptions();
  const LIMIT = 20;
  const totalPages = Math.ceil(totalCount / LIMIT);

  const categoryMap = Object.fromEntries(budgetCategories.map((c) => [c.id, c]));

  const selectableTxs = initialTransactions.filter(
    (tx) => tx.status === 'pending' && !tx.is_personal && !isPersonal,
  );
  const allSelected = selectableTxs.length > 0 && selectableTxs.every((tx) => selectedIds.has(tx.id));
  const someSelected = selectedIds.size > 0;

  const personalAllSelected = initialTransactions.length > 0 &&
    initialTransactions.every((tx) => personalSelectedIds.has(tx.id));
  const somePersonalSelected = personalSelectedIds.size > 0;

  const updateParams = useCallback(
    (updates: Record<string, string | undefined>) => {
      const params = new URLSearchParams(searchParams.toString());
      Object.entries(updates).forEach(([key, value]) => {
        if (value === undefined || value === '' || value === 'all') params.delete(key);
        else params.set(key, value);
      });
      if (!('page' in updates)) params.delete('page');
      startTransition(() => { router.push(`${pathname}?${params.toString()}`); });
    },
    [searchParams, pathname, router],
  );

  function handleBulkPost() {
    if (!bulkSourceAccountId) { toastError('Please select a source account first.'); return; }
    if (selectedIds.size === 0) { toastError('No transactions selected.'); return; }
    startBulkTransition(async () => {
      const result = await bulkPostTransactions({
        rawTransactionIds: Array.from(selectedIds),
        sourceAccountId: bulkSourceAccountId,
      });
      if (result.success && result.data) {
        const { posted, skipped } = result.data;
        toastSuccess(`${posted} posted${skipped > 0 ? `, ${skipped} skipped` : ''}.`);
        setSelectedIds(new Set()); setBulkSourceAccountId('');
        startTransition(() => router.refresh());
      } else {
        toastError(result.error ?? 'Bulk post failed.');
      }
    });
  }

  function handleStatusTab(status: string) { updateParams({ status }); }
  function handleSearch(e: React.FormEvent) { e.preventDefault(); updateParams({ search: searchValue }); }
  function handlePage(page: number) { updateParams({ page: String(page) }); }
  function handleSourceAccount(val: string) { updateParams({ sourceAccountName: val }); }
  function handleMonth(val: string) { updateParams({ month: val }); }
  function clearFilters() {
    updateParams({ sourceAccountName: undefined, month: undefined, search: undefined, status: undefined });
    setSearchValue('');
  }

  const hasActiveFilters = !!(currentSourceAccount || currentMonth || currentSearch);

  function openClassify(tx: RawTransaction) {
    if (isPersonal || (isFreelancer && tx.is_personal)) { setPersonalCatTx(tx); setPersonalCatOpen(true); }
    else { setSelectedTx(tx); setPostMode(false); setPanelOpen(true); }
  }
  function openPost(tx: RawTransaction) { setSelectedTx(tx); setPostMode(true); setPanelOpen(true); }

  function handleUnclassify(tx: RawTransaction) {
    startTransition(async () => {
      const result = await unclassifyTransaction(tx.id);
      if (result.success) {
        toastSuccess('Unclassified', 'Transaction reset to pending.');
        router.refresh();
      } else {
        toastError('Failed to unclassify', result.error ?? 'Unknown error');
      }
    });
  }

  function handlePanelClose() { setPanelOpen(false); setSelectedTx(null); }

  // Phase 22: after manual classify, check for similar transactions
  function handleSuccess() {
    const justClassifiedId = selectedTx?.id ?? null;
    setPanelOpen(false);
    setSelectedTx(null);
    startTransition(() => router.refresh());

    // Only trigger similar prompt for manual classification (not post mode)
    if (justClassifiedId && !postMode && !isPersonal) {
      setLastClassifiedTxId(justClassifiedId);
      findSimilarTransactions(justClassifiedId).then((res) => {
        if (res.success && res.data && res.data.similar.length > 0) {
          setSimilarResult(res.data);
          setSimilarOpen(true);
        }
      });
    }
  }

  function handleTagToggle() { startTransition(() => router.refresh()); }

  function handleExplainerClose() { setExplainerOpen(false); setExplainerTx(null); }

  function openSplit(tx: RawTransaction) { setSplitTx(tx); setSplitOpen(true); }
  function handleSplitClose() { setSplitOpen(false); setSplitTx(null); }
  function handleSplitSuccess() { setSplitOpen(false); setSplitTx(null); startTransition(() => router.refresh()); }

  function openTransfer(tx: RawTransaction) { setTransferTx(tx); setTransferOpen(true); }
  function handleTransferClose() { setTransferOpen(false); setTransferTx(null); }
  function handleTransferSuccess() { setTransferOpen(false); setTransferTx(null); startTransition(() => router.refresh()); }

  function handlePersonalCatClose() { setPersonalCatOpen(false); setPersonalCatTx(null); }
  function handlePersonalCatSuccess() {
    const justCategorizedId = personalCatTx?.id ?? null;
    setPersonalCatOpen(false);
    setPersonalCatTx(null);
    startTransition(() => router.refresh());
    if (justCategorizedId) {
      findSimilarPersonalTransactions(justCategorizedId).then((res) => {
        if (res.success && res.data && res.data.similar.length > 0) {
          setSimilarResult({ ...res.data, mode: 'personal' });
          setSimilarOpen(true);
        }
      });
    }
  }

  function openOwnerContrib(tx: RawTransaction) { setOwnerContribTx(tx); setOwnerContribOpen(true); }
  function handleOwnerContribClose() { setOwnerContribOpen(false); setOwnerContribTx(null); }
  function handleOwnerContribSuccess() { setOwnerContribOpen(false); setOwnerContribTx(null); startTransition(() => router.refresh()); }

  function handleToggleAll() {
    if (allSelected) setSelectedIds(new Set());
    else setSelectedIds(new Set(selectableTxs.map((tx) => tx.id)));
  }
  function handleToggleOne(id: string) {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id); else next.add(id);
    setSelectedIds(next);
  }
  function handlePersonalToggleAll() {
    if (personalAllSelected) setPersonalSelectedIds(new Set());
    else setPersonalSelectedIds(new Set(initialTransactions.map((tx) => tx.id)));
  }
  function handlePersonalToggleOne(id: string) {
    const next = new Set(personalSelectedIds);
    if (next.has(id)) next.delete(id); else next.add(id);
    setPersonalSelectedIds(next);
  }

  function handleBulkClassify() {
    if (!bulkAccountId) { toastError('Please select an account first.'); return; }
    if (selectedIds.size === 0) { toastError('No transactions selected.'); return; }
    startBulkTransition(async () => {
      const result = await bulkClassifyTransactions({
        rawTransactionIds: Array.from(selectedIds),
        accountId: bulkAccountId,
        taxCodeId: bulkTaxCodeId || undefined,
      });
      if (result.success && result.data) {
        const { classified, skipped } = result.data;
        toastSuccess(`${classified} classified${skipped > 0 ? `, ${skipped} skipped` : ''}.`);
        setSelectedIds(new Set()); setBulkAccountId(''); setBulkTaxCodeId('');
        startTransition(() => router.refresh());
      } else {
        toastError(result.error ?? 'Bulk classification failed.');
      }
    });
  }

  function handlePersonalBulkCategorize() {
    if (!bulkCategoryId) { toastError('Please select a category first.'); return; }
    if (personalSelectedIds.size === 0) { toastError('No transactions selected.'); return; }
    startPersonalBulkTransition(async () => {
      const result = await bulkAssignPersonalCategory(Array.from(personalSelectedIds), bulkCategoryId);
      if (result.success) {
        const cat = categoryMap[bulkCategoryId];
        toastSuccess(`${result.assigned} transaction${result.assigned !== 1 ? 's' : ''} categorized as "${cat?.name ?? ''}"`);
        setPersonalSelectedIds(new Set()); setBulkCategoryId('');
        startTransition(() => router.refresh());
      } else {
        toastError(result.error ?? 'Bulk categorization failed.');
      }
    });
  }

  function handleRunRules() {
    startRunRulesTransition(async () => {
      const result = await runBatchRules();
      if (result.success && result.data) {
        const { classified, skipped, total } = result.data;
        toastSuccess(`${classified} auto-classified, ${skipped} already classified, ${total - classified} no match.`);
        router.refresh();
      } else {
        toastError(result.error ?? 'Failed to run rules.');
      }
    });
  }

  const pendingCount = initialTransactions.filter((t) => t.status === 'pending').length;

  return (
    <div className="flex flex-col h-full">
      {/* Page header */}
      <div className="px-6 py-5 border-b border-gray-200 bg-white dark:bg-[#1a1814] dark:border-[#3a3730]">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h1 className="text-xl font-semibold text-gray-900 dark:text-[#f0ede8]">Transactions</h1>
            <p className="text-sm text-gray-500 dark:text-[#a09888] mt-0.5">
              {totalCount} total &middot; {pendingCount} pending review
              {isFreelancer && (
                <span className="ml-2 text-purple-500 text-xs font-medium">
                  &middot; Tag each transaction as Business or Personal
                </span>
              )}
            </p>
          </div>

          <div className="flex items-center gap-2">
            {!isPersonal && (
              <AdminOnly>
                <Button variant="outline" size="sm" onClick={handleRunRules}
                  disabled={isRunRulesPending}
                  className="border-primary text-primary hover:bg-primary-light">
                  <Wand2 className="w-4 h-4 mr-1.5" />
                  {isRunRulesPending ? 'Running\u2026' : 'Run Rules'}
                </Button>
              </AdminOnly>
            )}
            <form onSubmit={handleSearch} className="flex gap-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
                <Input className="pl-8 w-56" placeholder="Search transactions\u2026"
                  value={searchValue} onChange={(e) => setSearchValue(e.target.value)} />
              </div>
              <Button type="submit" variant="outline" size="sm">
                <SlidersHorizontal className="w-4 h-4 mr-1.5" />Filter
              </Button>
            </form>
          </div>
        </div>

        {/* Account + Month filters */}
        <div className="flex items-center gap-2 mb-3 flex-wrap">
          <select
            value={currentSourceAccount}
            onChange={(e) => handleSourceAccount(e.target.value)}
            className="h-8 rounded-md border border-gray-200 px-2 text-sm bg-white focus:outline-none focus:ring-1 focus:ring-primary min-w-[180px] max-w-xs dark:bg-[#222019] dark:border-[#3a3730] dark:text-[#f0ede8]"
          >
            <option value="">All accounts</option>
            {sourceAccounts.map((a) => (
              <option key={a.value} value={a.value}>{a.label}</option>
            ))}
          </select>

          <select
            value={currentMonth}
            onChange={(e) => handleMonth(e.target.value)}
            className="h-8 rounded-md border border-gray-200 px-2 text-sm bg-white focus:outline-none focus:ring-1 focus:ring-primary min-w-[160px] dark:bg-[#222019] dark:border-[#3a3730] dark:text-[#f0ede8]"
          >
            <option value="">All months</option>
            {transactionMonths.map((m) => (
              <option key={m.value} value={m.value}>{m.label}</option>
            ))}
          </select>

          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="flex items-center gap-1 h-8 px-2.5 rounded-md text-xs font-medium text-gray-500 border border-gray-200 hover:bg-gray-50 hover:text-red-500 hover:border-red-200 transition-colors"
            >
              <X className="w-3.5 h-3.5" />
              Clear filters
            </button>
          )}
        </div>

        {/* Status tabs */}
        <div className="flex gap-0 -mb-px">
          {STATUS_TABS.map((tab) => (
            <button key={tab.key} onClick={() => handleStatusTab(tab.key)}
              className={cn(
                'px-4 py-2 text-sm border-b-2 transition-colors',
                currentStatus === tab.key || (tab.key === 'all' && !currentStatus)
                  ? 'border-primary text-primary font-medium'
                  : 'border-transparent text-gray-500 hover:text-gray-900 hover:border-gray-300',
              )}>
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className={cn('flex-1 overflow-auto bg-white dark:bg-[#1a1814]', isPending && 'opacity-60 pointer-events-none')}>
        {initialTransactions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mb-3">
              <Search className="w-5 h-5 text-gray-400" />
            </div>
            <p className="text-sm font-medium text-gray-900 dark:text-[#f0ede8] mb-1">No transactions found</p>
            <p className="text-sm text-gray-500">
              {currentSearch ? `No results for "${currentSearch}"`
                : currentSourceAccount ? `No transactions for "${currentSourceAccount}"`
                : currentMonth ? 'No transactions for this month'
                : currentStatus !== 'all' ? `No ${currentStatus} transactions`
                : 'Connect a bank account to start importing transactions'}
            </p>
          </div>
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden sm:block">
              <Table>
                <TableHeader>
                  <TableRow>
                    {isPersonal && (
                      <TableHead className="w-10">
                        <input type="checkbox" checked={personalAllSelected}
                          onChange={handlePersonalToggleAll}
                          className="rounded border-gray-300 cursor-pointer" title="Select all" />
                      </TableHead>
                    )}
                    {!isPersonal && selectableTxs.length > 0 && (
                      <TableHead className="w-10">
                        <input type="checkbox" checked={allSelected}
                          onChange={handleToggleAll}
                          className="rounded border-gray-300 cursor-pointer" title="Select all pending" />
                      </TableHead>
                    )}
                    <TableHead className="w-28">Date</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Source Account</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    {isFreelancer && <TableHead className="w-44">Type</TableHead>}
                    <TableHead>Status</TableHead>
                    <TableHead className="w-64">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {initialTransactions.map((tx) => {
                    const amount = Number(tx.amount);
                    const isSelectable = tx.status === 'pending' && !tx.is_personal && !isPersonal;
                    const isSelected = selectedIds.has(tx.id);
                    const isPersonalSelected = personalSelectedIds.has(tx.id);
                    const isActionable = (tx.status === 'pending' || tx.status === 'classified') && !tx.is_personal && !isPersonal;
                    const assignedCat = tx.personal_category_id ? categoryMap[tx.personal_category_id] : null;

                    return (
                      <TableRow key={tx.id} className={cn(
                        tx.is_personal && isFreelancer ? 'opacity-60' : '',
                        isSelected || isPersonalSelected ? 'bg-primary-light/30' : '',
                      )}>
                        {isPersonal && (
                          <TableCell>
                            <input type="checkbox" checked={isPersonalSelected}
                              onChange={() => handlePersonalToggleOne(tx.id)}
                              className="rounded border-gray-300 cursor-pointer" />
                          </TableCell>
                        )}
                        {!isPersonal && selectableTxs.length > 0 && (
                          <TableCell>
                            {isSelectable ? (
                              <input type="checkbox" checked={isSelected}
                                onChange={() => handleToggleOne(tx.id)}
                                className="rounded border-gray-300 cursor-pointer" />
                            ) : <div className="w-4" />}
                          </TableCell>
                        )}
                        <TableCell className="text-gray-500 whitespace-nowrap">
                          {new Date(tx.transaction_date).toLocaleDateString('en-CA', {
                            month: 'short', day: 'numeric', year: '2-digit',
                          })}
                        </TableCell>
                        <TableCell className="max-w-xs">
                          <div className="flex items-center gap-1.5">
                            {tx.anomaly_flags && tx.anomaly_flags.length > 0 && (
                              <div className="flex-shrink-0 relative group" title={tx.anomaly_flags.join('\n')}>
                                <AlertTriangle className="w-3.5 h-3.5 text-amber-500 cursor-help" />
                                <div className="absolute left-0 top-5 z-20 hidden group-hover:block w-56 bg-gray-900 text-white text-xs rounded-lg px-3 py-2 shadow-xl pointer-events-none">
                                  <p className="font-medium mb-1 text-amber-300">Anomaly flags:</p>
                                  {tx.anomaly_flags.map((flag, i) => <p key={i} className="leading-snug">{flag}</p>)}
                                </div>
                              </div>
                            )}
                            <span className="block truncate text-gray-900 dark:text-[#f0ede8]">{tx.description}</span>
                          </div>
                          {isPersonal && assignedCat ? (
                            <span className="inline-flex items-center gap-1 mt-0.5">
                              <span className="w-2 h-2 rounded-full flex-shrink-0"
                                style={{ backgroundColor: assignedCat.color ?? '#0F6E56' }} />
                              <span className="text-xs font-medium text-gray-600 dark:text-[#c8c0b0]">{assignedCat.name}</span>
                            </span>
                          ) : tx.plaid_category ? (
                            <span className="text-xs text-gray-400">{tx.plaid_category}</span>
                          ) : null}
                        </TableCell>
                        <TableCell className="text-gray-500 text-sm">{sourceAccounts.find((a: {value: string; label: string}) => a.value === tx.source_account_name)?.label ?? tx.source_account_name ?? '\u2014'}</TableCell>
                        <TableCell className="text-right">
                          <span className={cn('font-medium text-sm', amount >= 0 ? 'text-primary' : 'text-danger')}>
                            {amount >= 0 ? '+' : ''}{formatCurrency(amount)}
                          </span>
                        </TableCell>
                        {isFreelancer && (
                          <TableCell>
                            {tx.status === 'pending' ? (
                              <TransactionTagToggle transactionId={tx.id} isPersonal={tx.is_personal} onToggle={handleTagToggle} />
                            ) : (
                              <span className={cn('text-xs font-medium px-2 py-0.5 rounded-full',
                                tx.is_personal ? 'bg-purple-50 text-purple-600' : 'bg-primary-light text-primary')}>
                                {tx.is_personal ? 'Personal' : 'Business'}
                              </span>
                            )}
                          </TableCell>
                        )}
                        <TableCell>
                          <Badge variant={statusVariant(tx.status)}>
                            {tx.status.charAt(0).toUpperCase() + tx.status.slice(1)}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {isPersonal && (
                              <AdminOnly>
                                <Button size="sm" variant="outline"
                                  className="h-7 text-xs border-primary text-primary hover:bg-primary-light"
                                  onClick={() => openClassify(tx)}>
                                  {assignedCat ? 'Recategorize' : 'Categorize'}
                                </Button>
                              </AdminOnly>
                            )}
                            {!isPersonal && tx.status === 'pending' && !tx.is_personal && (
                              <AdminOnly>
                                <Button size="sm" variant="outline"
                                  className="h-7 text-xs border-primary text-primary hover:bg-primary-light"
                                  onClick={() => openClassify(tx)}>Classify</Button>
                              </AdminOnly>
                            )}
                            {isFreelancer && !isPersonal && tx.status === 'pending' && !tx.is_personal && (
                              <AdminOnly>
                                <Button size="sm" variant="outline"
                                  className="h-7 text-xs border-emerald-500 text-emerald-600 hover:bg-emerald-50 dark:border-emerald-700 dark:text-emerald-400 dark:hover:bg-emerald-900/20"
                                  onClick={() => openOwnerContrib(tx)}>
                                  <ArrowDownToLine className="w-3 h-3 mr-1" />Contribution
                                </Button>
                              </AdminOnly>
                            )}
                            {!isPersonal && tx.status === 'classified' && (
                              <AdminOnly>
                                <Button size="sm" variant="outline" className="h-7 text-xs"
                                  onClick={() => openPost(tx)}>Post</Button>
                                <Button size="sm" variant="outline" className="h-7 text-xs text-gray-400 hover:text-destructive"
                                  onClick={() => handleUnclassify(tx)}>Unclassify</Button>
                              </AdminOnly>
                            )}
                            {!isPersonal && tx.status === 'posted' && <span className="text-xs text-gray-400">Posted</span>}
                            {tx.status === 'pending' && tx.is_personal && isFreelancer && (
                              <AdminOnly>
                                <Button size="sm" variant="outline"
                                  className="h-7 text-xs border-purple-400 text-purple-600 hover:bg-purple-50 dark:border-purple-700 dark:text-purple-400 dark:hover:bg-purple-900/20"
                                  onClick={() => openClassify(tx)}>
                                  Categorize
                                </Button>
                              </AdminOnly>
                            )}
                            {isActionable && (
                              <AdminOnly>
                                <button onClick={() => openSplit(tx)} title="Split transaction"
                                  className="p-1 rounded hover:bg-gray-100 transition-colors text-gray-400 hover:text-primary">
                                  <Split className="w-3.5 h-3.5" />
                                </button>
                                <button onClick={() => openTransfer(tx)} title="Mark as transfer"
                                  className="p-1 rounded hover:bg-gray-100 transition-colors text-gray-400 hover:text-primary">
                                  <ArrowLeftRight className="w-3.5 h-3.5" />
                                </button>
                              </AdminOnly>
                            )}
                            <button onClick={() => { setExplainerTx(tx); setExplainerOpen(true); }} title="Explain with AI"
                              className="p-1 rounded hover:bg-gray-100 transition-colors text-gray-400 hover:text-primary">
                              <Sparkles className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>

            {/* Mobile card list */}
            <div className="sm:hidden divide-y divide-gray-100">
              {initialTransactions.map((tx) => {
                const amount = Number(tx.amount);
                const isActionable = (tx.status === 'pending' || tx.status === 'classified') && !tx.is_personal && !isPersonal;
                const assignedCat = tx.personal_category_id ? categoryMap[tx.personal_category_id] : null;
                const isPersonalSelected = personalSelectedIds.has(tx.id);

                return (
                  <div key={tx.id} className={cn('px-4 py-3 bg-white dark:bg-[#1a1814]', isPersonalSelected && 'bg-primary-light/20')}>
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        {isPersonal && (
                          <input type="checkbox" checked={isPersonalSelected}
                            onChange={() => handlePersonalToggleOne(tx.id)}
                            className="rounded border-gray-300 cursor-pointer" />
                        )}
                        <span className="text-xs text-gray-400">
                          {new Date(tx.transaction_date).toLocaleDateString('en-CA', { month: 'short', day: 'numeric', year: '2-digit' })}
                        </span>
                      </div>
                      <Badge variant={statusVariant(tx.status)}>
                        {tx.status.charAt(0).toUpperCase() + tx.status.slice(1)}
                      </Badge>
                    </div>
                    <div className="flex items-start gap-1.5 mb-1">
                      {tx.anomaly_flags && tx.anomaly_flags.length > 0 && (
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-500 flex-shrink-0 mt-0.5" />
                      )}
                      <span className="text-sm font-medium text-gray-900 dark:text-[#f0ede8] leading-snug">{tx.description}</span>
                    </div>
                    {isPersonal && assignedCat && (
                      <span className="inline-flex items-center gap-1 mb-1">
                        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: assignedCat.color ?? '#0F6E56' }} />
                        <span className="text-xs font-medium text-gray-600">{assignedCat.name}</span>
                      </span>
                    )}
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs text-gray-400">{sourceAccounts.find((a: {value: string; label: string}) => a.value === tx.source_account_name)?.label ?? tx.source_account_name ?? '\u2014'}</span>
                      <span className={cn('text-sm font-semibold', amount >= 0 ? 'text-primary' : 'text-danger')}>
                        {amount >= 0 ? '+' : ''}{formatCurrency(amount)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap min-h-[44px]">
                      {isPersonal && (
                        <AdminOnly>
                          <Button size="sm" variant="outline"
                            className="h-9 text-xs border-primary text-primary hover:bg-primary-light"
                            onClick={() => openClassify(tx)}>
                            {assignedCat ? 'Recategorize' : 'Categorize'}
                          </Button>
                        </AdminOnly>
                      )}
                      {!isPersonal && tx.status === 'pending' && !tx.is_personal && (
                        <AdminOnly>
                          <Button size="sm" variant="outline"
                            className="h-9 text-xs border-primary text-primary hover:bg-primary-light"
                            onClick={() => openClassify(tx)}>Classify</Button>
                        </AdminOnly>
                      )}
                      {isFreelancer && !isPersonal && tx.status === 'pending' && !tx.is_personal && (
                        <AdminOnly>
                          <Button size="sm" variant="outline"
                            className="h-9 text-xs border-emerald-500 text-emerald-600 hover:bg-emerald-50"
                            onClick={() => openOwnerContrib(tx)}>
                            <ArrowDownToLine className="w-3.5 h-3.5 mr-1" />Contribution
                          </Button>
                        </AdminOnly>
                      )}
                      {!isPersonal && tx.status === 'classified' && (
                        <AdminOnly>
                          <Button size="sm" variant="outline" className="h-9 text-xs"
                            onClick={() => openPost(tx)}>Post</Button>
                        </AdminOnly>
                      )}
                      {isActionable && (
                        <AdminOnly>
                          <button onClick={() => openSplit(tx)} title="Split"
                            className="p-2.5 min-h-[44px] min-w-[44px] flex items-center justify-center rounded hover:bg-gray-100 text-gray-400 hover:text-primary">
                            <Split className="w-4 h-4" />
                          </button>
                          <button onClick={() => openTransfer(tx)} title="Transfer"
                            className="p-2.5 min-h-[44px] min-w-[44px] flex items-center justify-center rounded hover:bg-gray-100 text-gray-400 hover:text-primary">
                            <ArrowLeftRight className="w-4 h-4" />
                          </button>
                        </AdminOnly>
                      )}
                      <button onClick={() => { setExplainerTx(tx); setExplainerOpen(true); }} title="Explain with AI"
                        className="p-2.5 min-h-[44px] min-w-[44px] flex items-center justify-center rounded hover:bg-gray-100 text-gray-400 hover:text-primary ml-auto">
                        <Sparkles className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-6 py-3 border-t border-gray-200 bg-white dark:bg-[#1a1814] dark:border-[#3a3730]">
          <span className="text-sm text-gray-500">Page {currentPage} of {totalPages} &middot; {totalCount} transactions</span>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" disabled={currentPage <= 1}
              onClick={() => handlePage(currentPage - 1)}>Previous</Button>
            <Button size="sm" variant="outline" disabled={currentPage >= totalPages}
              onClick={() => handlePage(currentPage + 1)}>Next</Button>
          </div>
        </div>
      )}

      {/* Personal bulk bar */}
      {somePersonalSelected && isPersonal && (
        <div className="fixed bottom-0 left-0 sm:left-[220px] right-0 bg-white border-t-2 border-primary/20 px-4 sm:px-6 py-3 flex items-center gap-3 shadow-2xl z-20 flex-wrap">
          <div className="flex items-center gap-2 flex-shrink-0">
            <CheckSquare className="w-4 h-4 text-primary" />
            <span className="text-sm font-semibold text-gray-800">{personalSelectedIds.size} selected</span>
          </div>
          <div className="h-5 w-px bg-gray-200 flex-shrink-0" />
          <select value={bulkCategoryId} onChange={(e) => setBulkCategoryId(e.target.value)}
            className="flex-1 max-w-xs h-9 rounded-md border border-gray-200 px-2 text-sm bg-white focus:outline-none focus:ring-1 focus:ring-primary">
            <option value="">Select category\u2026</option>
            {budgetCategories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <Button onClick={handlePersonalBulkCategorize}
            disabled={isPersonalBulkPending || !bulkCategoryId}
            className="bg-primary text-white hover:bg-primary/90 flex-shrink-0">
            <Tag className="w-3.5 h-3.5 mr-1.5" />
            {isPersonalBulkPending ? 'Saving\u2026' : `Categorize ${personalSelectedIds.size}`}
          </Button>
          <Button variant="outline" onClick={() => setPersonalSelectedIds(new Set())}
            disabled={isPersonalBulkPending} className="flex-shrink-0">Clear</Button>
        </div>
      )}

      {/* Business bulk bar */}
      {someSelected && !isPersonal && (
        <div className="fixed bottom-0 left-0 sm:left-[220px] right-0 bg-white border-t-2 border-primary/20 px-4 sm:px-6 py-3 flex items-center gap-3 shadow-2xl z-20 flex-wrap">
          <div className="flex items-center gap-2 flex-shrink-0">
            <CheckSquare className="w-4 h-4 text-primary" />
            <span className="text-sm font-semibold text-gray-800">{selectedIds.size} selected</span>
          </div>
          <div className="h-5 w-px bg-gray-200 flex-shrink-0" />
          <select value={bulkAccountId} onChange={(e) => setBulkAccountId(e.target.value)}
            className="flex-1 max-w-xs h-9 rounded-md border border-gray-200 px-2 text-sm bg-white focus:outline-none focus:ring-1 focus:ring-primary">
            <option value="">Select account\u2026</option>
            {accounts.filter(a => a.account_type === 'expense' || a.account_type === 'asset').map((a) => (
              <option key={a.id} value={a.id}>{a.account_code} \u2013 {a.account_name}</option>
            ))}
          </select>
          <select value={bulkTaxCodeId} onChange={(e) => setBulkTaxCodeId(e.target.value)}
            className="w-44 h-9 rounded-md border border-gray-200 px-2 text-sm bg-white focus:outline-none focus:ring-1 focus:ring-primary">
            <option value="">No tax code</option>
            {taxCodes.filter((tc) => tc.is_active).map((tc) => (
              <option key={tc.id} value={tc.id}>{tc.code} ({(Number(tc.rate) * 100).toFixed(0)}%)</option>
            ))}
          </select>
          <Button onClick={handleBulkClassify} disabled={isBulkPending || !bulkAccountId}
            className="bg-primary text-white hover:bg-primary/90 flex-shrink-0">
            {isBulkPending ? 'Classifying\u2026' : `Classify ${selectedIds.size}`}
          </Button>
          <Button variant="outline" onClick={() => setSelectedIds(new Set())}
            disabled={isBulkPending} className="flex-shrink-0">Clear</Button>
        </div>
      )}

      {/* Main classify panel */}
      <ClassifyPanel
        transaction={selectedTx}
        accounts={accounts}
        taxCodes={taxCodes}
        open={panelOpen}
        onClose={handlePanelClose}
        onSuccess={handleSuccess}
        initialStep={postMode ? 'post' : 'classify'}
        initialClassifiedId={postMode ? (selectedTx?.classified_id ?? '') : ''}
        initialSourceAccountId={postMode ? (selectedTx?.classified_source_account_id ?? '') : ''}
        initialAccountId={postMode ? (selectedTx?.classified_account_id ?? '') : ''}
      />

      {/* Owner Contribution panel */}
      <ClassifyPanel
        transaction={ownerContribTx}
        accounts={accounts}
        taxCodes={taxCodes}
        open={ownerContribOpen}
        onClose={handleOwnerContribClose}
        onSuccess={handleOwnerContribSuccess}
        initialOwnerContribution={true}
      />

      <TransactionExplainerPanel transaction={explainerTx} open={explainerOpen} onClose={handleExplainerClose} />
      <SplitTransactionModal transaction={splitTx} accounts={accounts}
        open={splitOpen} onClose={handleSplitClose} onSuccess={handleSplitSuccess} />
      <TransferModal transaction={transferTx} accounts={accounts}
        open={transferOpen} onClose={handleTransferClose} onSuccess={handleTransferSuccess} />
      <PersonalCategoryPanel transaction={personalCatTx} categories={budgetCategories}
        open={personalCatOpen} onClose={handlePersonalCatClose} onSuccess={handlePersonalCatSuccess} />

      {/* Phase 22: Similar transactions modal */}
      {similarOpen && similarResult && (
        <SimilarTransactionsModal
          similar={similarResult.similar}
          keyword={similarResult.keyword}
          suggested_account_id={similarResult.suggested_account_id}
          suggested_account_name={similarResult.suggested_account_name}
          suggested_account_code={similarResult.suggested_account_code}
          suggested_source_account_id={similarResult.suggested_source_account_id}
          onClose={() => { setSimilarOpen(false); setSimilarResult(null); }}
          onApplied={() => { setSimilarOpen(false); setSimilarResult(null); startTransition(() => router.refresh()); }}
        />
      )}
    </div>
  );
}
