'use client';

import { useState, useCallback, useTransition } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { Search, SlidersHorizontal } from 'lucide-react';
import { Account, TaxCode, RawTransaction } from '@/types';
import { formatCurrency, cn } from '@/lib/utils';
import { ClassifyPanel } from '@/components/classify-panel';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

interface TransactionInboxProps {
  initialTransactions: RawTransaction[];
  totalCount: number;
  accounts: Account[];
  taxCodes: TaxCode[];
  currentStatus: string;
  currentSearch: string;
  currentPage: number;
}

const STATUS_TABS = [
  { key: 'all', label: 'All' },
  { key: 'pending', label: 'Pending' },
  { key: 'classified', label: 'Classified' },
  { key: 'posted', label: 'Posted' },
];

function statusVariant(status: string): 'pending' | 'classified' | 'posted' | 'review' {
  const map: Record<string, 'pending' | 'classified' | 'posted' | 'review'> = {
    pending: 'pending',
    classified: 'classified',
    posted: 'posted',
    ignored: 'review',
    duplicate: 'review',
  };
  return map[status] ?? 'pending';
}

export function TransactionInbox({
  initialTransactions,
  totalCount,
  accounts,
  taxCodes,
  currentStatus,
  currentSearch,
  currentPage,
}: TransactionInboxProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const [searchValue, setSearchValue] = useState(currentSearch);
  const [selectedTx, setSelectedTx] = useState<RawTransaction | null>(null);
  const [panelOpen, setPanelOpen] = useState(false);

  const LIMIT = 20;
  const totalPages = Math.ceil(totalCount / LIMIT);

  // Update URL params to trigger server re-fetch
  const updateParams = useCallback(
    (updates: Record<string, string | undefined>) => {
      const params = new URLSearchParams(searchParams.toString());
      Object.entries(updates).forEach(([key, value]) => {
        if (value === undefined || value === '' || value === 'all') {
          params.delete(key);
        } else {
          params.set(key, value);
        }
      });
      // Reset page on filter change
      if (!('page' in updates)) params.delete('page');

      startTransition(() => {
        router.push(`${pathname}?${params.toString()}`);
      });
    },
    [router, pathname, searchParams],
  );

  function handleStatusTab(status: string) {
    updateParams({ status });
  }

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    updateParams({ search: searchValue });
  }

  function handlePage(page: number) {
    updateParams({ page: String(page) });
  }

  function openClassify(tx: RawTransaction) {
    setSelectedTx(tx);
    setPanelOpen(true);
  }

  function handlePanelClose() {
    setPanelOpen(false);
    setSelectedTx(null);
  }

  function handleSuccess() {
    setPanelOpen(false);
    setSelectedTx(null);
    // Refresh — server component will re-fetch
    startTransition(() => router.refresh());
  }

  const pendingCount = initialTransactions.filter((t) => t.status === 'pending').length;

  return (
    <div className="flex flex-col h-full">

      {/* Page header */}
      <div className="px-6 py-5 border-b border-gray-200 bg-white">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-xl font-semibold text-gray-900">Transactions</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              {totalCount} total · {pendingCount} pending review
            </p>
          </div>
          <div className="flex items-center gap-2">
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
                <SlidersHorizontal className="w-4 h-4 mr-1.5" />
                Filter
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
                <TableHead className="w-28">Date</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Source Account</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-36">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {initialTransactions.map((tx) => {
                const amount = Number(tx.amount);
                return (
                  <TableRow key={tx.id}>
                    <TableCell className="text-gray-500 whitespace-nowrap">
                      {new Date(tx.transaction_date).toLocaleDateString('en-CA', {
                        month: 'short',
                        day: 'numeric',
                        year: '2-digit',
                      })}
                    </TableCell>
                    <TableCell className="max-w-xs">
                      <span className="block truncate text-gray-900">
                        {tx.description}
                      </span>
                      {tx.plaid_category && (
                        <span className="text-xs text-gray-400">{tx.plaid_category}</span>
                      )}
                    </TableCell>
                    <TableCell className="text-gray-500 text-sm">
                      {tx.source_account_name ?? '—'}
                    </TableCell>
                    <TableCell className="text-right">
                      <span className={cn(
                        'font-medium text-sm',
                        amount >= 0 ? 'text-primary' : 'text-danger',
                      )}>
                        {amount >= 0 ? '+' : ''}{formatCurrency(amount)}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge variant={statusVariant(tx.status)}>
                        {tx.status.charAt(0).toUpperCase() + tx.status.slice(1)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5">
                        {tx.status === 'pending' && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-xs border-primary text-primary hover:bg-primary-light"
                            onClick={() => openClassify(tx)}
                          >
                            Classify
                          </Button>
                        )}
                        {tx.status === 'classified' && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-xs"
                            onClick={() => openClassify(tx)}
                          >
                            Post
                          </Button>
                        )}
                        {tx.status === 'posted' && (
                          <span className="text-xs text-gray-400">Posted</span>
                        )}
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
            <Button
              size="sm"
              variant="outline"
              disabled={currentPage <= 1}
              onClick={() => handlePage(currentPage - 1)}
            >
              Previous
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={currentPage >= totalPages}
              onClick={() => handlePage(currentPage + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      )}

      {/* Classify panel */}
      <ClassifyPanel
        transaction={selectedTx}
        accounts={accounts}
        taxCodes={taxCodes}
        open={panelOpen}
        onClose={handlePanelClose}
        onSuccess={handleSuccess}
      />
    </div>
  );
}
