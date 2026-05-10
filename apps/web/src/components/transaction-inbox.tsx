'use client';

import { useState, useCallback, useTransition, useMemo } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { Search, SlidersHorizontal, CheckSquare, Wand2, Sparkles, Split, ArrowLeftRight, AlertTriangle, Tag, X, ArrowDownToLine, Paperclip } from 'lucide-react';
import { Account, TaxCode, RawTransaction, BusinessMode, BudgetCategoryWithSpending, BucketCounts } from '@/types';
import { formatCurrency, cn } from '@/lib/utils';
import { ClassifyPanel } from '@/components/classify-panel';
import { TransactionExplainerPanel } from '@/components/transaction-explainer-panel';
import { SplitTransactionModal } from '@/components/split-transaction-modal';
import { TransferModal } from '@/components/transfer-modal';
import { PersonalCategoryPanel } from '@/components/personal-category-panel';
import { SimilarTransactionsModal } from '@/components/similar-transactions-modal';
import { AdminOnly } from '@/components/admin-only';
import { NewJEButton } from '@/components/manual-je-panel';
import { TransactionDetailPanel, type PanelAction } from '@/components/transaction-detail-panel';
import { TransactionTagToggle } from '@/components/transaction-tag-toggle';
import { SmartMatchChip } from '@/components/smart-match-chip';
import { SmartMatchConfirmBar } from '@/components/smart-match-confirm-bar';
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
import { bulkConfirmSmartMatch } from '@/app/(app)/transactions/smart-match-actions';
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
  bucketCounts?: BucketCounts;
  /** Phase 34h: Smart Match sub-tab counts from GET /smart-match/counts */
  smartMatchCounts?: { suggested: number; cap_exceeded: number; failed: number };
}

// Phase 30: mode-aware bucket model. See SRD v30.0 section 5.
// Bucket keys map to virtual status values accepted by GET /classification/raw.
function getBuckets(mode: BusinessMode): { key: string; label: string }[] {
  if (mode === 'personal') {
    return [
      { key: 'all',          label: 'All' },
      { key: 'needs_review', label: 'Needs Review' },
      { key: 'categorized',  label: 'Categorized' },
    ];
  }
  if (mode === 'freelancer') {
    return [
      { key: 'all',          label: 'All' },
      { key: 'needs_review', label: 'Needs Review' },
      { key: 'business',     label: 'Business' },
      { key: 'personal',     label: 'Personal' },
      { key: 'posted',       label: 'Posted' },
    ];
  }
  // Default: business mode.
  return [
    { key: 'all',          label: 'All' },
    { key: 'needs_review', label: 'Needs Review' },
    { key: 'classified',   label: 'Classified' },
    { key: 'posted',       label: 'Posted' },
  ];
}

