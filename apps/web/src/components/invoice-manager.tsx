'use client';

import { useState, useTransition } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import {
  Plus, Search, FileText, Send, DollarSign,
  XCircle, Download, Pencil, MoreHorizontal,
} from 'lucide-react';
import { Invoice, Account, TaxCode } from '@/types';
import { sendInvoice, voidInvoice } from '@/app/(app)/invoices/actions';
import { toastSuccess, toastError } from '@/lib/toast';
import { AdminOnly } from '@/components/admin-only';
import { InvoiceForm } from '@/components/invoice-form';
import { InvoicePayDialog } from '@/components/invoice-pay-dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { cn, formatCurrency } from '@/lib/utils';

const STATUS_TABS = [
  { key: 'all',           label: 'All' },
  { key: 'draft',         label: 'Draft' },
  { key: 'sent',          label: 'Sent' },
  { key: 'partially_paid',label: 'Partial' },
  { key: 'paid',          label: 'Paid' },
  { key: 'overdue',       label: 'Overdue' },
];

const STATUS_VARIANTS: Record<string, 'pending' | 'classified' | 'posted' | 'review'> = {
  draft: 'pending', sent: 'classified', viewed: 'classified',
  partially_paid: 'review', paid: 'posted', overdue: 'review', void: 'review',
};

interface InvoiceManagerProps {
  initialInvoices: Invoice[];
  totalCount: number;
  accounts: Account[];
  taxCodes: TaxCode[];
  currentStatus: string;
  currentSearch: string;
  currentPage: number;
}

