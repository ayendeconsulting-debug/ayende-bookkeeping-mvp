'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Pencil, Pause, Play, X, RefreshCw, Wand2, Check } from 'lucide-react';
import { RecurringTransaction, Account, RecurringFrequency, RecurringStatus } from '@/types';
import { BusinessDetectionCandidate } from '@/app/(app)/recurring/page';
import {
  createRecurring,
  updateRecurring,
  pauseRecurring,
  resumeRecurring,
  cancelRecurring,
  confirmBusinessDetection,
  dismissBusinessDetection,
} from '@/app/(app)/recurring/actions';
import { AdminOnly } from '@/components/admin-only';
import { toastSuccess, toastError } from '@/lib/toast';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatCurrency } from '@/lib/utils';

interface RecurringManagerProps {
  initialRecurring: RecurringTransaction[];
  accounts: Account[];
  // Phase 12
  initialDetections?: BusinessDetectionCandidate[];
}

interface RecurringFormData {
  description: string;
  amount: string;
  debit_account_id: string;
  credit_account_id: string;
  frequency: RecurringFrequency;
  start_date: string;
  end_date: string;
  notes: string;
}

// Phase 12: confirm dialog state
interface ConfirmDialogState {
  open: boolean;
  candidate: BusinessDetectionCandidate | null;
  debitAccountId: string;
  creditAccountId: string;
}

const EMPTY_FORM: RecurringFormData = {
  description: '',
  amount: '',
  debit_account_id: '',
  credit_account_id: '',
  frequency: 'monthly',
  start_date: new Date().toISOString().split('T')[0],
  end_date: '',
  notes: '',
};

const FREQUENCY_LABELS: Record<string, string> = {
  daily: 'Daily',
  weekly: 'Weekly',
  monthly: 'Monthly',
  quarterly: 'Quarterly',
  annually: 'Annually',
};

const STATUS_BADGE: Record<RecurringStatus, { label: string; variant: 'posted' | 'pending' | 'destructive' | 'secondary' }> = {
  active:    { label: 'Active',    variant: 'posted' },
  paused:    { label: 'Paused',    variant: 'pending' },
  completed: { label: 'Completed', variant: 'secondary' },
  cancelled: { label: 'Cancelled', variant: 'destructive' },
};

function formatDate(dateStr?: string) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-CA', { year: 'numeric', month: 'short', day: 'numeric' });
}

function formatAmount(amount: number, currency = 'CAD') {
  return new Intl.NumberFormat('en-CA', { style: 'currency', currency }).format(amount);
}

