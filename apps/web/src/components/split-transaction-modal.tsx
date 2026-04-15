'use client';

import { useState, useTransition } from 'react';
import { X, Plus, Trash2, AlertCircle, CheckCircle2, Building2, User, DollarSign, Percent } from 'lucide-react';
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
  value: string;   // dollar amount OR percentage string depending on inputMode
  is_personal: boolean;
}

type InputMode = 'dollar' | 'percent';

interface SplitTransactionModalProps {
  transaction: RawTransaction | null;
  accounts: Account[];
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  isFreelancerMode?: boolean;
}

function newLine(isPersonal = false): SplitLine {
  return { id: crypto.randomUUID(), account_id: '', description: '', value: '', is_personal: isPersonal };
}

const selectCls = 'h-9 rounded-md border border-input px-2 text-sm bg-card text-foreground focus:outline-none focus:ring-1 focus:ring-primary w-full';

/** Source type toggle */
function SourceTypeToggle({
  value,
  onChange,
}: {
  value: 'business' | 'personal';
  onChange: (v: 'business' | 'personal') => void;
}) {
  return (
    <div className="flex rounded-lg border border-border overflow-hidden">
      <button
        type="button"
        onClick={() => onChange('business')}
        className={cn(
          'flex-1 py-1.5 px-3 text-xs font-medium transition-colors flex items-center justify-center gap-1.5',
          value === 'business'
            ? 'bg-primary text-primary-foreground'
            : 'bg-card text-muted-foreground hover:bg-muted',
        )}
      >
        <Building2 className="w-3 h-3" />Business Account
      </button>
      <button
        type="button"
        onClick={() => onChange('personal')}
        className={cn(
          'flex-1 py-1.5 px-3 text-xs font-medium transition-colors flex items-center justify-center gap-1.5',
          value === 'personal'
            ? 'bg-primary text-primary-foreground'
            : 'bg-card text-muted-foreground hover:bg-muted',
        )}
      >
        <User className="w-3 h-3" />Personal Account
      </button>
    </div>
  );
}

/** $ / % input mode toggle */
function InputModeToggle({
  value,
  onChange,
}: {
  value: InputMode;
  onChange: (v: InputMode) => void;
}) {
  return (
    <div className="flex rounded-md border border-border overflow-hidden h-7">
      <button
        type="button"
        onClick={() => onChange('dollar')}
        className={cn(
          'px-2.5 text-xs font-semibold transition-colors flex items-center gap-1',
          value === 'dollar'
            ? 'bg-primary text-primary-foreground'
            : 'bg-card text-muted-foreground hover:bg-muted',
        )}
      >
        <DollarSign className="w-3 h-3" />$
      </button>
      <button
        type="button"
        onClick={() => onChange('percent')}
        className={cn(
          'px-2.5 text-xs font-semibold transition-colors flex items-center gap-1',
          value === 'percent'
            ? 'bg-primary text-primary-foreground'
            : 'bg-card text-muted-foreground hover:bg-muted',
        )}
      >
        <Percent className="w-3 h-3" />%
      </button>
    </div>
  );
}

