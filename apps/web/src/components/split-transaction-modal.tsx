'use client';

import { useState, useTransition } from 'react';
import { X, Plus, Trash2, AlertCircle, CheckCircle2 } from 'lucide-react';
import { Account, RawTransaction } from '@/types';
import { formatCurrency, cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { splitTransaction } from '@/app/(app)/transactions/actions';
import { toastSuccess, toastError } from '@/lib/toast';

interface SplitLine {
  id: string;
  account_id: string;
  description: string;
  amount: string;
}

interface SplitTransactionModalProps {
  transaction: RawTransaction | null;
  accounts: Account[];
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

function newLine(): SplitLine {
  return { id: crypto.randomUUID(), account_id: '', description: '', amount: '' };
}

export function SplitTransactionModal({
  transaction,
  accounts,
  open,
  onClose,
  onSuccess,
}: SplitTransactionModalProps) {
  const [isPending, startTransition] = useTransition();
  const [sourceAccountId, setSourceAccountId] = useState('');
  const [lines, setLines] = useState<SplitLine[]>([newLine(), newLine()]);
  const [error, setError] = useState('');

  if (!open || !transaction) return null;

  const rawAmount = Math.abs(Number(transaction.amount));
  const allocated = lines.reduce((sum, l) => sum + (parseFloat(l.amount) || 0), 0);
  const remaining = parseFloat((rawAmount - allocated).toFixed(2));
  const isBalanced = Math.abs(remaining) < 0.01;
  const canSubmit =
    isBalanced &&
    sourceAccountId !== '' &&
    lines.length >= 2 &&
    lines.every((l) => l.account_id !== '' && parseFloat(l.amount) > 0);

  function handleAddLine() {
    setLines((prev) => [...prev, newLine()]);
  }

  function handleRemoveLine(id: string) {
    if (lines.length <= 2) return;
    setLines((prev) => prev.filter((l) => l.id !== id));
  }

  function handleLineChange(id: string, field: keyof SplitLine, value: string) {
    setLines((prev) =>
      prev.map((l) => (l.id === id ? { ...l, [field]: value } : l)),
    );
  }

  function handleClose() {
    setLines([newLine(), newLine()]);
    setSourceAccountId('');
    setError('');
    onClose();
  }

  function handleSubmit() {
    setError('');
    if (!transaction) return;
    if (!sourceAccountId) { setError('Please select a source account.'); return; }
    if (!isBalanced) { setError(`Split amounts must equal ${formatCurrency(rawAmount)}.`); return; }

    const splits = lines.map((l) => ({
      account_id: l.account_id,
      amount: parseFloat(l.amount),
      description: l.description || undefined,
    }));

    startTransition(async () => {
      const result = await splitTransaction(transaction.id, {
        source_account_id: sourceAccountId,
        splits,
      });
      if (result.success) {
        toastSuccess(`Transaction split into ${splits.length} lines and posted to ledger.`);
        handleClose();
        onSuccess();
      } else {
        setError(result.error ?? 'Split failed. Please try again.');
      }
    });
  }

  const activeAccounts = accounts.filter((a) => a.is_active);

  return (
    /* Backdrop */
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl flex flex-col max-h-[90vh]">

        {/* Header */}
        <div className="flex items-start justify-between px-6 py-4 border-b border-gray-200">
          <div>
            <h2 className="text-base font-semibold text-gray-900">Split Transaction</h2>
            <p className="text-sm text-gray-500 mt-0.5 truncate max-w-sm">
              {transaction.description}
            </p>
          </div>
          <div className="flex items-center gap-3 ml-4 flex-shrink-0">
            <span className="text-sm font-semibold text-gray-900">
              {formatCurrency(rawAmount)}
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
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-5">

          {/* Source account */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1.5">
              Source Account <span className="text-red-500">*</span>
            </label>
            <select
              value={sourceAccountId}
              onChange={(e) => setSourceAccountId(e.target.value)}
              className="w-full h-9 rounded-md border border-gray-200 px-2 text-sm bg-white focus:outline-none focus:ring-1 focus:ring-primary"
            >
              <option value="">Select bank / credit card account…</option>
              {activeAccounts
                .filter((a) => a.account_type === 'asset' || a.account_type === 'liability')
                .map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.account_code} – {a.account_name}
                  </option>
                ))}
            </select>
          </div>

          {/* Split lines */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-medium text-gray-700">Split Lines</label>
              <span className="text-xs text-gray-400">{lines.length} lines</span>
            </div>

            <div className="space-y-2">
              {/* Column headers */}
              <div className="grid grid-cols-[1fr_160px_120px_32px] gap-2 px-1">
                <span className="text-xs text-gray-400">Account</span>
                <span className="text-xs text-gray-400">Description</span>
                <span className="text-xs text-gray-400 text-right">Amount</span>
                <span />
              </div>

              {lines.map((line) => (
                <div key={line.id} className="grid grid-cols-[1fr_160px_120px_32px] gap-2 items-center">
                  {/* Account */}
                  <select
                    value={line.account_id}
                    onChange={(e) => handleLineChange(line.id, 'account_id', e.target.value)}
                    className="h-9 rounded-md border border-gray-200 px-2 text-sm bg-white focus:outline-none focus:ring-1 focus:ring-primary w-full"
                  >
                    <option value="">Select account…</option>
                    {activeAccounts.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.account_code} – {a.account_name}
                      </option>
                    ))}
                  </select>

                  {/* Description */}
                  <Input
                    value={line.description}
                    onChange={(e) => handleLineChange(line.id, 'description', e.target.value)}
                    placeholder="Optional"
                    className="h-9 text-sm"
                  />

                  {/* Amount */}
                  <Input
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={line.amount}
                    onChange={(e) => handleLineChange(line.id, 'amount', e.target.value)}
                    placeholder="0.00"
                    className="h-9 text-sm text-right"
                  />

                  {/* Remove */}
                  <button
                    onClick={() => handleRemoveLine(line.id)}
                    disabled={lines.length <= 2}
                    className={cn(
                      'flex items-center justify-center w-8 h-8 rounded-md transition-colors',
                      lines.length <= 2
                        ? 'text-gray-200 cursor-not-allowed'
                        : 'text-gray-400 hover:text-red-500 hover:bg-red-50',
                    )}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>

            <button
              onClick={handleAddLine}
              className="mt-3 flex items-center gap-1.5 text-sm text-primary hover:text-primary/80 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add line
            </button>
          </div>

          {/* Balance indicator */}
          <div className={cn(
            'flex items-center justify-between rounded-lg px-4 py-3 text-sm font-medium border',
            isBalanced
              ? 'bg-green-50 border-green-200 text-green-700'
              : 'bg-amber-50 border-amber-200 text-amber-700',
          )}>
            <div className="flex items-center gap-2">
              {isBalanced
                ? <CheckCircle2 className="w-4 h-4" />
                : <AlertCircle className="w-4 h-4" />}
              <span>{isBalanced ? 'Balanced' : remaining > 0 ? 'Under-allocated' : 'Over-allocated'}</span>
            </div>
            <div className="flex items-center gap-4 text-xs">
              <span>Allocated: <strong>{formatCurrency(allocated)}</strong></span>
              <span className={cn(remaining !== 0 && 'text-amber-600 font-semibold')}>
                Remaining: <strong>{formatCurrency(Math.abs(remaining))}{remaining < 0 ? ' over' : ''}</strong>
              </span>
            </div>
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
            className="bg-primary text-white hover:bg-primary/90 min-w-[120px]"
          >
            {isPending ? 'Posting…' : `Confirm Split (${lines.length})`}
          </Button>
        </div>
      </div>
    </div>
  );
}
