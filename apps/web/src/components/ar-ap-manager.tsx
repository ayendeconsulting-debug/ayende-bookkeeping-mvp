'use client';

import { useState, useTransition } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import {
  DollarSign, TrendingUp, TrendingDown,
  XCircle, Pencil, MoreHorizontal, AlertCircle,
} from 'lucide-react';
import { Account, ArApRecord } from '@/types';
import { voidArAp } from '@/app/(app)/ar-ap/actions';
import { toastSuccess, toastError } from '@/lib/toast';
import { AdminOnly } from '@/components/admin-only';
import { ArApForm } from '@/components/ar-ap-form';
import { ArApPayDialog } from '@/components/ar-ap-pay-dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { cn, formatCurrency } from '@/lib/utils';

const TYPE_TABS = [
  { key: 'all', label: 'All' },
  { key: 'receivable', label: 'Receivable (AR)' },
  { key: 'payable', label: 'Payable (AP)' },
];

const STATUS_TABS = [
  { key: 'all', label: 'All' },
  { key: 'outstanding', label: 'Outstanding' },
  { key: 'overdue', label: 'Overdue' },
  { key: 'partially_paid', label: 'Partial' },
  { key: 'paid', label: 'Paid' },
];

const STATUS_VARIANTS: Record<string, 'pending' | 'classified' | 'posted' | 'review'> = {
  outstanding: 'pending', overdue: 'review', partially_paid: 'review', paid: 'posted', void: 'review',
};

interface ArApManagerProps {
  initialRecords: ArApRecord[];
  totalCount: number;
  accounts: Account[];
  currentType: string;
  currentStatus: string;
  currentPage: number;
}

