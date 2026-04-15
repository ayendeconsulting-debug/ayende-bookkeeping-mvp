'use client';

import { useState, useTransition } from 'react';
import { X, ArrowRight, AlertCircle } from 'lucide-react';
import { Account, RawTransaction } from '@/types';
import { formatCurrency } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { markAsTransfer } from '@/app/(app)/transactions/actions';
import { toastSuccess, toastError } from '@/lib/toast';

interface TransferModalProps {
  transaction: RawTransaction | null;
  accounts: Account[];
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function TransferModal({ transaction, accounts, open, onClose, onSuccess }: TransferModalProps) {
  const [isPending, startTransition] = useTransition();
  const [sourceAccountId, setSourceAccountId] = useState('');
  const [destinationAccountId, setDestinationAccountId] = useState('');
  const [error, setError] = useState('');

  if (!open || !transaction) return null;

  const amount = Math.abs(Number(transaction.amount));
  const transferAccounts = accounts.filter((a) => a.is_active && (a.account_type === 'asset' || a.account_type === 'liability'));
  const canSubmit = sourceAccountId !== '' && destinationAccountId !== '' && sourceAccountId !== destinationAccountId;

  const selectCls = 'w-full h-9 rounded-md border border-input px-2 text-sm bg-card text-foreground focus:outline-none focus:ring-1 focus:ring-primary';

  function handleClose() { setSourceAccountId(''); setDestinationAccountId(''); setError(''); onClose(); }

  function handleSubmit() {
    if (!transaction) return;
    setError('');
    if (!sourceAccountId) { setError('Please select a source account.'); return; }
    if (!destinationAccountId) { setError('Please select a destination account.'); return; }
    if (sourceAccountId === destinationAccountId) { setError('Source and destination accounts must be different.'); return; }

    startTransition(async () => {
      const result = await markAsTransfer(transaction.id, {
        source_account_id: sourceAccountId,
        destination_account_id: destinationAccountId,
      });
      if (result.success) {
        toastSuccess('Transfer posted to ledger.');
        handleClose(); onSuccess();
      } else {
        setError(result.error ?? 'Transfer failed. Please try again.');
      }
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4 bg-black/60">
      <div className="bg-card sm:rounded-xl rounded-t-xl shadow-2xl w-full sm:max-w-md flex flex-col border border-border">

        {/* Header */}
        <div className="flex items-start justify-between px-6 py-4 border-b border-border">
          <div>
            <h2 className="text-base font-semibold text-foreground">Mark as Transfer</h2>
            <p className="text-sm text-muted-foreground mt-0.5 truncate max-w-xs">{transaction.description}</p>
          </div>
          <div className="flex items-center gap-3 ml-4 flex-shrink-0">
            <span className="text-sm font-semibold text-foreground">{formatCurrency(amount)}</span>
            <button onClick={handleClose} className="text-muted-foreground hover:text-foreground transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-4">
          <p className="text-xs text-muted-foreground bg-muted border border-border rounded-lg px-3 py-2">
            Transfers between your own accounts do not affect your Income Statement.
            A balanced journal entry will be posted debiting the destination and crediting the source.
          </p>

          <div>
            <label className="block text-xs font-medium text-foreground mb-1.5">
              From Account <span className="text-destructive">*</span>
            </label>
            <select value={sourceAccountId} onChange={(e) => setSourceAccountId(e.target.value)} className={selectCls}>
              <option value="">Select source account…</option>
              {transferAccounts.map((a) => (
                <option key={a.id} value={a.id}>{a.account_code} – {a.account_name}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center justify-center">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <div className="h-px w-16 bg-border" />
              <ArrowRight className="w-4 h-4 text-primary" />
              <div className="h-px w-16 bg-border" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-foreground mb-1.5">
              To Account <span className="text-destructive">*</span>
            </label>
            <select value={destinationAccountId} onChange={(e) => setDestinationAccountId(e.target.value)} className={selectCls}>
              <option value="">Select destination account…</option>
              {transferAccounts.filter((a) => a.id !== sourceAccountId).map((a) => (
                <option key={a.id} value={a.id}>{a.account_code} – {a.account_name}</option>
              ))}
            </select>
          </div>

          {error && (
            <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-lg px-4 py-2.5">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />{error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-border bg-muted sm:rounded-b-xl">
          <Button variant="outline" onClick={handleClose} disabled={isPending}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={!canSubmit || isPending} className="min-w-[140px]">
            {isPending ? 'Posting…' : 'Confirm Transfer'}
          </Button>
        </div>
      </div>
    </div>
  );
}