// Phase 30: bucket-specific empty-state copy. See SRD v30.0 section 7.5.
function getEmptyStateCopy(bucket: string): string {
  switch (bucket) {
    case 'needs_review':
      return 'Inbox zero. Nothing waiting for a decision right now.';
    case 'business':
      return 'No business transactions waiting to be posted. Classify a row from Needs Review to land it here.';
    case 'personal':
      return 'No personal transactions categorized yet. Tag a row Personal from Needs Review and pick a budget category.';
    case 'classified':
      return 'No transactions waiting to be posted. Classify a row from Needs Review to land it here.';
    case 'categorized':
      return 'No transactions categorized yet. Pick a budget category from Needs Review.';
    case 'posted':
      return 'No posted transactions yet. Post a classified row to land it here.';
    default:
      return 'Connect a bank account to start importing transactions.';
  }
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

// Shared native select class
const selectClass = 'h-8 rounded-md border border-input px-2 text-sm bg-card text-foreground focus:outline-none focus:ring-1 focus:ring-primary';

export function TransactionInbox({
  initialTransactions, totalCount, accounts, taxCodes,
  currentStatus, currentSearch, currentPage, mode = 'business',
  budgetCategories = [],
  sourceAccounts = [],
  transactionMonths = [],
  currentSourceAccount = '',
  currentMonth = '',
  bucketCounts,
  smartMatchCounts,
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

  const [similarResult, setSimilarResult]   = useState<any | null>(null);
  const [similarOpen, setSimilarOpen]       = useState(false);
  const [lastClassifiedTxId, setLastClassifiedTxId] = useState<string | null>(null);

  const [detailRawTransactionId, setDetailRawTransactionId] = useState<string | null>(null);
  // Phase 34h: 'suggested' | 'manual' | null (null defaults to 'suggested' when counts.suggested > 0)
  const [smartSubTab, setSmartSubTab] = useState<'suggested' | 'manual' | null>(null);

  const [selectedIds, setSelectedIds]               = useState<Set<string>>(new Set());
  const [bulkAccountId, setBulkAccountId]           = useState('');
  const [bulkTaxCodeId, setBulkTaxCodeId]           = useState('');
  const [bulkSourceAccountId, setBulkSourceAccountId] = useState('');

  const [personalSelectedIds, setPersonalSelectedIds] = useState<Set<string>>(new Set());
  const [bulkCategoryId, setBulkCategoryId]           = useState('');

  const isFreelancer = mode === 'freelancer';
  const isPersonal   = mode === 'personal';
  // Phase 30: mode-aware buckets + per-bucket counts from /classification/raw/counts.
  const BUCKETS      = getBuckets(mode);
  const counts       = bucketCounts ?? { all: totalCount, needs_review: 0, business: 0, personal: 0, categorized: 0, posted: 0, ignored: 0 };
  const LIMIT = 20;
  const totalPages = Math.ceil(totalCount / LIMIT);

  const categoryMap = Object.fromEntries(budgetCategories.map((c) => [c.id, c]));

  // Phase 34h: filter displayed rows by smart-match sub-tab when inside Needs Review
  const displayedTransactions = useMemo(() => {
    if (currentStatus !== 'needs_review') return initialTransactions;
    const hasSuggested = (smartMatchCounts?.suggested ?? 0) > 0;
    if (!hasSuggested) return initialTransactions;
    const activeTab = smartSubTab ?? 'suggested';
    if (activeTab === 'suggested') {
      return initialTransactions.filter((tx) => tx.smart_match_status === 'suggested');
    }
    return initialTransactions.filter((tx) => tx.smart_match_status !== 'suggested');
  }, [initialTransactions, currentStatus, smartSubTab, smartMatchCounts]);

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

  function handleStatusTab(status: string) { updateParams({ status }); setSmartSubTab(null); }
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
    else { setSelectedTx(tx); setLastClassifiedTxId(tx.id); setPostMode(false); setPanelOpen(true); }
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

  function handleSuccess(data?: { accountId?: string; sourceAccountId?: string }) {
    const justClassifiedId = lastClassifiedTxId;
    const passedAccountId  = data?.accountId ?? null;
    setPanelOpen(false);
    setSelectedTx(null);
    startTransition(() => router.refresh());

    if (justClassifiedId && !postMode && !isPersonal) {
      setLastClassifiedTxId(justClassifiedId);
      findSimilarTransactions(justClassifiedId).then((res) => {
        if (res.success && res.data && res.data.similar.length > 0) {
          setSimilarResult({
            ...res.data,
            suggested_account_id: passedAccountId ?? res.data.suggested_account_id,
          });
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

  function handleDetailAction(action: PanelAction, txId: string) {
    const tx = initialTransactions.find((t) => t.id === txId);
    if (!tx) return;
    setDetailRawTransactionId(null);
    switch (action) {
      case 'classify':   openClassify(tx); break;
      case 'post':       openPost(tx); break;
      case 'unclassify': handleUnclassify(tx); break;
      case 'split':      openSplit(tx); break;
      case 'transfer':   openTransfer(tx); break;
      case 'explain':    setExplainerTx(tx); setExplainerOpen(true); break;
      case 'restore':    startTransition(() => router.refresh()); break;
    }
  }

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

  // Phase 30: pendingCount derivation removed; header now uses counts.needs_review.

  return (
    <div className="flex flex-col h-full">
      {/* Page header */}
      <div className="px-6 py-5 border-b border-border bg-background">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h1 className="text-2xl font-extrabold text-foreground">Transactions</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              {totalCount} total · {counts.needs_review} needs review
              {isFreelancer && (
                <span className="ml-2 text-purple-500 text-xs font-medium">
                  Â· Tag each transaction as Business or Personal
                </span>
              )}
            </p>
          </div>

          <div className="flex items-center gap-2">
            {!isPersonal && (
              <AdminOnly>
                <Button variant="outline" size="sm" onClick={handleRunRules}
                  disabled={isRunRulesPending}
                  className="border-accent-teal/60 text-accent-teal hover:bg-accent-teal-muted">
                  <Wand2 className="w-4 h-4 mr-1.5" />
                  {isRunRulesPending ? 'Runningâ€¦' : 'Run Rules'}
                </Button>
              </AdminOnly>
            )}
            <form onSubmit={handleSearch} className="flex gap-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input className="pl-8 w-56" placeholder="Search transactionsâ€¦"
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
            className={cn(selectClass, 'min-w-[180px] max-w-xs')}
          >
            <option value="">All accounts</option>
            {sourceAccounts.map((a) => (
              <option key={a.value} value={a.value}>{a.label}</option>
            ))}
          </select>

          <select
            value={currentMonth}
            onChange={(e) => handleMonth(e.target.value)}
            className={cn(selectClass, 'min-w-[160px]')}
          >
            <option value="">All months</option>
            {transactionMonths.map((m) => (
              <option key={m.value} value={m.value}>{m.label}</option>
            ))}
          </select>

          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="flex items-center gap-1 h-8 px-2.5 rounded-md text-xs font-medium text-muted-foreground border border-border hover:bg-muted hover:text-destructive hover:border-destructive/50 transition-colors"
            >
              <X className="w-3.5 h-3.5" />
              Clear filters
            </button>
          )}
        </div>

        {/* Phase 30: bucket tabs with count badges */}
        <div className="flex gap-0 -mb-px">
          {BUCKETS.map((tab) => {
            const isActive = currentStatus === tab.key;
            const tabCount = counts[tab.key as keyof typeof counts] ?? 0;
            return (
              <button key={tab.key} onClick={() => handleStatusTab(tab.key)}
                className={cn(
                  'px-4 py-2 text-sm border-b-2 transition-colors inline-flex items-center gap-2',
                  isActive
                    ? 'border-accent-teal text-accent-teal font-medium'
                    : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border',
                )}>
                <span>{tab.label}</span>
                {tabCount > 0 && (
                  <span className={cn(
                    'text-xs font-medium rounded-full px-1.5 py-0.5 min-w-[20px] text-center',
                    isActive
                      ? 'bg-accent-teal-muted text-accent-teal'
                      : 'bg-muted text-muted-foreground',
                  )}>
                    {tabCount}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Phase 34h: Smart Match sub-tabs — only inside Needs Review when suggestions exist */}
      {currentStatus === 'needs_review' && (smartMatchCounts?.suggested ?? 0) > 0 && (
        <div className="px-6 pt-2 pb-0 border-b border-border bg-background flex items-center gap-0">
          {(['suggested', 'manual'] as const).map((tab) => {
            const isActive = (smartSubTab ?? 'suggested') === tab;
            const count = tab === 'suggested' ? (smartMatchCounts?.suggested ?? 0) : undefined;
            return (
              <button
                key={tab}
                onClick={() => setSmartSubTab(tab)}
                className={cn(
                  'px-4 py-2 text-sm border-b-2 -mb-px transition-colors inline-flex items-center gap-2',
                  isActive
                    ? 'border-accent-teal text-accent-teal font-medium'
                    : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border',
                )}
              >
                {tab === 'suggested' ? (
                  <><Sparkles className="w-3.5 h-3.5" />Suggested</>
                ) : 'Manual'}
                {count !== undefined && count > 0 && (
                  <span className={cn(
                    'text-xs font-medium rounded-full px-1.5 py-0.5 min-w-[20px] text-center',
                    isActive
                      ? 'bg-accent-teal-muted text-accent-teal'
                      : 'bg-muted text-muted-foreground',
                  )}>{count}</span>
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* Phase 34i: cap-exceeded notice — shown on Manual sub-tab when AI cap reached */}
      {currentStatus === 'needs_review' &&
        (smartSubTab === 'manual') &&
        (smartMatchCounts?.cap_exceeded ?? 0) > 0 && (
        <div className="mx-6 mt-3 flex items-center gap-2.5 rounded-lg border border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/30 px-3.5 py-2.5">
          <Sparkles className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />
          <p className="text-xs text-amber-700 dark:text-amber-400">
            Smart Match reached its monthly limit for your plan.{' '}
            <span className="font-medium">{smartMatchCounts!.cap_exceeded} transaction{smartMatchCounts!.cap_exceeded !== 1 ? 's' : ''}</span>
            {' '}need manual classification. Upgrade to classify more automatically.
          </p>
        </div>
      )}

      {/* Table */}
      <div className={cn('flex-1 overflow-auto bg-background', isPending && 'opacity-60 pointer-events-none')}>
        {displayedTransactions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-3">
              <Search className="w-5 h-5 text-muted-foreground" />
            </div>
            <p className="text-sm font-medium text-foreground mb-1">No transactions found</p>
            <p className="text-sm text-muted-foreground">
              {currentSearch ? `No results for "${currentSearch}"`
                : currentSourceAccount ? `No transactions for "${currentSourceAccount}"`
                : currentMonth ? 'No transactions for this month'
                : currentStatus === 'needs_review' && (smartMatchCounts?.suggested ?? 0) > 0
                  ? (smartSubTab ?? 'suggested') === 'manual'
                    ? 'Nothing to classify manually. All transactions have Smart Match suggestions.'
                    : 'Smart Match is working on your transactions. Check back shortly.'
                  : getEmptyStateCopy(currentStatus)}
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
                          className="rounded border-border cursor-pointer" title="Select all" />
                      </TableHead>
                    )}
                    {!isPersonal && selectableTxs.length > 0 && (
                      <TableHead className="w-10">
                        <input type="checkbox" checked={allSelected}
                          onChange={handleToggleAll}
                          className="rounded border-border cursor-pointer" title="Select all pending" />
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
                  {displayedTransactions.map((tx) => {
                    const amount = Number(tx.amount);
                    const isSelectable = tx.status === 'pending' && !tx.is_personal && !isPersonal;
                    const isPersonalSelectable = isFreelancer && tx.is_personal && tx.status === 'pending';
                    const isSelected = selectedIds.has(tx.id);
                    const isPersonalSelected = personalSelectedIds.has(tx.id);
                    const isActionable = (tx.status === 'pending' || tx.status === 'classified') && !tx.is_personal && !isPersonal;
                    const assignedCat = tx.personal_category_id ? categoryMap[tx.personal_category_id] : null;

                    return (
                      <TableRow
                        key={tx.id}
                        onClick={() => setDetailRawTransactionId(tx.id)}
                        className={cn(
                        'cursor-pointer hover:bg-muted/40 transition-colors',
                        tx.is_personal && isFreelancer ? 'opacity-60' : '',
                        isSelected || isPersonalSelected ? 'bg-accent-teal-muted/30' : '',
                      )}>
                        {isPersonal && (
                          <TableCell onClick={(e) => e.stopPropagation()}>
                            <input type="checkbox" checked={isPersonalSelected}
                              onChange={() => handlePersonalToggleOne(tx.id)}
                              className="rounded border-border cursor-pointer" />
                          </TableCell>
                        )}
                        {!isPersonal && selectableTxs.length > 0 && (
                          <TableCell onClick={(e) => e.stopPropagation()}>
                            {isSelectable ? (
                              <input type="checkbox" checked={isSelected}
                                onChange={() => handleToggleOne(tx.id)}
                                className="rounded border-border cursor-pointer" />
                            ) : <div className="w-4" />}
                          </TableCell>
                        )}
                        <TableCell className="text-muted-foreground whitespace-nowrap">
                          {new Date(tx.transaction_date).toLocaleDateString('en-CA', {
                            month: 'short', day: 'numeric', year: '2-digit',
                          })}
                        </TableCell>
                        <TableCell className="max-w-xs">
                          <div className="flex items-center gap-1.5">
                            {tx.anomaly_flags && tx.anomaly_flags.length > 0 && (
                              <div className="flex-shrink-0 relative group" title={tx.anomaly_flags.join('\n')}>
                                <AlertTriangle className="w-3.5 h-3.5 text-amber-500 cursor-help" />
                                <div className="absolute left-0 top-5 z-20 hidden group-hover:block w-56 bg-foreground text-background text-xs rounded-lg px-3 py-2 shadow-xl pointer-events-none">
                                  <p className="font-medium mb-1 text-amber-300">Anomaly flags:</p>
                                  {tx.anomaly_flags.map((flag, i) => <p key={i} className="leading-snug">{flag}</p>)}
                                </div>
                              </div>
                            )}
                            {tx.document_count !== undefined && tx.document_count > 0 && (
                              <Paperclip className="w-3.5 h-3.5 text-muted-foreground inline-block mr-1.5 -mt-0.5 flex-shrink-0" />
                            )}
                            <span className="block truncate text-foreground">{tx.description}</span>
                            <SmartMatchChip tx={tx} />
                          </div>
                          {isPersonal && assignedCat ? (
                            <span className="inline-flex items-center gap-1 mt-0.5">
                              <span className="w-2 h-2 rounded-full flex-shrink-0"
                                style={{ backgroundColor: assignedCat.color ?? '#0F6E56' }} />
                              <span className="text-xs font-medium text-muted-foreground">{assignedCat.name}</span>
                            </span>
                          ) : tx.plaid_category ? (
                            <span className="text-xs text-muted-foreground">{tx.plaid_category}</span>
                          ) : null}
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">{sourceAccounts.find((a: {value: string; label: string}) => a.value === tx.source_account_name)?.label ?? tx.source_account_name ?? 'â€”'}</TableCell>
                        <TableCell className="text-right">
                          <span className={cn('font-medium text-sm', amount >= 0 ? 'text-accent-teal' : 'text-accent-coral')}>
                            {amount >= 0 ? '+' : ''}{formatCurrency(amount)}
                          </span>
                        </TableCell>
                        {isFreelancer && (
                          <TableCell onClick={(e) => e.stopPropagation()}>
                            {tx.status === 'pending' ? (
                              <TransactionTagToggle transactionId={tx.id} isPersonal={tx.is_personal} onToggle={handleTagToggle} />
                            ) : (
                              <span className={cn('text-xs font-medium px-2 py-0.5 rounded-full',
                                tx.is_personal ? 'bg-purple-50 text-purple-600 dark:bg-purple-900/20 dark:text-purple-400' : 'bg-accent-teal-muted text-accent-teal')}>
                                {tx.is_personal ? 'Personal' : 'Business'}
                              </span>
                            )}
                          </TableCell>
                        )}
                        <TableCell>
                          {isFreelancer && tx.is_personal
                            ? <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-purple-50 text-purple-600 dark:bg-purple-900/20 dark:text-purple-400">Personal</span>
                            : <Badge variant={statusVariant(tx.status)}>{tx.status.charAt(0).toUpperCase() + tx.status.slice(1)}</Badge>
                          }
                        </TableCell>
                        <TableCell onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {isPersonal && (
                              <AdminOnly>
                                <Button size="sm" variant="outline"
                                  className="h-7 text-xs border-accent-teal/60 text-accent-teal hover:bg-accent-teal-muted"
                                  onClick={() => openClassify(tx)}>
                                  {assignedCat ? 'Recategorize' : 'Categorize'}
                                </Button>
                              </AdminOnly>
                            )}
                            {!isPersonal && tx.status === 'pending' && !tx.is_personal && (
                              <AdminOnly>
                                <Button size="sm" variant="outline"
                                  className="h-7 text-xs border-accent-teal/60 text-accent-teal hover:bg-accent-teal-muted"
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
                                <Button size="sm" variant="outline" className="h-7 text-xs text-muted-foreground hover:text-destructive"
                                  onClick={() => handleUnclassify(tx)}>Unclassify</Button>
                              </AdminOnly>
                            )}
                            {!isPersonal && tx.status === 'posted' && <span className="text-xs text-muted-foreground">Posted</span>}
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
                                  className="p-1 rounded hover:bg-muted transition-colors text-muted-foreground hover:text-accent-teal">
                                  <Split className="w-3.5 h-3.5" />
                                </button>
                                <button onClick={() => openTransfer(tx)} title="Mark as transfer"
                                  className="p-1 rounded hover:bg-muted transition-colors text-muted-foreground hover:text-accent-teal">
                                  <ArrowLeftRight className="w-3.5 h-3.5" />
                                </button>
                              </AdminOnly>
                            )}
                            <button onClick={() => { setExplainerTx(tx); setExplainerOpen(true); }} title="Explain with AI"
                              className="p-1 rounded hover:bg-muted transition-colors text-muted-foreground hover:text-accent-teal">
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
            <div className="sm:hidden divide-y divide-border">
              {displayedTransactions.map((tx) => {
                const amount = Number(tx.amount);
                const isActionable = (tx.status === 'pending' || tx.status === 'classified') && !tx.is_personal && !isPersonal;
                const assignedCat = tx.personal_category_id ? categoryMap[tx.personal_category_id] : null;
                const isPersonalSelected = personalSelectedIds.has(tx.id);

                return (
                  <div
                    key={tx.id}
                    onClick={() => setDetailRawTransactionId(tx.id)}
                    className={cn('px-4 py-3 bg-background cursor-pointer hover:bg-muted/40 transition-colors', isPersonalSelected && 'bg-accent-teal-muted/20')}>
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        {isPersonal && (
                          <input type="checkbox" checked={isPersonalSelected}
                            onClick={(e) => e.stopPropagation()}
                            onChange={() => handlePersonalToggleOne(tx.id)}
                            className="rounded border-border cursor-pointer" />
                        )}
                        <span className="text-xs text-muted-foreground">
                          {new Date(tx.transaction_date).toLocaleDateString('en-CA', { month: 'short', day: 'numeric', year: '2-digit' })}
                        </span>
                      </div>
                      {isFreelancer && tx.is_personal
                        ? <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-purple-50 text-purple-600 dark:bg-purple-900/20 dark:text-purple-400">Personal</span>
                        : <Badge variant={statusVariant(tx.status)}>{tx.status.charAt(0).toUpperCase() + tx.status.slice(1)}</Badge>
                      }
                    </div>
                    <div className="flex items-start gap-1.5 mb-1">
                      {tx.anomaly_flags && tx.anomaly_flags.length > 0 && (
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-500 flex-shrink-0 mt-0.5" />
                      )}
                      {tx.document_count !== undefined && tx.document_count > 0 && (
                        <Paperclip className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0 mt-0.5" />
                      )}
                      <span className="text-sm font-medium text-foreground leading-snug">{tx.description}</span>
                    </div>
                    {isPersonal && assignedCat && (
                      <span className="inline-flex items-center gap-1 mb-1">
                        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: assignedCat.color ?? '#0F6E56' }} />
                        <span className="text-xs font-medium text-muted-foreground">{assignedCat.name}</span>
                      </span>
                    )}
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs text-muted-foreground">{sourceAccounts.find((a: {value: string; label: string}) => a.value === tx.source_account_name)?.label ?? tx.source_account_name ?? 'â€”'}</span>
                      <span className={cn('text-sm font-semibold', amount >= 0 ? 'text-accent-teal' : 'text-accent-coral')}>
                        {amount >= 0 ? '+' : ''}{formatCurrency(amount)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap min-h-[44px]" onClick={(e) => e.stopPropagation()}>
                      {isPersonal && (
                        <AdminOnly>
                          <Button size="sm" variant="outline"
                            className="h-9 text-xs border-accent-teal/60 text-accent-teal hover:bg-accent-teal-muted"
                            onClick={() => openClassify(tx)}>
                            {assignedCat ? 'Recategorize' : 'Categorize'}
                          </Button>
                        </AdminOnly>
                      )}
                      {!isPersonal && tx.status === 'pending' && !tx.is_personal && (
                        <AdminOnly>
                          <Button size="sm" variant="outline"
                            className="h-9 text-xs border-accent-teal/60 text-accent-teal hover:bg-accent-teal-muted"
                            onClick={() => openClassify(tx)}>Classify</Button>
                        </AdminOnly>
                      )}
                      {isFreelancer && !isPersonal && tx.status === 'pending' && !tx.is_personal && (
                        <AdminOnly>
                          <Button size="sm" variant="outline"
                            className="h-9 text-xs border-emerald-500 text-emerald-600 hover:bg-emerald-50 dark:border-emerald-700 dark:text-emerald-400"
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
                            className="p-2.5 min-h-[44px] min-w-[44px] flex items-center justify-center rounded hover:bg-muted text-muted-foreground hover:text-primary">
                            <Split className="w-4 h-4" />
                          </button>
                          <button onClick={() => openTransfer(tx)} title="Transfer"
                            className="p-2.5 min-h-[44px] min-w-[44px] flex items-center justify-center rounded hover:bg-muted text-muted-foreground hover:text-primary">
                            <ArrowLeftRight className="w-4 h-4" />
                          </button>
                        </AdminOnly>
                      )}
                      <button onClick={() => { setExplainerTx(tx); setExplainerOpen(true); }} title="Explain with AI"
                        className="p-2.5 min-h-[44px] min-w-[44px] flex items-center justify-center rounded hover:bg-muted text-muted-foreground hover:text-primary ml-auto">
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
        <div className="flex items-center justify-between px-6 py-3 border-t border-border bg-background">
          <span className="text-sm text-muted-foreground">Page {currentPage} of {totalPages} Â· {totalCount} transactions</span>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" disabled={currentPage <= 1}
              onClick={() => handlePage(currentPage - 1)}>Previous</Button>
            <Button size="sm" variant="outline" disabled={currentPage >= totalPages}
              onClick={() => handlePage(currentPage + 1)}>Next</Button>
          </div>
        </div>
      )}

      {/* Personal bulk bar */}
      {somePersonalSelected && (isPersonal || isFreelancer) && (
        <div className="fixed bottom-0 left-0 sm:left-[220px] right-0 bg-card border-t-2 border-accent-teal/20 px-4 sm:px-6 py-3 flex items-center gap-3 shadow-2xl z-20 flex-wrap">
          <div className="flex items-center gap-2 flex-shrink-0">
            <CheckSquare className="w-4 h-4 text-accent-teal" />
            <span className="text-sm font-semibold text-foreground">{personalSelectedIds.size} selected</span>
          </div>
          <div className="h-5 w-px bg-border flex-shrink-0" />
          <select value={bulkCategoryId} onChange={(e) => setBulkCategoryId(e.target.value)}
            className={cn(selectClass, 'flex-1 max-w-xs h-9')}>
            <option value="">Select categoryâ€¦</option>
            {budgetCategories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <Button onClick={handlePersonalBulkCategorize}
            disabled={isPersonalBulkPending || !bulkCategoryId}
            className="flex-shrink-0">
            <Tag className="w-3.5 h-3.5 mr-1.5" />
            {isPersonalBulkPending ? 'Savingâ€¦' : `Categorize ${personalSelectedIds.size}`}
          </Button>
          <Button variant="outline" onClick={() => setPersonalSelectedIds(new Set())}
            disabled={isPersonalBulkPending} className="flex-shrink-0">Clear</Button>
        </div>
      )}

      {/* Business bulk bar */}
      {someSelected && !isPersonal && (
        <div className="fixed bottom-0 left-0 sm:left-[220px] right-0 bg-card border-t-2 border-accent-teal/20 px-4 sm:px-6 py-3 flex items-center gap-3 shadow-2xl z-20 flex-wrap">
          <div className="flex items-center gap-2 flex-shrink-0">
            <CheckSquare className="w-4 h-4 text-accent-teal" />
            <span className="text-sm font-semibold text-foreground">{selectedIds.size} selected</span>
          </div>
          <div className="h-5 w-px bg-border flex-shrink-0" />
          <select value={bulkAccountId} onChange={(e) => setBulkAccountId(e.target.value)}
            className={cn(selectClass, 'flex-1 max-w-xs h-9')}>
            <option value="">Select accountâ€¦</option>
            {accounts.filter(a => a.account_type === 'expense' || a.account_type === 'asset').map((a) => (
              <option key={a.id} value={a.id}>{a.account_code} â€“ {a.account_name}</option>
            ))}
          </select>
          <select value={bulkTaxCodeId} onChange={(e) => setBulkTaxCodeId(e.target.value)}
            className={cn(selectClass, 'w-44 h-9')}>
            <option value="">No tax code</option>
            {taxCodes.filter((tc) => tc.is_active).map((tc) => (
              <option key={tc.id} value={tc.id}>{tc.code} ({(Number(tc.rate) * 100).toFixed(0)}%)</option>
            ))}
          </select>
          <Button onClick={handleBulkClassify} disabled={isBulkPending || !bulkAccountId} className="flex-shrink-0">
            {isBulkPending ? 'Classifyingâ€¦' : `Classify ${selectedIds.size}`}
          </Button>
          <Button variant="outline" onClick={() => setSelectedIds(new Set())}
            disabled={isBulkPending} className="flex-shrink-0">Clear</Button>
        </div>
      )}

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

      <ClassifyPanel
        transaction={ownerContribTx}
        accounts={accounts}
        taxCodes={taxCodes}
        open={ownerContribOpen}
        onClose={handleOwnerContribClose}
        onSuccess={handleOwnerContribSuccess}
        initialOwnerContribution={true}
      />

      {/* Phase 34h: Smart Match confirm bar — appears when Suggested sub-tab is active */}
      <SmartMatchConfirmBar
        suggestedCount={
          currentStatus === 'needs_review' && (smartSubTab === 'suggested' || !smartSubTab)
            ? (smartMatchCounts?.suggested ?? 0)
            : 0
        }
        onDone={() => setSmartSubTab('manual')}
      />

      <TransactionExplainerPanel transaction={explainerTx} open={explainerOpen} onClose={handleExplainerClose} />
      <TransactionDetailPanel
        rawTransactionId={detailRawTransactionId}
        onClose={() => setDetailRawTransactionId(null)}
        onAction={handleDetailAction}
      />
      <SplitTransactionModal transaction={splitTx} accounts={accounts}
        open={splitOpen} onClose={handleSplitClose} onSuccess={handleSplitSuccess}
          isFreelancerMode={mode==='freelancer'} />
      <TransferModal transaction={transferTx} accounts={accounts}
        open={transferOpen} onClose={handleTransferClose} onSuccess={handleTransferSuccess} />
      <PersonalCategoryPanel transaction={personalCatTx} categories={budgetCategories}
        open={personalCatOpen} onClose={handlePersonalCatClose} onSuccess={handlePersonalCatSuccess} />

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

