'use client';

import { useState, useTransition } from 'react';
import { X, ArrowRight, AlertCircle } from 'lucide-react';
import { Account, RawTransaction } from '@/types';
import { formatCurrency, cn } from '@/lib/utils';
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

export function TransferModal({
  transaction,
  accounts,
  open,
  onClose,
  onSuccess,
}: TransferModalProps) {
  const [isPending, startTransition] = useTransition();
  const [sourceAccountId, setSourceAccountId] = useState('');
  const [destinationAccountId, setDestinationAccountId] = useState('');
  const [error, setError] = useState('');

  if (!open || !transaction) return null;

  const amount = Math.abs(Number(transaction.amount));

  // Only asset and liability accounts are valid for transfers (bank, credit card)
  const transferAccounts = accounts.filter(
    (a) => a.is_active && (a.account_type === 'asset' || a.account_type === 'liability'),
  );

  const canSubmit =
    sourceAccountId !== '' &&
    destinationAccountId !== '' &&
    sourceAccountId !== destinationAccountId;

  function handleClose() {
    setSourceAccountId('');
    setDestinationAccountId('');
    setError('');
    onClose();
  }

  function handleSubmit() {
    if (!transaction) return;
    setError('');
    if (!sourceAccountId) { setError('Please select a source account.'); return; }
    if (!destinationAccountId) { setError('Please select a destination account.'); return; }
    if (sourceAccountId === destinationAccountId) {
      setError('Source and destination accounts must be different.');
      return;
    }

    startTransition(async () => {
      const result = await markAsTransfer(transaction.id, {
        source_account_id: sourceAccountId,
        destination_account_id: destinationAccountId,
      });
      if (result.success) {
        toastSuccess('Transfer posted to ledger.');
        handleClose();
        onSuccess();
      } else {
        setError(result.error ?? 'Transfer failed. Please try again.');
      }
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md flex flex-col">

        {/* Header */}
        <div className="flex items-start justify-between px-6 py-4 border-b border-gray-200">
          <div>
            <h2 className="text-base font-semibold text-gray-900">Mark as Transfer</h2>
            <p className="text-sm text-gray-500 mt-0.5 truncate max-w-xs">
              {transaction.description}
            </p>
          </div>
          <div className="flex items-center gap-3 ml-4 flex-shrink-0">
            <span className="text-sm font-semibold text-gray-900">
              {formatCurrency(amount)}
            </span>
            <button
              onClick={handleClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-4">

          <p className="text-xs text-gray-500 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2">
            Transfers between your own accounts do not affect your Income Statement.
            A balanced journal entry will be posted debiting the destination and crediting the source.
          </p>

          {/* Source account */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1.5">
              From Account <span className="text-red-500">*</span>
            </label>
            <select
              value={sourceAccountId}
              onChange={(e) => setSourceAccountId(e.target.value)}
              className="w-full h-9 rounded-md border border-gray-200 px-2 text-sm bg-white focus:outline-none focus:ring-1 focus:ring-primary"
            >
              <option value="">Select source account…</option>
              {transferAccounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.account_code} – {a.account_name}
                </option>
              ))}
            </select>
          </div>

          {/* Arrow */}
          <div className="flex items-center justify-center">
            <div className="flex items-center gap-2 text-xs text-gray-400">
              <div className="h-px w-16 bg-gray-200" />
              <ArrowRight className="w-4 h-4 text-primary" />
              <div className="h-px w-16 bg-gray-200" />
            </div>
          </div>

          {/* Destination account */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1.5">
              To Account <span className="text-red-500">*</span>
            </label>
            <select
              value={destinationAccountId}
              onChange={(e) => setDestinationAccountId(e.target.value)}
              className="w-full h-9 rounded-md border border-gray-200 px-2 text-sm bg-white focus:outline-none focus:ring-1 focus:ring-primary"
            >
              <option value="">Select destination account…</option>
              {transferAccounts
                .filter((a) => a.id !== sourceAccountId)
                .map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.account_code} – {a.account_name}
                  </option>
                ))}
            </select>
          </div>

          {/* Error */}
          {error && (
            <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-2.5">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200 bg-gray-50 rounded-b-xl">
          <Button variant="outline" onClick={handleClose} disabled={isPending}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!canSubmit || isPending}
            className="bg-primary text-white hover:bg-primary/90 min-w-[140px]"
          >
            {isPending ? 'Posting…' : 'Confirm Transfer'}
          </Button>
        </div>
      </div>
    </div>
  );
}