export function SplitTransactionModal({
  transaction,
  accounts,
  open,
  onClose,
  onSuccess,
  isFreelancerMode = false,
}: SplitTransactionModalProps) {
  const [isPending, startTransition] = useTransition();
  const [sourceAccountId, setSourceAccountId] = useState('');
  const [sourceType, setSourceType] = useState<'business' | 'personal'>('business');
  const [personalAccountLabel, setPersonalAccountLabel] = useState('');
  const [inputMode, setInputMode] = useState<InputMode>('dollar');
  const [lines, setLines] = useState<SplitLine[]>([newLine(), newLine()]);
  const [error, setError] = useState('');

  if (!open || !transaction) return null;

  const rawAmount = Math.abs(Number(transaction.amount));
  const activeAccounts = accounts.filter((a) => a.is_active);

  // ── Compute allocated / remaining based on input mode ──────────────────────
  function lineAmount(line: SplitLine): number {
    const v = parseFloat(line.value);
    if (isNaN(v) || v <= 0) return 0;
    if (inputMode === 'percent') return parseFloat((rawAmount * v / 100).toFixed(2));
    return v;
  }

  const allocated = lines.reduce((sum, l) => sum + lineAmount(l), 0);
  const remaining = parseFloat((rawAmount - allocated).toFixed(2));
  const isBalanced = Math.abs(remaining) < 0.01;

  // In percent mode also check total % = 100
  const totalPct = inputMode === 'percent'
    ? lines.reduce((sum, l) => sum + (parseFloat(l.value) || 0), 0)
    : null;
  const pctBalanced = totalPct !== null ? Math.abs(totalPct - 100) < 0.01 : true;

  const businessLines = lines.filter((l) => !l.is_personal);
  const personalLines = lines.filter((l) => l.is_personal);
  const businessTotal = businessLines.reduce((s, l) => s + lineAmount(l), 0);
  const personalTotal = personalLines.reduce((s, l) => s + lineAmount(l), 0);

  const canSubmit = isBalanced && pctBalanced
    && lines.length >= 2
    && businessLines.length >= 1
    && businessLines.every((l) => l.account_id !== '' && lineAmount(l) > 0)
    && (sourceType === 'personal' || sourceAccountId !== '');

  function handleAddLine(isPersonal = false) {
    setLines((prev) => [...prev, newLine(isPersonal)]);
  }

  function handleRemoveLine(id: string) {
    if (lines.length <= 2) return;
    setLines((prev) => prev.filter((l) => l.id !== id));
  }

  function handleLineChange(id: string, field: keyof SplitLine, value: string | boolean) {
    setLines((prev) => prev.map((l) => (l.id === id ? { ...l, [field]: value } : l)));
  }

  function handleSourceTypeChange(v: 'business' | 'personal') {
    setSourceType(v);
    if (v === 'business') {
      setLines((prev) => prev.map((l) => ({ ...l, is_personal: false })));
    }
  }

  function handleInputModeChange(mode: InputMode) {
    // Convert existing values between modes
    setLines((prev) => prev.map((l) => {
      const v = parseFloat(l.value);
      if (isNaN(v) || v <= 0) return { ...l, value: '' };
      if (mode === 'percent' && inputMode === 'dollar') {
        // dollar → percent
        const pct = rawAmount > 0 ? parseFloat((v / rawAmount * 100).toFixed(2)) : 0;
        return { ...l, value: String(pct) };
      } else if (mode === 'dollar' && inputMode === 'percent') {
        // percent → dollar
        const amt = parseFloat((rawAmount * v / 100).toFixed(2));
        return { ...l, value: String(amt) };
      }
      return l;
    }));
    setInputMode(mode);
  }

  function handleClose() {
    setLines([newLine(), newLine()]);
    setSourceAccountId('');
    setSourceType('business');
    setPersonalAccountLabel('');
    setInputMode('dollar');
    setError('');
    onClose();
  }

  function handleSubmit() {
    setError('');
    if (!transaction) return;
    if (sourceType === 'business' && !sourceAccountId) {
      setError('Please select a source account.');
      return;
    }
    if (!isBalanced || !pctBalanced) {
      setError(
        inputMode === 'percent'
          ? `Percentages must add up to 100% (currently ${totalPct?.toFixed(2)}%).`
          : `Split amounts must equal ${formatCurrency(rawAmount)}.`,
      );
      return;
    }
    if (businessLines.length === 0) {
      setError('At least one line must be tagged as Business.');
      return;
    }

    const splits = lines.map((l) => ({
      account_id: l.account_id || 'personal',
      amount: lineAmount(l),
      description: l.description || undefined,
      is_personal: l.is_personal,
    }));

    startTransition(async () => {
      const result = await splitTransaction(transaction.id, {
        source_account_id: sourceAccountId || '',
        source_type: isFreelancerMode ? sourceType : 'business',
        personal_account_label: personalAccountLabel || undefined,
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

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4 bg-black/60">
      <div className="bg-card sm:rounded-xl rounded-t-xl shadow-2xl w-full sm:max-w-2xl flex flex-col max-h-[95vh] sm:max-h-[90vh] border border-border">

        {/* Header */}
        <div className="flex items-start justify-between px-6 py-4 border-b border-border">
          <div>
            <h2 className="text-base font-semibold text-foreground">Split Transaction</h2>
            <p className="text-sm text-muted-foreground mt-0.5 truncate max-w-sm">{transaction.description}</p>
          </div>
          <div className="flex items-center gap-3 ml-4 flex-shrink-0">
            <span className="text-sm font-semibold text-foreground">{formatCurrency(rawAmount)}</span>
            <button onClick={handleClose} className="text-muted-foreground hover:text-foreground transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-5">

          {/* Source type toggle — Freelancer mode only */}
          {isFreelancerMode && (
            <div>
              <label className="block text-xs font-medium text-foreground mb-1.5">
                Source Account Type
              </label>
              <SourceTypeToggle value={sourceType} onChange={handleSourceTypeChange} />
              {sourceType === 'personal' && (
                <div className="mt-2 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 px-3 py-2 text-xs text-amber-700 dark:text-amber-400">
                  Personal source: only Business-tagged lines post to the ledger as Owner Contributions. Personal-tagged lines are for your reference only.
                </div>
              )}
            </div>
          )}

          {/* Source account — business source only */}
          {sourceType === 'business' && (
            <div>
              <label className="block text-xs font-medium text-foreground mb-1.5">
                Source Account <span className="text-destructive">*</span>
              </label>
              <select value={sourceAccountId} onChange={(e) => setSourceAccountId(e.target.value)} className={selectCls}>
                <option value="">Select bank / credit card account…</option>
                {activeAccounts.filter((a) => a.account_type === 'asset' || a.account_type === 'liability').map((a) => (
                  <option key={a.id} value={a.id}>{a.account_code} – {a.account_name}</option>
                ))}
              </select>
            </div>
          )}

          {/* Personal account label */}
          {isFreelancerMode && sourceType === 'personal' && (
            <div>
              <label className="block text-xs font-medium text-foreground mb-1.5">
                Personal Account Name <span className="text-muted-foreground font-normal">(for reference)</span>
              </label>
              <Input
                value={personalAccountLabel}
                onChange={(e) => setPersonalAccountLabel(e.target.value)}
                placeholder="e.g. Personal chequing, Personal Visa"
                className="h-9 text-sm"
              />
            </div>
          )}

          {/* Split lines */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-medium text-foreground">Split Lines</label>
              <div className="flex items-center gap-3">
                <span className="text-xs text-muted-foreground">{lines.length} lines</span>
                <InputModeToggle value={inputMode} onChange={handleInputModeChange} />
              </div>
            </div>

            <div className="space-y-2">
              {/* Column headers */}
              <div className={cn(
                'px-1',
                isFreelancerMode
                  ? 'grid grid-cols-[80px_1fr_150px_110px_32px] gap-2'
                  : 'grid grid-cols-[1fr_150px_110px_32px] gap-2',
              )}>
                {isFreelancerMode && <span className="text-xs text-muted-foreground">Type</span>}
                <span className="text-xs text-muted-foreground">Account</span>
                <span className="text-xs text-muted-foreground">Description</span>
                <span className="text-xs text-muted-foreground text-right">
                  {inputMode === 'percent' ? 'Percent' : 'Amount'}
                </span>
                <span />
              </div>

              {lines.map((line) => (
                <div key={line.id} className={cn(
                  'items-center gap-2',
                  isFreelancerMode
                    ? 'grid grid-cols-[80px_1fr_150px_110px_32px]'
                    : 'grid grid-cols-[1fr_150px_110px_32px]',
                )}>
                  {/* Business / Personal toggle per line */}
                  {isFreelancerMode && (
                    <button
                      type="button"
                      onClick={() => handleLineChange(line.id, 'is_personal', !line.is_personal)}
                      className={cn(
                        'h-9 rounded-md border text-[10px] font-semibold px-1.5 transition-colors w-full',
                        line.is_personal
                          ? 'border-amber-300 bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:border-amber-700 dark:text-amber-400'
                          : 'border-primary/30 bg-primary-light text-primary dark:bg-primary/10',
                      )}
                    >
                      {line.is_personal ? 'Personal' : 'Business'}
                    </button>
                  )}

                  {/* Account picker — auto-routed for personal lines */}
                  {line.is_personal ? (
                    <div className="h-9 rounded-md border border-dashed border-border bg-muted/50 flex items-center px-3 text-xs text-muted-foreground">
                      {sourceType === 'business' ? '→ Owner Draw' : '→ Not posted'}
                    </div>
                  ) : (
                    <select
                      value={line.account_id}
                      onChange={(e) => handleLineChange(line.id, 'account_id', e.target.value)}
                      className={selectCls}
                    >
                      <option value="">Select account…</option>
                      {activeAccounts.map((a) => (
                        <option key={a.id} value={a.id}>{a.account_code} – {a.account_name}</option>
                      ))}
                    </select>
                  )}

                  <Input
                    value={line.description}
                    onChange={(e) => handleLineChange(line.id, 'description', e.target.value)}
                    placeholder="Optional"
                    className="h-9 text-sm"
                  />

                  {/* Value input with live conversion preview */}
                  <div className="relative">
                    <Input
                      type="number"
                      min="0.01"
                      step={inputMode === 'percent' ? '0.01' : '0.01'}
                      max={inputMode === 'percent' ? '100' : undefined}
                      value={line.value}
                      onChange={(e) => handleLineChange(line.id, 'value', e.target.value)}
                      placeholder={inputMode === 'percent' ? '0%' : '0.00'}
                      className="h-9 text-sm text-right pr-6"
                    />
                    <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground pointer-events-none">
                      {inputMode === 'percent' ? '%' : ''}
                    </span>
                  </div>

                  <button
                    onClick={() => handleRemoveLine(line.id)}
                    disabled={lines.length <= 2}
                    className={cn(
                      'flex items-center justify-center w-8 h-8 rounded-md transition-colors',
                      lines.length <= 2
                        ? 'text-muted-foreground/20 cursor-not-allowed'
                        : 'text-muted-foreground hover:text-destructive hover:bg-destructive/10',
                    )}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}

              {/* Per-line computed amount in % mode */}
              {inputMode === 'percent' && (
                <div className="space-y-1 pt-1">
                  {lines.map((line) => {
                    const amt = lineAmount(line);
                    if (!amt) return null;
                    return (
                      <div key={line.id} className="flex justify-end pr-10 text-xs text-muted-foreground">
                        = {formatCurrency(amt)}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Add line buttons */}
            <div className="mt-3 flex items-center gap-4">
              <button
                onClick={() => handleAddLine(false)}
                className="flex items-center gap-1.5 text-sm text-primary hover:text-primary/80 transition-colors"
              >
                <Plus className="w-4 h-4" />Add business line
              </button>
              {isFreelancerMode && (
                <button
                  onClick={() => handleAddLine(true)}
                  className="flex items-center gap-1.5 text-sm text-amber-600 hover:text-amber-500 transition-colors dark:text-amber-400"
                >
                  <Plus className="w-4 h-4" />Add personal line
                </button>
              )}
            </div>
          </div>

          {/* Freelancer summary */}
          {isFreelancerMode && (businessTotal > 0 || personalTotal > 0) && (
            <div className="rounded-lg border border-border bg-muted/50 divide-y divide-border text-xs">
              <div className="flex justify-between px-4 py-2">
                <span className="text-muted-foreground">
                  {sourceType === 'business' ? 'Business → Expense accounts' : 'Business → Expense + Owner Contribution'}
                </span>
                <span className="font-semibold text-primary">{formatCurrency(businessTotal)}</span>
              </div>
              {personalTotal > 0 && (
                <div className="flex justify-between px-4 py-2">
                  <span className="text-muted-foreground">
                    {sourceType === 'business' ? 'Personal → Owner Draw' : 'Personal → not posted'}
                  </span>
                  <span className="font-semibold text-foreground">{formatCurrency(personalTotal)}</span>
                </div>
              )}
              <div className="flex justify-between px-4 py-2">
                <span className="text-muted-foreground">
                  {sourceType === 'business' ? 'Bank (credit)' : 'Total'}
                </span>
                <span className="font-semibold text-foreground">−{formatCurrency(rawAmount)}</span>
              </div>
            </div>
          )}

          {/* Balance indicator */}
          <div className={cn(
            'flex items-center justify-between rounded-lg px-4 py-3 text-sm font-medium border',
            isBalanced && pctBalanced
              ? 'bg-green-50 border-green-200 text-green-700 dark:bg-green-900/20 dark:border-green-800 dark:text-green-400'
              : 'bg-amber-50 border-amber-200 text-amber-700 dark:bg-amber-900/20 dark:border-amber-800 dark:text-amber-400',
          )}>
            <div className="flex items-center gap-2">
              {isBalanced && pctBalanced
                ? <CheckCircle2 className="w-4 h-4" />
                : <AlertCircle className="w-4 h-4" />}
              <span>
                {isBalanced && pctBalanced
                  ? 'Balanced'
                  : inputMode === 'percent'
                    ? totalPct! > 100 ? 'Over 100%' : 'Under 100%'
                    : remaining > 0 ? 'Under-allocated' : 'Over-allocated'}
              </span>
            </div>
            <div className="flex items-center gap-4 text-xs">
              {inputMode === 'percent' ? (
                <>
                  <span>Allocated: <strong>{totalPct?.toFixed(1)}%</strong></span>
                  <span>Remaining: <strong>{(100 - (totalPct ?? 0)).toFixed(1)}%</strong></span>
                </>
              ) : (
                <>
                  <span>Allocated: <strong>{formatCurrency(allocated)}</strong></span>
                  <span className={cn(remaining !== 0 && 'font-semibold')}>
                    Remaining: <strong>{formatCurrency(Math.abs(remaining))}{remaining < 0 ? ' over' : ''}</strong>
                  </span>
                </>
              )}
            </div>
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
          <Button onClick={handleSubmit} disabled={!canSubmit || isPending} className="min-w-[120px]">
            {isPending ? 'Posting…' : `Confirm Split (${lines.length})`}
          </Button>
        </div>
      </div>
    </div>
  );
}