export function ArApManager({
  initialRecords, totalCount, accounts, currentType, currentStatus, currentPage,
}: ArApManagerProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [formOpen, setFormOpen] = useState(false);
  const [defaultFormType, setDefaultFormType] = useState<'receivable' | 'payable'>('receivable');
  const [editingRecord, setEditingRecord] = useState<ArApRecord | null>(null);
  const [payingRecord, setPayingRecord] = useState<ArApRecord | null>(null);
  const [payDialogOpen, setPayDialogOpen] = useState(false);

  const LIMIT = 20;
  const totalPages = Math.ceil(totalCount / LIMIT);

  function updateParams(updates: Record<string, string | undefined>) {
    const params = new URLSearchParams(searchParams.toString());
    Object.entries(updates).forEach(([k, v]) => {
      if (!v || v === 'all') params.delete(k); else params.set(k, v);
    });
    if (!('page' in updates)) params.delete('page');
    startTransition(() => router.push(`${pathname}?${params.toString()}`));
  }

  function openCreate(type: 'receivable' | 'payable') {
    setEditingRecord(null); setDefaultFormType(type); setFormOpen(true);
  }
  function openEdit(record: ArApRecord) { setEditingRecord(record); setFormOpen(true); }
  function openPay(record: ArApRecord) { setPayingRecord(record); setPayDialogOpen(true); }

  async function handleVoid(record: ArApRecord) {
    const result = await voidArAp(record.id);
    if (result.success) { toastSuccess('Record voided', record.party_name); router.refresh(); }
    else toastError('Failed to void record', result.error ?? 'Please try again.');
  }

  const outstanding = initialRecords
    .filter((r) => ['outstanding', 'overdue', 'partially_paid'].includes(r.status))
    .reduce((acc, r) => {
      const bal = Number(r.amount) - Number(r.amount_paid);
      if (r.type === 'receivable') acc.ar += bal; else acc.ap += bal;
      return acc;
    }, { ar: 0, ap: 0 });

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-6 py-5 border-b border-gray-200 bg-white dark:border-[#3a3730] dark:bg-[#222019]">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-xl font-semibold text-gray-900 dark:text-[#f0ede8]">Accounts Payable / Receivable</h1>
            <p className="text-sm text-gray-500 dark:text-[#a09888] mt-0.5">{totalCount} records</p>
          </div>
          <div className="flex items-center gap-2">
            <AdminOnly>
              <Button variant="outline" onClick={() => openCreate('receivable')} className="flex items-center gap-1.5">
                <TrendingUp className="w-4 h-4 text-green-600" />New Receivable
              </Button>
            </AdminOnly>
            <AdminOnly>
              <Button onClick={() => openCreate('payable')} className="flex items-center gap-1.5">
                <TrendingDown className="w-4 h-4" />New Payable
              </Button>
            </AdminOnly>
          </div>
        </div>

        {(outstanding.ar > 0 || outstanding.ap > 0) && (
          <div className="grid grid-cols-2 gap-3 mb-4 max-w-sm">
            <div className="rounded-lg bg-green-50 border border-green-100 px-3 py-2 dark:bg-green-900/20 dark:border-green-900/40">
              <div className="text-xs text-green-600 dark:text-green-400 font-medium">Outstanding AR</div>
              <div className="text-sm font-semibold text-green-700 dark:text-green-400">{formatCurrency(outstanding.ar)}</div>
            </div>
            <div className="rounded-lg bg-orange-50 border border-orange-100 px-3 py-2 dark:bg-orange-900/20 dark:border-orange-900/40">
              <div className="text-xs text-orange-600 dark:text-orange-400 font-medium">Outstanding AP</div>
              <div className="text-sm font-semibold text-orange-700 dark:text-orange-400">{formatCurrency(outstanding.ap)}</div>
            </div>
          </div>
        )}

        <div className="flex gap-0 -mb-px">
          {TYPE_TABS.map((tab) => (
            <button key={tab.key} onClick={() => updateParams({ type: tab.key })}
              className={cn('px-4 py-2 text-sm border-b-2 transition-colors',
                currentType === tab.key || (tab.key === 'all' && !currentType)
                  ? 'border-primary text-primary font-medium'
                  : 'border-transparent text-gray-500 hover:text-gray-900 hover:border-gray-300 dark:text-[#a09888] dark:hover:text-[#f0ede8] dark:hover:border-[#3a3730]',
              )}>
              {tab.label}
            </button>
          ))}
          <div className="flex-1" />
          <div className="flex gap-0">
            {STATUS_TABS.map((tab) => (
              <button key={tab.key} onClick={() => updateParams({ status: tab.key })}
                className={cn('px-3 py-2 text-xs border-b-2 transition-colors',
                  currentStatus === tab.key || (tab.key === 'all' && !currentStatus)
                    ? 'border-primary text-primary font-medium'
                    : 'border-transparent text-gray-400 hover:text-gray-700 dark:text-[#7a7060] dark:hover:text-[#c8c0b0]',
                )}>
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Table */}
      <div className={cn('flex-1 overflow-auto bg-white dark:bg-[#222019]', isPending && 'opacity-60 pointer-events-none')}>
        {initialRecords.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-12 h-12 rounded-full bg-gray-100 dark:bg-[#2a2720] flex items-center justify-center mb-3">
              <DollarSign className="w-5 h-5 text-gray-400 dark:text-[#7a7060]" />
            </div>
            <p className="text-sm font-medium text-gray-900 dark:text-[#f0ede8] mb-1">No records found</p>
            <p className="text-sm text-gray-500 dark:text-[#a09888]">Create a receivable or payable to track what's owed.</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Type</TableHead>
                <TableHead>Party</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Due Date</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead className="text-right">Balance</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-16" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {initialRecords.map((record) => {
                const balance = Number(record.amount) - Number(record.amount_paid);
                const isOverdue = record.status === 'overdue';
                return (
                  <TableRow key={record.id} className={isOverdue ? 'bg-red-50/40 dark:bg-red-900/10' : ''}>
                    <TableCell>
                      <span className={cn('text-xs font-medium px-2 py-0.5 rounded-full',
                        record.type === 'receivable'
                          ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                          : 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
                      )}>
                        {record.type === 'receivable' ? 'AR' : 'AP'}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm font-medium text-gray-900 dark:text-[#f0ede8]">{record.party_name}</div>
                      {record.party_email && <div className="text-xs text-gray-400 dark:text-[#7a7060]">{record.party_email}</div>}
                    </TableCell>
                    <TableCell className="text-sm text-gray-500 dark:text-[#a09888] max-w-[200px] truncate">
                      {record.description ?? '–'}
                    </TableCell>
                    <TableCell className={cn('text-sm whitespace-nowrap', isOverdue && 'text-red-600 dark:text-red-400 font-medium')}>
                      {isOverdue && <AlertCircle className="w-3.5 h-3.5 inline mr-1" />}
                      {new Date(record.due_date).toLocaleDateString('en-CA', { month: 'short', day: 'numeric', year: '2-digit' })}
                    </TableCell>
                    <TableCell className="text-right text-sm font-medium">{formatCurrency(Number(record.amount))}</TableCell>
                    <TableCell className={cn('text-right text-sm font-medium',
                      balance > 0 ? (isOverdue ? 'text-red-600 dark:text-red-400' : 'text-orange-600') : 'text-gray-400 dark:text-[#7a7060]',
                    )}>
                      {balance > 0 ? formatCurrency(balance) : '–'}
                    </TableCell>
                    <TableCell>
                      <Badge variant={STATUS_VARIANTS[record.status] ?? 'pending'}>
                        {record.status.replace('_', ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="text-gray-400 hover:text-gray-600 dark:text-[#7a7060] dark:hover:text-[#c8c0b0]">
                            <MoreHorizontal className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {['outstanding', 'overdue', 'partially_paid'].includes(record.status) && (
                            <>
                              <AdminOnly><DropdownMenuItem onClick={() => openEdit(record)}><Pencil className="w-3.5 h-3.5 mr-2" />Edit</DropdownMenuItem></AdminOnly>
                              <AdminOnly><DropdownMenuItem onClick={() => openPay(record)}><DollarSign className="w-3.5 h-3.5 mr-2" />Record Payment</DropdownMenuItem></AdminOnly>
                            </>
                          )}
                          {record.status !== 'paid' && record.status !== 'void' && (
                            <AdminOnly>
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-red-500 focus:text-red-500">
                                    <XCircle className="w-3.5 h-3.5 mr-2" />Void
                                  </DropdownMenuItem>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Void this record?</AlertDialogTitle>
                                    <AlertDialogDescription>{record.party_name} – {formatCurrency(Number(record.amount))} will be voided.</AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction onClick={() => handleVoid(record)} className="bg-red-500 hover:bg-red-600 text-white">Void</AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </AdminOnly>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between px-6 py-3 border-t border-gray-200 bg-white dark:border-[#3a3730] dark:bg-[#222019]">
          <span className="text-sm text-gray-500 dark:text-[#a09888]">Page {currentPage} of {totalPages} · {totalCount} records</span>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" disabled={currentPage <= 1} onClick={() => updateParams({ page: String(currentPage - 1) })}>Previous</Button>
            <Button size="sm" variant="outline" disabled={currentPage >= totalPages} onClick={() => updateParams({ page: String(currentPage + 1) })}>Next</Button>
          </div>
        </div>
      )}

      <ArApForm
        open={formOpen}
        onClose={() => { setFormOpen(false); setEditingRecord(null); }}
        onSuccess={() => { setFormOpen(false); setEditingRecord(null); router.refresh(); }}
        editingRecord={editingRecord} defaultType={defaultFormType}
      />
      <ArApPayDialog
        record={payingRecord} accounts={accounts} open={payDialogOpen}
        onClose={() => { setPayDialogOpen(false); setPayingRecord(null); }}
        onSuccess={() => { setPayDialogOpen(false); setPayingRecord(null); router.refresh(); }}
      />
    </div>
  );
}
