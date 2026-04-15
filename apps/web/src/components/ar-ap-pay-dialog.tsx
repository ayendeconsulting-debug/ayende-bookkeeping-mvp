'use client';

import { useState, useTransition } from 'react';
import { Loader2 } from 'lucide-react';
import { ArApRecord, Account } from '@/types';
import { payArAp } from '@/app/(app)/ar-ap/actions';
import { toastSuccess, toastError } from '@/lib/toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';

interface ArApPayDialogProps {
  record: ArApRecord | null; accounts: Account[];
  open: boolean; onClose: () => void; onSuccess: () => void;
}

const selectCls = 'text-sm border border-input rounded-lg px-3 py-2 w-full outline-none focus:border-primary bg-card text-foreground';

export function ArApPayDialog({ record, accounts, open, onClose, onSuccess }: ArApPayDialogProps) {
  const [amount,         setAmount]         = useState('');
  const [paymentDate,    setPaymentDate]    = useState(new Date().toISOString().split('T')[0]);
  const [bankAccountId,  setBankAccountId]  = useState('');
  const [contraAccountId,setContraAccountId]= useState('');
  const [notes,          setNotes]          = useState('');
  const [error,          setError]          = useState<string | null>(null);
  const [isPending,      startTransition]   = useTransition();

  if (!record) return null;

  const isReceivable = record.type === 'receivable';
  const balanceOwing = Number(record.amount) - Number(record.amount_paid);
  const bankAccounts = accounts.filter((a) => a.account_subtype === 'bank' || a.account_subtype === 'credit_card');
  const contraAccounts = isReceivable
    ? accounts.filter((a) => a.account_type === 'revenue' || a.account_subtype === 'accounts_receivable')
    : accounts.filter((a) => a.account_type === 'expense'  || a.account_subtype === 'accounts_payable');

  function handleClose() {
    setAmount(''); setPaymentDate(new Date().toISOString().split('T')[0]);
    setBankAccountId(''); setContraAccountId(''); setNotes(''); setError(null); onClose();
  }

  function handleSubmit() {
    if (!record) return;
    const amountNum = parseFloat(amount);
    if (!amount || isNaN(amountNum) || amountNum <= 0) { setError('Please enter a valid amount.'); return; }
    if (amountNum > balanceOwing + 0.01) { setError(`Amount exceeds balance owing of $${balanceOwing.toFixed(2)}.`); return; }
    if (!bankAccountId)   { setError('Please select a bank account.'); return; }
    if (!contraAccountId) { setError(`Please select a ${isReceivable ? 'revenue' : 'expense'} account.`); return; }
    setError(null);
    startTransition(async () => {
      const result = await payArAp(record.id, { amount: amountNum, payment_date: paymentDate, bank_account_id: bankAccountId, contra_account_id: contraAccountId, notes: notes || undefined });
      if (result.success) {
        toastSuccess(amountNum >= balanceOwing ? 'Fully paid' : 'Payment recorded', `$${amountNum.toFixed(2)} for ${record.party_name}`);
        handleClose(); onSuccess();
      } else {
        const msg = result.error ?? 'Failed to record payment'; setError(msg); toastError('Payment failed', msg);
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Record Payment</DialogTitle>
          <DialogDescription>
            {isReceivable ? 'Payment received from' : 'Payment made to'} {record.party_name}
            {' · '}Balance owing: ${balanceOwing.toFixed(2)}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4 mt-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label>Amount *</Label>
              <Input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder={balanceOwing.toFixed(2)} min="0.01" step="0.01" />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Payment Date *</Label>
              <Input type="date" value={paymentDate} onChange={(e) => setPaymentDate(e.target.value)} />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>{isReceivable ? 'Bank Account (received into) *' : 'Bank Account (paid from) *'}</Label>
            <select value={bankAccountId} onChange={(e) => setBankAccountId(e.target.value)} className={selectCls}>
              <option value="">Select account…</option>
              {bankAccounts.map((a) => <option key={a.id} value={a.id}>{a.account_code} – {a.account_name}</option>)}
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>{isReceivable ? 'Revenue Account (credit) *' : 'Expense Account (debit) *'}</Label>
            <select value={contraAccountId} onChange={(e) => setContraAccountId(e.target.value)} className={selectCls}>
              <option value="">Select account…</option>
              {contraAccounts.map((a) => <option key={a.id} value={a.id}>{a.account_code} – {a.account_name}</option>)}
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>Notes <span className="text-muted-foreground font-normal">(optional)</span></Label>
            <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="e.g. Cheque #1042" />
          </div>

          <div className="rounded-lg bg-primary-light dark:bg-primary/10 border border-primary/30 px-3 py-2 text-xs text-primary">
            {isReceivable
              ? 'Journal entry: Debit bank account → Credit revenue account'
              : 'Journal entry: Debit expense account → Credit bank account'}
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}
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
