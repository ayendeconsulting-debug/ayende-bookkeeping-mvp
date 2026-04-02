'use client';

import { useState, useTransition } from 'react';
import { Loader2 } from 'lucide-react';
import { ArApRecord } from '@/types';
import { createArAp, updateArAp } from '@/app/(app)/ar-ap/actions';
import { toastSuccess, toastError } from '@/lib/toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';

interface ArApFormProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  editingRecord?: ArApRecord | null;
  defaultType?: 'receivable' | 'payable';
}

export function ArApForm({
  open,
  onClose,
  onSuccess,
  editingRecord,
  defaultType = 'receivable',
}: ArApFormProps) {
  const today = new Date().toISOString().split('T')[0];
  const net30 = new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0];

  const [type, setType] = useState<'receivable' | 'payable'>(
    editingRecord?.type ?? defaultType,
  );
  const [partyName, setPartyName] = useState(editingRecord?.party_name ?? '');
  const [partyEmail, setPartyEmail] = useState(editingRecord?.party_email ?? '');
  const [amount, setAmount] = useState(editingRecord ? String(editingRecord.amount) : '');
  const [dueDate, setDueDate] = useState(
    editingRecord?.due_date
      ? String(editingRecord.due_date).slice(0, 10)
      : net30,
  );
  const [description, setDescription] = useState(editingRecord?.description ?? '');
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleClose() {
    setError(null);
    onClose();
  }

  function handleSubmit() {
    if (!partyName.trim()) { setError('Party name is required.'); return; }
    const amountNum = parseFloat(amount);
    if (!amount || isNaN(amountNum) || amountNum <= 0) {
      setError('Please enter a valid amount.'); return;
    }
    if (!dueDate) { setError('Due date is required.'); return; }

    setError(null);
    startTransition(async () => {
      const result = editingRecord
        ? await updateArAp(editingRecord.id, {
            party_name: partyName.trim(),
            party_email: partyEmail || undefined,
            due_date: dueDate,
            description: description || undefined,
          })
        : await createArAp({
            type,
            party_name: partyName.trim(),
            party_email: partyEmail || undefined,
            amount: amountNum,
            due_date: dueDate,
            description: description || undefined,
          });

      if (result.success) {
        const label = type === 'receivable' ? 'Receivable' : 'Payable';
        toastSuccess(
          editingRecord ? `${label} updated` : `${label} created`,
          partyName,
        );
        handleClose();
        onSuccess();
      } else {
        const msg = result.error ?? 'Operation failed';
        setError(msg);
        toastError(editingRecord ? 'Update failed' : 'Create failed', msg);
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {editingRecord
              ? `Edit ${editingRecord.type === 'receivable' ? 'Receivable' : 'Payable'}`
              : 'New AR / AP Record'}
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4 mt-2">
          {/* Type toggle — only on create */}
          {!editingRecord && (
            <div className="flex flex-col gap-1.5">
              <Label>Type</Label>
              <div className="grid grid-cols-2 gap-2">
                {(['receivable', 'payable'] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setType(t)}
                    className={[
                      'py-2 px-3 rounded-lg border-2 text-sm font-medium transition-all',
                      type === t
                        ? 'border-[#0F6E56] bg-[#F0FAF6] text-[#0F6E56]'
                        : 'border-gray-200 text-gray-600 hover:border-gray-300',
                    ].join(' ')}
                  >
                    {t === 'receivable' ? '💰 Money Owed to Us' : '📤 Money We Owe'}
                  </button>
                ))}
              </div>
              <p className="text-xs text-gray-400">
                {type === 'receivable'
                  ? 'A customer or client owes your business money.'
                  : 'Your business owes a supplier or vendor money.'}
              </p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5 col-span-2">
              <Label>{type === 'receivable' ? 'Customer / Client *' : 'Supplier / Vendor *'}</Label>
              <Input
                value={partyName}
                onChange={(e) => setPartyName(e.target.value)}
                placeholder={type === 'receivable' ? 'e.g. Acme Corp' : 'e.g. Office Depot'}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label>Amount *</Label>
              <Input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                min="0.01"
                step="0.01"
                disabled={!!editingRecord}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Due Date *</Label>
              <Input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>Email <span className="text-gray-400 font-normal">(optional)</span></Label>
            <Input
              type="email"
              value={partyEmail}
              onChange={(e) => setPartyEmail(e.target.value)}
              placeholder="contact@example.com"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>Description <span className="text-gray-400 font-normal">(optional)</span></Label>
            <Input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. Invoice #123 for consulting services"
            />
          </div>

          {error && <p className="text-sm text-red-500">{error}</p>}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isPending}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={isPending}>
            {isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
            {editingRecord ? 'Save Changes' : type === 'receivable' ? 'Create Receivable' : 'Create Payable'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
