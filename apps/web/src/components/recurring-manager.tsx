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
import { formatCurrency, cn } from '@/lib/utils';

interface RecurringManagerProps {
  initialRecurring: RecurringTransaction[];
  accounts: Account[];
  initialDetections?: BusinessDetectionCandidate[];
  isFreelancerMode?: boolean;
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
  usageType: 'business' | 'personal' | 'split';
  businessPct: number;
}

interface ConfirmDialogState {
  open: boolean;
  candidate: BusinessDetectionCandidate | null;
  debitAccountId: string;
  creditAccountId: string;
  usageType: 'business' | 'personal' | 'split';
  businessPct: number;
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
  usageType: 'business',
  businessPct: 100,
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
  if (!dateStr) return '–';
  return new Date(dateStr).toLocaleDateString('en-CA', { year: 'numeric', month: 'short', day: 'numeric' });
}

function formatAmount(amount: number, currency = 'CAD') {
  return new Intl.NumberFormat('en-CA', { style: 'currency', currency }).format(amount);
}

/** Usage type segmented control — shown only in Freelancer mode */
function UsageTypeToggle({
  value,
  onChange,
}: {
  value: 'business' | 'personal' | 'split';
  onChange: (v: 'business' | 'personal' | 'split') => void;
}) {
  const options: { value: 'business' | 'personal' | 'split'; label: string }[] = [
    { value: 'business', label: 'Business' },
    { value: 'personal', label: 'Personal' },
    { value: 'split',    label: 'Split' },
  ];
  return (
    <div className="flex rounded-lg border border-border overflow-hidden text-sm">
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          className={cn(
            'flex-1 py-1.5 px-3 text-xs font-medium transition-colors',
            value === opt.value
              ? 'bg-primary text-primary-foreground'
              : 'bg-card text-muted-foreground hover:bg-muted',
          )}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

/** Business % slider + live preview — shown when usageType === 'split' */
function SplitPreview({
  businessPct,
  onChange,
  amount,
  debitAccountName,
}: {
  businessPct: number;
  onChange: (v: number) => void;
  amount: number;
  debitAccountName?: string;
}) {
  const personalPct = 100 - businessPct;
  const businessAmt = amount > 0 ? parseFloat((amount * businessPct / 100).toFixed(2)) : 0;
  const personalAmt = amount > 0 ? parseFloat((amount - businessAmt).toFixed(2)) : 0;

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <Label>Business %</Label>
        <span className="text-sm font-semibold text-primary">{businessPct}% business · {personalPct}% personal</span>
      </div>
      <input
        type="range" min={1} max={99} value={businessPct}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-primary"
      />
      {amount > 0 && (
        <div className="rounded-lg bg-muted px-4 py-3 text-xs space-y-1">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Business → {debitAccountName ?? 'Expense Account'}</span>
            <span className="font-semibold text-primary">{formatCurrency(businessAmt)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Personal → Owner Draw</span>
            <span className="font-semibold text-foreground">{formatCurrency(personalAmt)}</span>
          </div>
          <div className="flex justify-between border-t border-border pt-1 mt-1">
            <span className="text-muted-foreground">Bank (credit)</span>
            <span className="font-semibold text-foreground">−{formatCurrency(amount)}</span>
          </div>
        </div>
      )}
    </div>
  );
}

export function RecurringManager({
  initialRecurring,
  accounts,
  initialDetections = [],
  isFreelancerMode = false,
}: RecurringManagerProps) {
  const router = useRouter();
  const [recurring, setRecurring] = useState<RecurringTransaction[]>(initialRecurring);
  const [detections, setDetections] = useState<BusinessDetectionCandidate[]>(initialDetections);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<RecurringTransaction | null>(null);
  const [form, setForm] = useState<RecurringFormData>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [confirmDialog, setConfirmDialog] = useState<ConfirmDialogState>({
    open: false,
    candidate: null,
    debitAccountId: '',
    creditAccountId: '',
    usageType: 'business',
    businessPct: 100,
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
    const ratio = Number((item as any).business_ratio ?? 1.0);
    const isPersonal = (item as any).is_personal ?? false;
    const usageType: 'business' | 'personal' | 'split' =
      isPersonal || ratio <= 0 ? 'personal' :
      ratio < 1.0 ? 'split' : 'business';

    setForm({
      description: item.description,
      amount: String(item.amount),
      debit_account_id: item.debit_account_id,
      credit_account_id: item.credit_account_id,
      frequency: item.frequency,
      start_date: item.start_date?.split('T')[0] ?? '',
      end_date: item.end_date?.split('T')[0] ?? '',
      notes: '',
      usageType,
      businessPct: Math.round(ratio * 100),
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

    const isPersonal = form.usageType === 'personal';
    const businessRatio = form.usageType === 'personal' ? 0.0
      : form.usageType === 'split' ? parseFloat((form.businessPct / 100).toFixed(4))
      : 1.0;

    setSaving(true); setError(null);

    const result = editingItem
      ? await updateRecurring(editingItem.id, {
          description: form.description,
          amount,
          end_date: form.end_date || undefined,
          is_personal: isPersonal,
          business_ratio: businessRatio,
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
          is_personal: isPersonal,
          business_ratio: businessRatio,
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

  function openConfirmDialog(candidate: BusinessDetectionCandidate) {
    setConfirmDialog({
      open: true,
      candidate,
      debitAccountId: '',
      creditAccountId: '',
      usageType: 'business',
      businessPct: 100,
    });
  }

  function handleConfirmDetection() {
    const { candidate, debitAccountId, creditAccountId, usageType, businessPct } = confirmDialog;
    if (!candidate) return;

    const isPersonal = usageType === 'personal';
    const needsAccounts = usageType !== 'personal';
    if (needsAccounts && (!debitAccountId || !creditAccountId)) {
      toastError('Please select both debit and credit accounts.');
      return;
    }

    const businessRatio = isPersonal ? 0.0
      : usageType === 'split' ? parseFloat((businessPct / 100).toFixed(4))
      : 1.0;

    startDetectionTransition(async () => {
      const result = await confirmBusinessDetection({
        key: candidate.key,
        description: candidate.description,
        amount: candidate.averageAmount,
        frequency: candidate.frequency,
        debitAccountId: isPersonal ? '' : debitAccountId,
        creditAccountId: isPersonal ? '' : creditAccountId,
        isPersonal,
        businessRatio,
      });

      if (result.success) {
        setDetections((prev) => prev.filter((d) => d.key !== candidate.key));
        setConfirmDialog({ open: false, candidate: null, debitAccountId: '', creditAccountId: '', usageType: 'business', businessPct: 100 });
        toastSuccess(`"${candidate.description}" added to recurring transactions.`);
        router.refresh();
      } else {
        toastError(result.error ?? 'Failed to confirm detection.');
      }
    });
  }

  function handleDismissDetection(candidate: BusinessDetectionCandidate) {
    setDetections((prev) => prev.filter((d) => d.key !== candidate.key));
    startDetectionTransition(async () => {
      const result = await dismissBusinessDetection(candidate.key);
      if (!result.success) {
        setDetections((prev) => [...prev, candidate]);
        toastError(result.error ?? 'Failed to dismiss.');
      }
    });
  }

  const activeItems   = recurring.filter((r) => r.status === 'active');
  const inactiveItems = recurring.filter((r) => r.status !== 'active');

  const selectClass = 'w-full text-sm border border-input rounded-lg px-3 py-2 bg-card text-foreground outline-none focus:border-primary focus:ring-1 focus:ring-primary disabled:bg-muted disabled:opacity-60';

  const confirmDebitAccount = accountMap[confirmDialog.debitAccountId];

  return (
    <div className="p-6 max-w-screen-lg mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Recurring Transactions</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Scheduled journal entries posted automatically on their due date.
          </p>
        </div>
        <AdminOnly>
          <Button onClick={openCreate} className="flex items-center gap-2">
            <Plus className="w-4 h-4" />New Recurring
          </Button>
        </AdminOnly>
      </div>

      <div className="mb-4 bg-info-light border border-info/20 rounded-lg px-4 py-3 text-sm text-info dark:bg-blue-900/20 dark:border-blue-800/30 dark:text-blue-300">
        Recurring entries are posted automatically at midnight on their scheduled date. Posting creates a balanced journal entry debiting and crediting the selected accounts.
      </div>

      {/* Detected Patterns panel */}
      {detections.length > 0 && (
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            <Wand2 className="w-4 h-4 text-primary" />
            <h2 className="text-sm font-semibold text-foreground">
              Detected Patterns ({detections.length})
            </h2>
            <span className="text-xs text-muted-foreground">– confirm to create a recurring template, or dismiss to hide</span>
          </div>
          <Card>
            <CardContent className="p-0">
              <div className="divide-y divide-border">
                {detections.map((candidate) => (
                  <div key={candidate.key} className="flex items-center gap-3 px-4 py-3.5">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-bold text-foreground truncate">
                          {candidate.description}
                        </p>
                        <Badge variant="secondary" className="text-[10px] flex-shrink-0">
                          {FREQUENCY_LABELS[candidate.frequency] ?? candidate.frequency}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {candidate.occurrences} occurrences · Next:{' '}
                        {new Date(candidate.nextEstimatedDate).toLocaleDateString('en-CA', {
                          month: 'short', day: 'numeric', year: 'numeric',
                        })}
                      </p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-sm font-bold text-foreground">
                        {formatCurrency(candidate.averageAmount)}
                      </p>
                    </div>
                    <AdminOnly>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <Button
                          size="sm"
                          onClick={() => openConfirmDialog(candidate)}
                          disabled={isDetectionPending}
                          className="h-7 px-3 text-xs"
                        >
                          <Check className="w-3 h-3 mr-1" />Confirm
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDismissDetection(candidate)}
                          disabled={isDetectionPending}
                          className="h-7 px-3 text-xs"
                        >
                          <X className="w-3 h-3 mr-1" />Dismiss
                        </Button>
                      </div>
                    </AdminOnly>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-2">Active</h2>
      <Card className="mb-6">
        <CardContent className="p-0">
          {activeItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <RefreshCw className="w-8 h-8 text-muted-foreground/30 mb-3" />
              <p className="text-sm text-muted-foreground">No active recurring transactions. Click New Recurring to add one.</p>
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
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-2">Paused / Completed / Cancelled</h2>
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
                  type="number" min="0.01" step="0.01"
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
                  className={selectClass}
                >
                  {Object.entries(FREQUENCY_LABELS).map(([val, label]) => (
                    <option key={val} value={val}>{label}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Usage type — Freelancer mode only */}
            {isFreelancerMode && (
              <div className="flex flex-col gap-1.5">
                <Label>Usage Type</Label>
                <UsageTypeToggle
                  value={form.usageType}
                  onChange={(v) => setForm((f) => ({ ...f, usageType: v, businessPct: v === 'personal' ? 0 : v === 'business' ? 100 : f.businessPct === 100 || f.businessPct === 0 ? 70 : f.businessPct }))}
                />
              </div>
            )}

            {/* Account pickers — hidden when fully personal */}
            {form.usageType !== 'personal' && !editingItem && (
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <Label>Debit Account</Label>
                  <select
                    value={form.debit_account_id}
                    onChange={(e) => setForm((f) => ({ ...f, debit_account_id: e.target.value }))}
                    className={selectClass}
                  >
                    <option value="">Select account…</option>
                    {activeAccounts.map((a) => (
                      <option key={a.id} value={a.id}>{a.account_code} – {a.account_name}</option>
                    ))}
                  </select>
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label>Credit Account</Label>
                  <select
                    value={form.credit_account_id}
                    onChange={(e) => setForm((f) => ({ ...f, credit_account_id: e.target.value }))}
                    className={selectClass}
                  >
                    <option value="">Select account…</option>
                    {activeAccounts.map((a) => (
                      <option key={a.id} value={a.id}>{a.account_code} – {a.account_name}</option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            {/* Personal-only info banner */}
            {isFreelancerMode && form.usageType === 'personal' && (
              <div className="rounded-lg bg-muted px-4 py-3 text-xs text-muted-foreground">
                Personal recurring items are tracked for awareness only — no journal entry is posted to the business ledger.
              </div>
            )}

            {/* Split slider + preview */}
            {isFreelancerMode && form.usageType === 'split' && (
              <SplitPreview
                businessPct={form.businessPct}
                onChange={(v) => setForm((f) => ({ ...f, businessPct: v }))}
                amount={parseFloat(form.amount) || 0}
                debitAccountName={accountMap[form.debit_account_id]?.account_name}
              />
            )}

            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <Label>Start Date</Label>
                <Input
                  type="date" value={form.start_date}
                  onChange={(e) => setForm((f) => ({ ...f, start_date: e.target.value }))}
                  disabled={!!editingItem}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>End Date <span className="text-muted-foreground font-normal">(optional)</span></Label>
                <Input
                  type="date" value={form.end_date}
                  onChange={(e) => setForm((f) => ({ ...f, end_date: e.target.value }))}
                />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label>Notes <span className="text-muted-foreground font-normal">(optional)</span></Label>
              <Input
                value={form.notes}
                onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                placeholder="Internal note"
              />
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}

            <div className="flex justify-end gap-2 mt-2">
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleSave} disabled={saving}>
                {saving ? 'Saving…' : editingItem ? 'Save Changes' : 'Create'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Confirm detection dialog */}
      <Dialog
        open={confirmDialog.open}
        onOpenChange={(open) =>
          setConfirmDialog((s) => ({ ...s, open, ...(open ? {} : { candidate: null, debitAccountId: '', creditAccountId: '', usageType: 'business', businessPct: 100 }) }))
        }
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Confirm Recurring Pattern</DialogTitle>
          </DialogHeader>
          {confirmDialog.candidate && (
            <div className="flex flex-col gap-4 mt-2">
              <div className="bg-muted rounded-lg px-4 py-3 text-sm">
                <p className="font-semibold text-foreground">{confirmDialog.candidate.description}</p>
                <p className="text-muted-foreground mt-0.5">
                  {formatCurrency(confirmDialog.candidate.averageAmount)} ·{' '}
                  {FREQUENCY_LABELS[confirmDialog.candidate.frequency] ?? confirmDialog.candidate.frequency}
                </p>
              </div>

              {/* Usage type toggle — Freelancer mode only */}
              {isFreelancerMode && (
                <div className="flex flex-col gap-1.5">
                  <Label>Usage Type</Label>
                  <UsageTypeToggle
                    value={confirmDialog.usageType}
                    onChange={(v) => setConfirmDialog((s) => ({
                      ...s,
                      usageType: v,
                      businessPct: v === 'personal' ? 0 : v === 'business' ? 100 : s.businessPct === 100 || s.businessPct === 0 ? 70 : s.businessPct,
                    }))}
                  />
                </div>
              )}

              {/* Account pickers — hidden when personal */}
              {confirmDialog.usageType !== 'personal' && (
                <>
                  <p className="text-sm text-muted-foreground">
                    Select the accounts to use for this recurring journal entry:
                  </p>
                  <div className="flex flex-col gap-1.5">
                    <Label>Debit Account <span className="text-muted-foreground font-normal">(expense / asset)</span></Label>
                    <select
                      value={confirmDialog.debitAccountId}
                      onChange={(e) => setConfirmDialog((s) => ({ ...s, debitAccountId: e.target.value }))}
                      className={selectClass}
                    >
                      <option value="">Select account…</option>
                      {activeAccounts.map((a) => (
                        <option key={a.id} value={a.id}>{a.account_code} – {a.account_name}</option>
                      ))}
                    </select>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <Label>Credit Account <span className="text-muted-foreground font-normal">(bank / liability)</span></Label>
                    <select
                      value={confirmDialog.creditAccountId}
                      onChange={(e) => setConfirmDialog((s) => ({ ...s, creditAccountId: e.target.value }))}
                      className={selectClass}
                    >
                      <option value="">Select account…</option>
                      {activeAccounts.map((a) => (
                        <option key={a.id} value={a.id}>{a.account_code} – {a.account_name}</option>
                      ))}
                    </select>
                  </div>
                </>
              )}

              {/* Personal-only banner */}
              {isFreelancerMode && confirmDialog.usageType === 'personal' && (
                <div className="rounded-lg bg-muted px-4 py-3 text-xs text-muted-foreground">
                  Personal recurring items are tracked for awareness only — no journal entry is posted to the business ledger.
                </div>
              )}

              {/* Split slider + preview */}
              {isFreelancerMode && confirmDialog.usageType === 'split' && (
                <SplitPreview
                  businessPct={confirmDialog.businessPct}
                  onChange={(v) => setConfirmDialog((s) => ({ ...s, businessPct: v }))}
                  amount={confirmDialog.candidate.averageAmount}
                  debitAccountName={confirmDebitAccount?.account_name}
                />
              )}

              <div className="flex justify-end gap-2 mt-2">
                <Button
                  variant="outline"
                  onClick={() => setConfirmDialog({ open: false, candidate: null, debitAccountId: '', creditAccountId: '', usageType: 'business', businessPct: 100 })}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleConfirmDetection}
                  disabled={
                    isDetectionPending ||
                    (confirmDialog.usageType !== 'personal' && (!confirmDialog.debitAccountId || !confirmDialog.creditAccountId))
                  }
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
          const ratio = Number((item as any).business_ratio ?? 1.0);
          const isPersonal = (item as any).is_personal ?? false;
          const isSplit = !isPersonal && ratio > 0 && ratio < 1.0;

          return (
            <TableRow key={item.id}>
              <TableCell className="font-medium">
                <div className="flex items-center gap-2">
                  {item.description}
                  {isPersonal && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground font-medium">Personal</span>
                  )}
                  {isSplit && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400 font-medium">
                      {Math.round(ratio * 100)}% biz
                    </span>
                  )}
                </div>
              </TableCell>
              <TableCell className="font-mono text-sm">{formatAmount(item.amount, item.currency_code)}</TableCell>
              <TableCell><Badge variant="secondary">{FREQUENCY_LABELS[item.frequency]}</Badge></TableCell>
              <TableCell className="text-sm text-foreground">
                {isPersonal ? (
                  <span className="text-muted-foreground text-xs">Personal only</span>
                ) : (
                  <>
                    <span className="text-muted-foreground">{debit?.account_code ?? '?'}</span>
                    {' '}{debit?.account_name ?? 'Unknown'}
                    <span className="mx-1.5 text-border">→</span>
                    <span className="text-muted-foreground">{credit?.account_code ?? '?'}</span>
                    {' '}{credit?.account_name ?? 'Unknown'}
                  </>
                )}
              </TableCell>
              <TableCell className="text-sm text-muted-foreground">{formatDate(item.next_run_date)}</TableCell>
              <TableCell><Badge variant={badge.variant}>{badge.label}</Badge></TableCell>
              <TableCell>
                <div className="flex items-center gap-1">
                  {isEditable && (
                    <AdminOnly>
                      <Button variant="ghost" size="sm" onClick={() => onEdit(item)} className="text-muted-foreground hover:text-foreground">
                        <Pencil className="w-3.5 h-3.5" />
                      </Button>
                    </AdminOnly>
                  )}
                  {item.status === 'active' && (
                    <AdminOnly>
                      <Button variant="ghost" size="sm" onClick={() => onPause(item)} className="text-muted-foreground hover:text-amber-500" title="Pause">
                        <Pause className="w-3.5 h-3.5" />
                      </Button>
                    </AdminOnly>
                  )}
                  {item.status === 'paused' && (
                    <AdminOnly>
                      <Button variant="ghost" size="sm" onClick={() => onResume(item)} className="text-muted-foreground hover:text-primary" title="Resume">
                        <Play className="w-3.5 h-3.5" />
                      </Button>
                    </AdminOnly>
                  )}
                  {isEditable && (
                    <AdminOnly>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-destructive" title="Cancel">
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
                            <AlertDialogAction onClick={() => onCancel(item)} className="bg-destructive hover:bg-destructive/90 text-destructive-foreground">
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