export function RecurringManager({
  initialRecurring,
  accounts,
  initialDetections = [],
}: RecurringManagerProps) {
  const router = useRouter();
  const [recurring, setRecurring] = useState<RecurringTransaction[]>(initialRecurring);
  const [detections, setDetections] = useState<BusinessDetectionCandidate[]>(initialDetections);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<RecurringTransaction | null>(null);
  const [form, setForm] = useState<RecurringFormData>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Phase 12: confirm detection dialog state
  const [confirmDialog, setConfirmDialog] = useState<ConfirmDialogState>({
    open: false,
    candidate: null,
    debitAccountId: '',
    creditAccountId: '',
  });
  const [isDetectionPending, startDetectionTransition] = useTransition();

  const accountMap = Object.fromEntries(accounts.map((a) => [a.id, a]));
  const activeAccounts = accounts.filter((a) => a.is_active);

  function openCreate() {
    setEditingItem(null);
    setForm(EMPTY_FORM);
    setError(null);
    setDialogOpen(true);
  }

  function openEdit(item: RecurringTransaction) {
    setEditingItem(item);
    setForm({
      description: item.description,
      amount: String(item.amount),
      debit_account_id: item.debit_account_id,
      credit_account_id: item.credit_account_id,
      frequency: item.frequency,
      start_date: item.start_date?.split('T')[0] ?? '',
      end_date: item.end_date?.split('T')[0] ?? '',
      notes: '',
    });
    setError(null);
    setDialogOpen(true);
  }

  async function handleSave() {
    if (!form.description.trim()) { setError('Description is required.'); return; }
    const amount = parseFloat(form.amount);
    if (isNaN(amount) || amount <= 0) { setError('Amount must be a positive number.'); return; }
    if (!editingItem && (!form.debit_account_id || !form.credit_account_id)) {
      setError('Debit and credit accounts are required.'); return;
    }
    if (!editingItem && !form.start_date) { setError('Start date is required.'); return; }

    setSaving(true); setError(null);

    const result = editingItem
      ? await updateRecurring(editingItem.id, {
          description: form.description,
          amount,
          end_date: form.end_date || undefined,
          notes: form.notes || undefined,
        })
      : await createRecurring({
          description: form.description,
          amount,
          debit_account_id: form.debit_account_id,
          credit_account_id: form.credit_account_id,
          frequency: form.frequency,
          start_date: form.start_date,
          end_date: form.end_date || undefined,
          notes: form.notes || undefined,
        });

    setSaving(false);

    if (!result.success) {
      const msg = result.error ?? 'Operation failed.';
      setError(msg);
      toastError(editingItem ? 'Failed to update' : 'Failed to create', msg);
      return;
    }

    toastSuccess(editingItem ? 'Recurring updated' : 'Recurring created', form.description);
    setDialogOpen(false);
    router.refresh();
  }

  async function handlePause(item: RecurringTransaction) {
    const result = await pauseRecurring(item.id);
    if (result.success) {
      setRecurring((prev) => prev.map((r) => r.id === item.id ? { ...r, status: 'paused' as RecurringStatus } : r));
      toastSuccess('Paused', item.description);
    } else {
      toastError('Failed to pause', result.error ?? 'Please try again.');
    }
  }

  async function handleResume(item: RecurringTransaction) {
    const result = await resumeRecurring(item.id);
    if (result.success) {
      setRecurring((prev) => prev.map((r) => r.id === item.id ? { ...r, status: 'active' as RecurringStatus } : r));
      toastSuccess('Resumed', item.description);
    } else {
      toastError('Failed to resume', result.error ?? 'Please try again.');
    }
  }

  async function handleCancel(item: RecurringTransaction) {
    const result = await cancelRecurring(item.id);
    if (result.success) {
      setRecurring((prev) => prev.map((r) => r.id === item.id ? { ...r, status: 'cancelled' as RecurringStatus } : r));
      toastSuccess('Cancelled', item.description);
    } else {
      toastError('Failed to cancel', result.error ?? 'Please try again.');
    }
  }

  // Phase 12: detection handlers

  function openConfirmDialog(candidate: BusinessDetectionCandidate) {
    setConfirmDialog({ open: true, candidate, debitAccountId: '', creditAccountId: '' });
  }

  function handleConfirmDetection() {
    const { candidate, debitAccountId, creditAccountId } = confirmDialog;
    if (!candidate) return;
    if (!debitAccountId || !creditAccountId) {
      toastError('Please select both debit and credit accounts.');
      return;
    }

    startDetectionTransition(async () => {
      const result = await confirmBusinessDetection({
        key: candidate.key,
        description: candidate.description,
        amount: candidate.averageAmount,
        frequency: candidate.frequency,
        debitAccountId,
        creditAccountId,
      });

      if (result.success) {
        setDetections((prev) => prev.filter((d) => d.key !== candidate.key));
        setConfirmDialog({ open: false, candidate: null, debitAccountId: '', creditAccountId: '' });
        toastSuccess(`"${candidate.description}" added to recurring transactions.`);
        router.refresh();
      } else {
        toastError(result.error ?? 'Failed to confirm detection.');
      }
    });
  }

  function handleDismissDetection(candidate: BusinessDetectionCandidate) {
    // Optimistic removal
    setDetections((prev) => prev.filter((d) => d.key !== candidate.key));
    startDetectionTransition(async () => {
      const result = await dismissBusinessDetection(candidate.key);
      if (!result.success) {
        // Restore on failure
        setDetections((prev) => [...prev, candidate]);
        toastError(result.error ?? 'Failed to dismiss.');
      }
    });
  }

  const activeItems   = recurring.filter((r) => r.status === 'active');
  const inactiveItems = recurring.filter((r) => r.status !== 'active');

  return (
    <div className="p-6 max-w-screen-lg mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Recurring Transactions</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Scheduled journal entries posted automatically on their due date.
          </p>
        </div>
        <AdminOnly>
          <Button onClick={openCreate} className="flex items-center gap-2">
            <Plus className="w-4 h-4" />New Recurring
          </Button>
        </AdminOnly>
      </div>

      <div className="mb-4 bg-blue-50 border border-blue-100 rounded-lg px-4 py-3 text-sm text-blue-700">
        Recurring entries are posted automatically at midnight on their scheduled date. Posting creates a balanced journal entry debiting and crediting the selected accounts.
      </div>

      {/* Phase 12: Detected Patterns panel — shown above Active table when candidates exist */}
      {detections.length > 0 && (
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            <Wand2 className="w-4 h-4 text-primary" />
            <h2 className="text-sm font-semibold text-gray-800">
              Detected Patterns ({detections.length})
            </h2>
            <span className="text-xs text-gray-400">— confirm to create a recurring template, or dismiss to hide</span>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {detections.map((candidate) => (
              <Card key={candidate.key} className="border-primary/20">
                <CardContent className="pt-4 pb-3">
                  <div className="flex items-start justify-between mb-2">
                    <p className="text-sm font-semibold text-gray-900 truncate flex-1 min-w-0 pr-2">
                      {candidate.description}
                    </p>
                    <Badge variant="secondary" className="text-[10px] flex-shrink-0">
                      {FREQUENCY_LABELS[candidate.frequency] ?? candidate.frequency}
                    </Badge>
                  </div>

                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-lg font-bold text-gray-900">
                      {formatCurrency(candidate.averageAmount)}
                    </span>
                    <span className="text-xs text-gray-400">
                      {candidate.occurrences} occurrences detected
                    </span>
                  </div>

                  <p className="text-xs text-gray-400 mb-3">
                    Next estimated:{' '}
                    {new Date(candidate.nextEstimatedDate).toLocaleDateString('en-CA', {
                      month: 'short', day: 'numeric', year: 'numeric',
                    })}
                  </p>

                  <AdminOnly>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => openConfirmDialog(candidate)}
                        disabled={isDetectionPending}
                        className="flex-1 h-7 text-xs bg-primary text-white hover:bg-primary/90"
                      >
                        <Check className="w-3 h-3 mr-1" />Confirm
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDismissDetection(candidate)}
                        disabled={isDetectionPending}
                        className="h-7 text-xs text-gray-500"
                      >
                        <X className="w-3 h-3 mr-1" />Dismiss
                      </Button>
                    </div>
                  </AdminOnly>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">Active</h2>
      <Card className="mb-6">
        <CardContent className="p-0">
          {activeItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <RefreshCw className="w-8 h-8 text-gray-300 mb-3" />
              <p className="text-sm text-gray-400">No active recurring transactions. Click New Recurring to add one.</p>
            </div>
          ) : (
            <RecurringTable
              items={activeItems}
              accountMap={accountMap}
              onEdit={openEdit}
              onPause={handlePause}
              onResume={handleResume}
              onCancel={handleCancel}
            />
          )}
        </CardContent>
      </Card>

      {inactiveItems.length > 0 && (
        <>
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">Paused / Completed / Cancelled</h2>
          <Card>
            <CardContent className="p-0">
              <RecurringTable
                items={inactiveItems}
                accountMap={accountMap}
                onEdit={openEdit}
                onPause={handlePause}
                onResume={handleResume}
                onCancel={handleCancel}
              />
            </CardContent>
          </Card>
        </>
      )}

      {/* New / Edit recurring dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingItem ? 'Edit Recurring Transaction' : 'New Recurring Transaction'}</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-4 mt-2">
            <div className="flex flex-col gap-1.5">
              <Label>Description</Label>
              <Input
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                placeholder="e.g. Office rent, AWS subscription"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <Label>Amount (CAD)</Label>
                <Input
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={form.amount}
                  onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
                  placeholder="0.00"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>Frequency</Label>
                <select
                  value={form.frequency}
                  onChange={(e) => setForm((f) => ({ ...f, frequency: e.target.value as RecurringFrequency }))}
                  disabled={!!editingItem}
                  className="text-sm border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-[#0F6E56] disabled:bg-gray-50"
                >
                  {Object.entries(FREQUENCY_LABELS).map(([val, label]) => (
                    <option key={val} value={val}>{label}</option>
                  ))}
                </select>
              </div>
            </div>

            {!editingItem && (
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <Label>Debit Account</Label>
                  <select
                    value={form.debit_account_id}
                    onChange={(e) => setForm((f) => ({ ...f, debit_account_id: e.target.value }))}
                    className="text-sm border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-[#0F6E56]"
                  >
                    <option value="">Select account…</option>
                    {activeAccounts.map((a) => (
                      <option key={a.id} value={a.id}>{a.account_code} — {a.account_name}</option>
                    ))}
                  </select>
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label>Credit Account</Label>
                  <select
                    value={form.credit_account_id}
                    onChange={(e) => setForm((f) => ({ ...f, credit_account_id: e.target.value }))}
                    className="text-sm border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-[#0F6E56]"
                  >
                    <option value="">Select account…</option>
                    {activeAccounts.map((a) => (
                      <option key={a.id} value={a.id}>{a.account_code} — {a.account_name}</option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <Label>Start Date</Label>
                <Input
                  type="date"
                  value={form.start_date}
                  onChange={(e) => setForm((f) => ({ ...f, start_date: e.target.value }))}
                  disabled={!!editingItem}
                  className="disabled:bg-gray-50"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>End Date <span className="text-gray-400 font-normal">(optional)</span></Label>
                <Input
                  type="date"
                  value={form.end_date}
                  onChange={(e) => setForm((f) => ({ ...f, end_date: e.target.value }))}
                />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label>Notes <span className="text-gray-400 font-normal">(optional)</span></Label>
              <Input
                value={form.notes}
                onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                placeholder="Internal note"
              />
            </div>

            {error && <p className="text-sm text-red-500">{error}</p>}

            <div className="flex justify-end gap-2 mt-2">
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleSave} disabled={saving}>
                {saving ? 'Saving…' : editingItem ? 'Save Changes' : 'Create'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Phase 12: Confirm detection dialog — account selection */}
      <Dialog
        open={confirmDialog.open}
        onOpenChange={(open) =>
          setConfirmDialog((s) => ({ ...s, open, ...(open ? {} : { candidate: null, debitAccountId: '', creditAccountId: '' }) }))
        }
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Confirm Recurring Pattern</DialogTitle>
          </DialogHeader>
          {confirmDialog.candidate && (
            <div className="flex flex-col gap-4 mt-2">
              <div className="bg-gray-50 rounded-lg px-4 py-3 text-sm">
                <p className="font-semibold text-gray-900">{confirmDialog.candidate.description}</p>
                <p className="text-gray-500 mt-0.5">
                  {formatCurrency(confirmDialog.candidate.averageAmount)} ·{' '}
                  {FREQUENCY_LABELS[confirmDialog.candidate.frequency] ?? confirmDialog.candidate.frequency}
                </p>
              </div>

              <p className="text-sm text-gray-600">
                Select the accounts to use for this recurring journal entry:
              </p>

              <div className="flex flex-col gap-1.5">
                <Label>Debit Account <span className="text-gray-400 font-normal">(expense / asset)</span></Label>
                <select
                  value={confirmDialog.debitAccountId}
                  onChange={(e) =>
                    setConfirmDialog((s) => ({ ...s, debitAccountId: e.target.value }))
                  }
                  className="text-sm border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-[#0F6E56]"
                >
                  <option value="">Select account…</option>
                  {activeAccounts.map((a) => (
                    <option key={a.id} value={a.id}>{a.account_code} — {a.account_name}</option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <Label>Credit Account <span className="text-gray-400 font-normal">(bank / liability)</span></Label>
                <select
                  value={confirmDialog.creditAccountId}
                  onChange={(e) =>
                    setConfirmDialog((s) => ({ ...s, creditAccountId: e.target.value }))
                  }
                  className="text-sm border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-[#0F6E56]"
                >
                  <option value="">Select account…</option>
                  {activeAccounts.map((a) => (
                    <option key={a.id} value={a.id}>{a.account_code} — {a.account_name}</option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end gap-2 mt-2">
                <Button
                  variant="outline"
                  onClick={() =>
                    setConfirmDialog({ open: false, candidate: null, debitAccountId: '', creditAccountId: '' })
                  }
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleConfirmDetection}
                  disabled={isDetectionPending || !confirmDialog.debitAccountId || !confirmDialog.creditAccountId}
                >
                  {isDetectionPending ? 'Creating…' : 'Create Recurring'}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function RecurringTable({
  items, accountMap, onEdit, onPause, onResume, onCancel,
}: {
  items: RecurringTransaction[];
  accountMap: Record<string, Account>;
  onEdit: (item: RecurringTransaction) => void;
  onPause: (item: RecurringTransaction) => void;
  onResume: (item: RecurringTransaction) => void;
  onCancel: (item: RecurringTransaction) => void;
}) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Description</TableHead>
          <TableHead>Amount</TableHead>
          <TableHead>Frequency</TableHead>
          <TableHead>Debit → Credit</TableHead>
          <TableHead>Next Run</TableHead>
          <TableHead>Status</TableHead>
          <TableHead className="w-28" />
        </TableRow>
      </TableHeader>
      <TableBody>
        {items.map((item) => {
          const debit  = accountMap[item.debit_account_id];
          const credit = accountMap[item.credit_account_id];
          const badge  = STATUS_BADGE[item.status] ?? { label: item.status, variant: 'secondary' as const };
          const isEditable = item.status !== 'cancelled' && item.status !== 'completed';

          return (
            <TableRow key={item.id}>
              <TableCell className="font-medium">{item.description}</TableCell>
              <TableCell className="font-mono text-sm">{formatAmount(item.amount, item.currency_code)}</TableCell>
              <TableCell><Badge variant="secondary">{FREQUENCY_LABELS[item.frequency]}</Badge></TableCell>
              <TableCell className="text-sm text-gray-600">
                <span className="text-gray-400">{debit?.account_code ?? '?'}</span>
                {' '}{debit?.account_name ?? 'Unknown'}
                <span className="mx-1.5 text-gray-300">→</span>
                <span className="text-gray-400">{credit?.account_code ?? '?'}</span>
                {' '}{credit?.account_name ?? 'Unknown'}
              </TableCell>
              <TableCell className="text-sm text-gray-500">{formatDate(item.next_run_date)}</TableCell>
              <TableCell><Badge variant={badge.variant}>{badge.label}</Badge></TableCell>
              <TableCell>
                <div className="flex items-center gap-1">
                  {isEditable && (
                    <AdminOnly>
                      <Button variant="ghost" size="sm" onClick={() => onEdit(item)} className="text-gray-400 hover:text-gray-600">
                        <Pencil className="w-3.5 h-3.5" />
                      </Button>
                    </AdminOnly>
                  )}
                  {item.status === 'active' && (
                    <AdminOnly>
                      <Button variant="ghost" size="sm" onClick={() => onPause(item)} className="text-gray-400 hover:text-yellow-600" title="Pause">
                        <Pause className="w-3.5 h-3.5" />
                      </Button>
                    </AdminOnly>
                  )}
                  {item.status === 'paused' && (
                    <AdminOnly>
                      <Button variant="ghost" size="sm" onClick={() => onResume(item)} className="text-gray-400 hover:text-green-600" title="Resume">
                        <Play className="w-3.5 h-3.5" />
                      </Button>
                    </AdminOnly>
                  )}
                  {isEditable && (
                    <AdminOnly>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="sm" className="text-gray-400 hover:text-red-500" title="Cancel">
                            <X className="w-3.5 h-3.5" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Cancel recurring transaction?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This will stop future postings for <strong>{item.description}</strong>. Past journal entries are not affected.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Keep</AlertDialogCancel>
                            <AlertDialogAction onClick={() => onCancel(item)} className="bg-red-500 hover:bg-red-600 text-white">
                              Cancel Recurring
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </AdminOnly>
                  )}
                </div>
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
