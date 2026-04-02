'use client';

import { useState, useTransition } from 'react';
import { Loader2 } from 'lucide-react';
import { Account, Invoice } from '@/types';
import { recordPayment } from '@/app/(app)/invoices/actions';
import { toastSuccess, toastError } from '@/lib/toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';

interface InvoicePayDialogProps {
  invoice: Invoice | null;
  accounts: Account[];
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function InvoicePayDialog({
  invoice,
  accounts,
  open,
  onClose,
  onSuccess,
}: InvoicePayDialogProps) {
  const [amount, setAmount] = useState('');
  const [paymentDate, setPaymentDate] = useState(
    new Date().toISOString().split('T')[0],
  );
  const [bankAccountId, setBankAccountId] = useState('');
  const [revenueAccountId, setRevenueAccountId] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  if (!invoice) return null;

  const bankAccounts = accounts.filter(
    (a) => a.account_subtype === 'bank' || a.account_subtype === 'credit_card',
  );
  const revenueAccounts = accounts.filter((a) => a.account_type === 'revenue');
  const balanceDue = Number(invoice.balance_due);

  function handleClose() {
    setAmount('');
    setPaymentDate(new Date().toISOString().split('T')[0]);
    setBankAccountId('');
    setRevenueAccountId('');
    setNotes('');
    setError(null);
    onClose();
  }

  function handleSubmit() {
    if (!invoice) return;
    const amountNum = parseFloat(amount);
    if (!amount || isNaN(amountNum) || amountNum <= 0) {
      setError('Please enter a valid payment amount.');
      return;
    }
    if (amountNum > balanceDue + 0.01) {
      setError(`Amount exceeds balance due of $${balanceDue.toFixed(2)}.`);
      return;
    }
    if (!bankAccountId) {
      setError('Please select the bank account that received the payment.');
      return;
    }
    if (!revenueAccountId) {
      setError('Please select the revenue account to credit.');
      return;
    }

    setError(null);
    startTransition(async () => {
      const result = await recordPayment(invoice.id, {
        amount: amountNum,
        payment_date: paymentDate,
        bank_account_id: bankAccountId,
        revenue_account_id: revenueAccountId,
        notes: notes || undefined,
      });

      if (result.success) {
        toastSuccess(
          amountNum >= balanceDue ? 'Invoice paid in full' : 'Payment recorded',
          `$${amountNum.toFixed(2)} recorded for ${invoice.invoice_number}`,
        );
        handleClose();
        onSuccess();
      } else {
        const msg = result.error ?? 'Failed to record payment';
        setError(msg);
        toastError('Payment failed', msg);
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Record Payment</DialogTitle>
          <DialogDescription>
            {invoice.invoice_number} · {invoice.client_name} · Balance due: ${balanceDue.toFixed(2)}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4 mt-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label>Amount *</Label>
              <Input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder={balanceDue.toFixed(2)}
                min="0.01"
                step="0.01"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Payment Date *</Label>
              <Input
                type="date"
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>Bank Account (received payment) *</Label>
            <select
              value={bankAccountId}
              onChange={(e) => setBankAccountId(e.target.value)}
              className="text-sm border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-[#0F6E56]"
            >
              <option value="">Select account…</option>
              {bankAccounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.account_code} – {a.account_name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>Revenue Account (credit) *</Label>
            <select
              value={revenueAccountId}
              onChange={(e) => setRevenueAccountId(e.target.value)}
              className="text-sm border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-[#0F6E56]"
            >
              <option value="">Select account…</option>
              {revenueAccounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.account_code} – {a.account_name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>Notes <span className="text-gray-400 font-normal">(optional)</span></Label>
            <Input
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. E-transfer received"
            />
          </div>

          <div className="rounded-lg bg-[#F0FAF6] border border-[#C3E8D8] px-3 py-2 text-xs text-[#0F6E56]">
            This will create a journal entry: Debit {bankAccounts.find(a => a.id === bankAccountId)?.account_name ?? 'bank account'} / Credit {revenueAccounts.find(a => a.id === revenueAccountId)?.account_name ?? 'revenue account'}.
          </div>

          {error && <p className="text-sm text-red-500">{error}</p>}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isPending}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={isPending}>
            {isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
            Record Payment
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
