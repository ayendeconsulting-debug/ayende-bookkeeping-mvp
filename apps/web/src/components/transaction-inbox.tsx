'use client';

import { useState, useCallback, useTransition } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { Search, SlidersHorizontal, CheckSquare, Wand2, Sparkles, Split, ArrowLeftRight } from 'lucide-react';
import { Account, TaxCode, RawTransaction, BusinessMode } from '@/types';
import { formatCurrency, cn } from '@/lib/utils';
import { ClassifyPanel } from '@/components/classify-panel';
import { TransactionExplainerPanel } from '@/components/transaction-explainer-panel';
import { SplitTransactionModal } from '@/components/split-transaction-modal';
import { TransferModal } from '@/components/transfer-modal';
import { AdminOnly } from '@/components/admin-only';
import { TransactionTagToggle } from '@/components/transaction-tag-toggle';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { bulkClassifyTransactions, runBatchRules } from '@/app/(app)/transactions/actions';
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
}

const STATUS_TABS = [
  { key: 'all',        label: 'All' },
  { key: 'pending',    label: 'Pending' },
  { key: 'classified', label: 'Classified' },
  { key: 'posted',     label: 'Posted' },
];

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
}: TransactionInboxProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [isBulkPending, startBulkTransition] = useTransition();
  const [isRunRulesPending, startRunRulesTransition] = useTransition();

  const [searchValue, setSearchValue] = useState(currentSearch);
  const [selectedTx, setSelectedTx] = useState<RawTransaction | null>(null);
  const [panelOpen, setPanelOpen] = useState(false);

  // Phase 13: Explainer panel state
  const [explainerTx, setExplainerTx]     = useState<RawTransaction | null>(null);
  const [explainerOpen, setExplainerOpen] = useState(false);

  // Phase 14: Split modal state
  const [splitTx, setSplitTx]     = useState<RawTransaction | null>(null);
  const [splitOpen, setSplitOpen] = useState(false);

  // Phase 14: Transfer modal state
  const [transferTx, setTransferTx]       = useState<RawTransaction | null>(null);
  const [transferOpen, setTransferOpen]   = useState(false);

  // Bulk classification state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkAccountId, setBulkAccountId] = useState('');
  const [bulkTaxCodeId, setBulkTaxCodeId] = useState('');

  const isFreelancer = mode === 'freelancer';
  const LIMIT = 20;
  const totalPages = Math.ceil(totalCount / LIMIT);

  const selectableTxs = initialTransactions.filter(
    (tx) => tx.status === 'pending' && !tx.is_personal,
  );
  const allSelected =
    selectableTxs.length > 0 && selectableTxs.every((tx) => selectedIds.has(tx.id));
  const someSelected = selectedIds.size > 0;

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
    [router, pathname, searchParams],
  );

  function handleStatusTab(status: string) { updateParams({ status }); }
  function handleSearch(e: React.FormEvent) { e.preventDefault(); updateParams({ search: searchValue }); }
  function handlePage(page: number) { updateParams({ page: String(page) }); }

  function openClassify(tx: RawTransaction) { setSelectedTx(tx); setPanelOpen(true); }
  function handlePanelClose() { setPanelOpen(false); setSelectedTx(null); }
  function handleSuccess() {
    setPanelOpen(false); setSelectedTx(null);
    startTransition(() => router.refresh());
  }
  function handleTagToggle() { startTransition(() => router.refresh()); }

  // Phase 13: Explainer handlers
  function openExplainer(tx: RawTransaction) { setExplainerTx(tx); setExplainerOpen(true); }
  function handleExplainerClose() { setExplainerOpen(false); setExplainerTx(null); }

  // Phase 14: Split handlers
  function openSplit(tx: RawTransaction) { setSplitTx(tx); setSplitOpen(true); }
  function handleSplitClose() { setSplitOpen(false); setSplitTx(null); }
  function handleSplitSuccess() {
    setSplitOpen(false); setSplitTx(null);
    startTransition(() => router.refresh());
  }

  // Phase 14: Transfer handlers
  function openTransfer(tx: RawTransaction) { setTransferTx(tx); setTransferOpen(true); }
  function handleTransferClose() { setTransferOpen(false); setTransferTx(null); }
  function handleTransferSuccess() {
    setTransferOpen(false); setTransferTx(null);
    startTransition(() => router.refresh());
  }

  function handleToggleAll() {
    if (allSelected) setSelectedIds(new Set());
    else setSelectedIds(new Set(selectableTxs.map((tx) => tx.id)));
  }

  function handleToggleOne(id: string) {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id); else next.add(id);
    setSelectedIds(next);
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
        toastSuccess(
          `${classified} transaction${classified !== 1 ? 's' : ''} classified${skipped > 0 ? `, ${skipped} skipped` : ''}.`,
        );
        setSelectedIds(new Set());
        setBulkAccountId('');
        setBulkTaxCodeId('');
        startTransition(() => router.refresh());
      } else {
        toastError(result.error ?? 'Bulk classification failed.');
      }
    });
  }

  function handleRunRules() {
    startRunRulesTransition(async () => {
      const result = await runBatchRules();
      if (result.success && result.data) {
        const { classified, skipped, total } = result.data;
        const noMatch = total - classified;
        toastSuccess(
          `${classified} auto-classified, ${skipped} already classified, ${noMatch} no match.`,
        );
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
      <div className="px-6 py-5 border-b border-gray-200 bg-white">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-xl font-semibold text-gray-900">
              {isFreelancer ? 'Income & Expenses' : 'Transactions'}
            </h1>
            <p className="text-sm text-gray-500 mt-0.5">
              {totalCount} total · {pendingCount} pending review
              {isFreelancer && (
                <span className="ml-2 text-purple-500 text-xs font-medium">
                  · Tag each transaction as Business or Personal
                </span>
              )}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <AdminOnly>
              <Button
                variant="outline"
                size="sm"
                onClick={handleRunRules}
                disabled={isRunRulesPending}
                className="border-primary text-primary hover:bg-primary-light"
              >
                <Wand2 className="w-4 h-4 mr-1.5" />
                {isRunRulesPending ? 'Running…' : 'Run Rules'}
              </Button>
            </AdminOnly>

            <form onSubmit={handleSearch} className="flex gap-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
                <Input
                  className="pl-8 w-64"
                  placeholder="Search transactions…"
                  value={searchValue}
                  onChange={(e) => setSearchValue(e.target.value)}
                />
              </div>
              <Button type="submit" variant="outline" size="sm">
                <SlidersHorizontal className="w-4 h-4 mr-1.5" />Filter
              </Button>
            </form>
          </div>
        </div>

        {/* Status tabs */}
        <div className="flex gap-0 -mb-px">
          {STATUS_TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => handleStatusTab(tab.key)}
              className={cn(
                'px-4 py-2 text-sm border-b-2 transition-colors',
                currentStatus === tab.key || (tab.key === 'all' && !currentStatus)
                  ? 'border-primary text-primary font-medium'
                  : 'border-transparent text-gray-500 hover:text-gray-900 hover:border-gray-300',
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className={cn('flex-1 overflow-auto bg-white', isPending && 'opacity-60 pointer-events-none')}>
        {initialTransactions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mb-3">
              <Search className="w-5 h-5 text-gray-400" />
            </div>
            <p className="text-sm font-medium text-gray-900 mb-1">No transactions found</p>
            <p className="text-sm text-gray-500">
              {currentSearch
                ? `No results for "${currentSearch}"`
                : currentStatus !== 'all'
                ? `No ${currentStatus} transactions`
                : 'Connect a bank account to start importing transactions'}
            </p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                {selectableTxs.length > 0 && (
                  <TableHead className="w-10">
                    <input
                      type="checkbox"
                      checked={allSelected}
                      onChange={handleToggleAll}
                      className="rounded border-gray-300 cursor-pointer"
                      title="Select all pending"
                    />
                  </TableHead>
                )}
                <TableHead className="w-28">Date</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Source Account</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                {isFreelancer && <TableHead className="w-44">Type</TableHead>}
                <TableHead>Status</TableHead>
                <TableHead className="w-52">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {initialTransactions.map((tx) => {
                const amount = Number(tx.amount);
                const isSelectable = tx.status === 'pending' && !tx.is_personal;
                const isSelected = selectedIds.has(tx.id);
                const isActionable = (tx.status === 'pending' || tx.status === 'classified') && !tx.is_personal;

                return (
                  <TableRow
                    key={tx.id}
                    className={cn(
                      tx.is_personal && isFreelancer ? 'opacity-60' : '',
                      isSelected ? 'bg-primary-light/30' : '',
                    )}
                  >
                    {selectableTxs.length > 0 && (
                      <TableCell>
                        {isSelectable ? (
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => handleToggleOne(tx.id)}
                            className="rounded border-gray-300 cursor-pointer"
                          />
                        ) : (
                          <div className="w-4" />
                        )}
                      </TableCell>
                    )}

                    <TableCell className="text-gray-500 whitespace-nowrap">
                      {new Date(tx.transaction_date).toLocaleDateString('en-CA', {
                        month: 'short', day: 'numeric', year: '2-digit',
                      })}
                    </TableCell>
                    <TableCell className="max-w-xs">
                      <span className="block truncate text-gray-900">{tx.description}</span>
                      {tx.plaid_category && (
                        <span className="text-xs text-gray-400">{tx.plaid_category}</span>
                      )}
                    </TableCell>
                    <TableCell className="text-gray-500 text-sm">
                      {tx.source_account_name ?? '–'}
                    </TableCell>
                    <TableCell className="text-right">
                      <span className={cn('font-medium text-sm', amount >= 0 ? 'text-primary' : 'text-danger')}>
                        {amount >= 0 ? '+' : ''}{formatCurrency(amount)}
                      </span>
                    </TableCell>

                    {isFreelancer && (
                      <TableCell>
                        {tx.status === 'pending' ? (
                          <TransactionTagToggle
                            transactionId={tx.id}
                            isPersonal={tx.is_personal}
                            onToggle={handleTagToggle}
                          />
                        ) : (
                          <span className={cn(
                            'text-xs font-medium px-2 py-0.5 rounded-full',
                            tx.is_personal
                              ? 'bg-purple-50 text-purple-600'
                              : 'bg-primary-light text-primary',
                          )}>
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
                      <div className="flex items-center gap-1.5">
                        {tx.status === 'pending' && !tx.is_personal && (
                          <AdminOnly>
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 text-xs border-primary text-primary hover:bg-primary-light"
                              onClick={() => openClassify(tx)}
                            >
                              Classify
                            </Button>
                          </AdminOnly>
                        )}
                        {tx.status === 'classified' && (
                          <AdminOnly>
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 text-xs"
                              onClick={() => openClassify(tx)}
                            >
                              Post
                            </Button>
                          </AdminOnly>
                        )}
                        {tx.status === 'posted' && (
                          <span className="text-xs text-gray-400">Posted</span>
                        )}
                        {tx.status === 'pending' && tx.is_personal && isFreelancer && (
                          <span className="text-xs text-gray-400 italic">Personal</span>
                        )}

                        {/* Phase 14: Split + Transfer buttons — pending and classified rows only */}
                        {isActionable && (
                          <AdminOnly>
                            <button
                              onClick={() => openSplit(tx)}
                              title="Split transaction"
                              className="p-1 rounded hover:bg-gray-100 transition-colors text-gray-400 hover:text-primary"
                            >
                              <Split className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => openTransfer(tx)}
                              title="Mark as transfer"
                              className="p-1 rounded hover:bg-gray-100 transition-colors text-gray-400 hover:text-primary"
                            >
                              <ArrowLeftRight className="w-3.5 h-3.5" />
                            </button>
                          </AdminOnly>
                        )}

                        {/* Phase 13: Explain button — visible on all transactions */}
                        <button
                          onClick={() => openExplainer(tx)}
                          title="Explain with AI"
                          className="p-1 rounded hover:bg-gray-100 transition-colors text-gray-400 hover:text-primary"
                        >
                          <Sparkles className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-6 py-3 border-t border-gray-200 bg-white">
          <span className="text-sm text-gray-500">
            Page {currentPage} of {totalPages} · {totalCount} transactions
          </span>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" disabled={currentPage <= 1}
              onClick={() => handlePage(currentPage - 1)}>Previous</Button>
            <Button size="sm" variant="outline" disabled={currentPage >= totalPages}
              onClick={() => handlePage(currentPage + 1)}>Next</Button>
          </div>
        </div>
      )}

      {/* Bulk classification action bar */}
      {someSelected && (
        <div className="fixed bottom-0 left-[220px] right-0 bg-white border-t-2 border-primary/20 px-6 py-3 flex items-center gap-3 shadow-2xl z-20">
          <div className="flex items-center gap-2 flex-shrink-0">
            <CheckSquare className="w-4 h-4 text-primary" />
            <span className="text-sm font-semibold text-gray-800">{selectedIds.size} selected</span>
          </div>

          <div className="h-5 w-px bg-gray-200 flex-shrink-0" />

          <select
            value={bulkAccountId}
            onChange={(e) => setBulkAccountId(e.target.value)}
            className="flex-1 max-w-xs h-9 rounded-md border border-gray-200 px-2 text-sm bg-white focus:outline-none focus:ring-1 focus:ring-primary"
          >
            <option value="">Select account…</option>
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.account_code} – {a.account_name}
              </option>
            ))}
          </select>

          <select
            value={bulkTaxCodeId}
            onChange={(e) => setBulkTaxCodeId(e.target.value)}
            className="w-44 h-9 rounded-md border border-gray-200 px-2 text-sm bg-white focus:outline-none focus:ring-1 focus:ring-primary"
          >
            <option value="">No tax code</option>
            {taxCodes.filter((tc) => tc.is_active).map((tc) => (
              <option key={tc.id} value={tc.id}>
                {tc.code} ({(Number(tc.rate) * 100).toFixed(0)}%)
              </option>
            ))}
          </select>

          <Button
            onClick={handleBulkClassify}
            disabled={isBulkPending || !bulkAccountId}
            className="bg-primary text-white hover:bg-primary/90 flex-shrink-0"
          >
            {isBulkPending ? 'Classifying…' : `Classify ${selectedIds.size}`}
          </Button>

          <Button
            variant="outline"
            onClick={() => setSelectedIds(new Set())}
            disabled={isBulkPending}
            className="flex-shrink-0"
          >
            Clear
          </Button>
        </div>
      )}

      <ClassifyPanel
        transaction={selectedTx}
        accounts={accounts}
        taxCodes={taxCodes}
        open={panelOpen}
        onClose={handlePanelClose}
        onSuccess={handleSuccess}
      />

      {/* Phase 13: Transaction Explainer Panel */}
      <TransactionExplainerPanel
        transaction={explainerTx}
        open={explainerOpen}
        onClose={handleExplainerClose}
      />

      {/* Phase 14: Split Transaction Modal */}
      <SplitTransactionModal
        transaction={splitTx}
        accounts={accounts}
        open={splitOpen}
        onClose={handleSplitClose}
        onSuccess={handleSplitSuccess}
      />

      {/* Phase 14: Transfer Modal */}
      <TransferModal
        transaction={transferTx}
        accounts={accounts}
        open={transferOpen}
        onClose={handleTransferClose}
        onSuccess={handleTransferSuccess}
      />
    </div>
  );
}