export function InvoiceManager({
  initialInvoices, totalCount, accounts, taxCodes,
  currentStatus, currentSearch, currentPage,
}: InvoiceManagerProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [searchValue, setSearchValue] = useState(currentSearch);
  const [formOpen, setFormOpen] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState<Invoice | null>(null);
  const [payingInvoice, setPayingInvoice] = useState<Invoice | null>(null);
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

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    updateParams({ search: searchValue });
  }

  async function openEdit(invoice: Invoice) {
    try {
      const res = await fetch(`/api/proxy/invoices/${invoice.id}`);
      const full = await res.json();
      setEditingInvoice(full);
    } catch {
      setEditingInvoice(invoice);
    }
    setFormOpen(true);
  }
  function openPay(invoice: Invoice) { setPayingInvoice(invoice); setPayDialogOpen(true); }

  async function handleSend(invoice: Invoice) {
    const result = await sendInvoice(invoice.id);
    if (result.success) { toastSuccess('Invoice sent', `${invoice.invoice_number} marked as sent.`); router.refresh(); }
    else toastError('Failed to send invoice', result.error ?? 'Please try again.');
  }

  async function handleVoid(invoice: Invoice) {
    const result = await voidInvoice(invoice.id);
    if (result.success) { toastSuccess('Invoice voided', invoice.invoice_number); router.refresh(); }
    else toastError('Failed to void invoice', result.error ?? 'Please try again.');
  }

  function handleDownloadPdf(invoice: Invoice) {
    const apiUrl = process.env.API_URL || 'http://localhost:3005';
    window.open(`${apiUrl}/invoices/${invoice.id}/pdf`, '_blank');
  }

  const outstanding = initialInvoices
    .filter((i) => ['sent', 'viewed', 'partially_paid', 'overdue'].includes(i.status))
    .reduce((s, i) => s + Number(i.balance_due), 0);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-6 py-5 border-b border-border bg-background">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-xl font-semibold text-foreground">Invoices</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              {totalCount} total
              {outstanding > 0 && ` · ${formatCurrency(outstanding)} outstanding`}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <form onSubmit={handleSearch} className="flex gap-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input className="pl-8 w-56" placeholder="Search client…" value={searchValue} onChange={(e) => setSearchValue(e.target.value)} />
              </div>
              <Button type="submit" variant="outline" size="sm">Filter</Button>
            </form>
            <AdminOnly>
              <Button onClick={() => { setEditingInvoice(null); setFormOpen(true); }} className="flex items-center gap-2">
                <Plus className="w-4 h-4" />New Invoice
              </Button>
            </AdminOnly>
          </div>
        </div>
        <div className="flex gap-0 -mb-px">
          {STATUS_TABS.map((tab) => (
            <button key={tab.key} onClick={() => updateParams({ status: tab.key })}
              className={cn('px-4 py-2 text-sm border-b-2 transition-colors',
                currentStatus === tab.key || (tab.key === 'all' && !currentStatus)
                  ? 'border-primary text-primary font-medium'
                  : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border',
              )}>
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className={cn('flex-1 overflow-auto bg-background', isPending && 'opacity-60 pointer-events-none')}>
        {initialInvoices.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-3">
              <FileText className="w-5 h-5 text-muted-foreground" />
            </div>
            <p className="text-sm font-medium text-foreground mb-1">No invoices found</p>
            <p className="text-sm text-muted-foreground">Create your first invoice to get started.</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Invoice #</TableHead>
                <TableHead>Client</TableHead>
                <TableHead>Issue Date</TableHead>
                <TableHead>Due Date</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead className="text-right">Balance Due</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-24" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {initialInvoices.map((invoice) => (
                <TableRow key={invoice.id}>
                  <TableCell className="font-mono text-sm font-medium">{invoice.invoice_number}</TableCell>
                  <TableCell>
                    <div className="text-sm font-medium text-foreground">{invoice.client_name}</div>
                    {invoice.client_email && <div className="text-xs text-muted-foreground">{invoice.client_email}</div>}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                    {new Date(invoice.issue_date).toLocaleDateString('en-CA', { month: 'short', day: 'numeric', year: '2-digit' })}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                    {new Date(invoice.due_date).toLocaleDateString('en-CA', { month: 'short', day: 'numeric', year: '2-digit' })}
                  </TableCell>
                  <TableCell className="text-right font-medium text-sm">{formatCurrency(Number(invoice.total))}</TableCell>
                  <TableCell className={cn('text-right font-medium text-sm', Number(invoice.balance_due) > 0 ? 'text-orange-500' : 'text-muted-foreground')}>
                    {Number(invoice.balance_due) > 0 ? formatCurrency(Number(invoice.balance_due)) : '—'}
                  </TableCell>
                  <TableCell>
                    <Badge variant={STATUS_VARIANTS[invoice.status] ?? 'pending'}>
                      {invoice.status.replace('_', ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
                          <MoreHorizontal className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {invoice.status === 'draft' && (
                          <>
                            <AdminOnly><DropdownMenuItem onClick={() => openEdit(invoice)}><Pencil className="w-3.5 h-3.5 mr-2" />Edit</DropdownMenuItem></AdminOnly>
                            <AdminOnly><DropdownMenuItem onClick={() => handleSend(invoice)}><Send className="w-3.5 h-3.5 mr-2" />Mark as Sent</DropdownMenuItem></AdminOnly>
                          </>
                        )}
                        {['sent', 'viewed', 'partially_paid', 'overdue'].includes(invoice.status) && (
                          <AdminOnly><DropdownMenuItem onClick={() => openPay(invoice)}><DollarSign className="w-3.5 h-3.5 mr-2" />Record Payment</DropdownMenuItem></AdminOnly>
                        )}
                        <DropdownMenuItem onClick={() => handleDownloadPdf(invoice)}><Download className="w-3.5 h-3.5 mr-2" />Download PDF</DropdownMenuItem>
                        {invoice.status !== 'paid' && invoice.status !== 'void' && (
                          <AdminOnly>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-destructive focus:text-destructive">
                                  <XCircle className="w-3.5 h-3.5 mr-2" />Void Invoice
                                </DropdownMenuItem>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Void {invoice.invoice_number}?</AlertDialogTitle>
                                  <AlertDialogDescription>This invoice will be voided and cannot be used to collect payment.</AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => handleVoid(invoice)} className="bg-destructive hover:bg-destructive/90 text-destructive-foreground">Void Invoice</AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </AdminOnly>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between px-6 py-3 border-t border-border bg-background">
          <span className="text-sm text-muted-foreground">Page {currentPage} of {totalPages} · {totalCount} invoices</span>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" disabled={currentPage <= 1} onClick={() => updateParams({ page: String(currentPage - 1) })}>Previous</Button>
            <Button size="sm" variant="outline" disabled={currentPage >= totalPages} onClick={() => updateParams({ page: String(currentPage + 1) })}>Next</Button>
          </div>
        </div>
      )}

      <InvoiceForm
        open={formOpen}
        onClose={() => { setFormOpen(false); setEditingInvoice(null); }}
        onSuccess={() => { setFormOpen(false); setEditingInvoice(null); router.refresh(); }}
        accounts={accounts} taxCodes={taxCodes} editingInvoice={editingInvoice}
      />
      <InvoicePayDialog
        invoice={payingInvoice} accounts={accounts} open={payDialogOpen}
        onClose={() => { setPayDialogOpen(false); setPayingInvoice(null); }}
        onSuccess={() => { setPayDialogOpen(false); setPayingInvoice(null); router.refresh(); }}
      />
    </div>
  );
}
