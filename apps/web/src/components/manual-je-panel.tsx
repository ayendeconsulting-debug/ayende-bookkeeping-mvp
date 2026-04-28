'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Account } from '@/types';
import {
  JournalEntry, JournalLine, CreateJEPayload,
  createJournalEntry, updateJournalEntry, postJournalEntry, deleteJournalEntry,
} from '@/app/(app)/transactions/journal-entries/actions';
import { cn } from '@/lib/utils';
import { toastSuccess, toastError } from '@/lib/toast';

const JE_TYPES = [
  'Adjustment',
  'CCA / Depreciation',
  'Accrual',
  'Correction',
  'Opening Balance',
  'Other',
];

interface LineRow {
  key: number;
  account_id: string;
  description: string;
  debit: string;
  credit: string;
}

interface ManualJEPanelProps {
  accounts: Account[];
  open: boolean;
  onClose: () => void;
  editEntry?: JournalEntry | null;
  onSaved?: () => void;
}

export function ManualJEPanel({ accounts, open, onClose, editEntry, onSaved }: ManualJEPanelProps) {
  const router = useRouter();
  const [date, setDate] = useState('');
  const [description, setDescription] = useState('');
  const [referenceNumber, setReferenceNumber] = useState('');
  const [jeType, setJeType] = useState('');
  const [notes, setNotes] = useState('');
  const [lines, setLines] = useState<LineRow[]>([
    { key: 1, account_id: '', description: '', debit: '', credit: '' },
    { key: 2, account_id: '', description: '', debit: '', credit: '' },
  ]);
  const [saving, setSaving] = useState(false);
  const [posting, setPosting] = useState(false);
  const [nextKey, setNextKey] = useState(3);

  // Active accounts only, sorted by account_code
  const activeAccounts = accounts
    .filter(a => a.is_active)
    .slice()
    .sort((a, b) => (a.account_code ?? '').localeCompare(b.account_code ?? ''));

  // Pre-fill when editing
  useEffect(() => {
    if (editEntry) {
      setDate(editEntry.entry_date?.split('T')[0] ?? '');
      setDescription(editEntry.description ?? '');
      setReferenceNumber(editEntry.reference_number ?? '');
      setJeType(editEntry.je_type ?? '');
      setNotes(editEntry.notes ?? '');
      const mapped = editEntry.lines.map((l, i) => ({
        key: i + 1,
        account_id: l.account_id,
        description: l.description ?? '',
        debit: l.debit_amount > 0 ? String(l.debit_amount) : '',
        credit: l.credit_amount > 0 ? String(l.credit_amount) : '',
      }));
      setLines(mapped.length >= 2 ? mapped : [...mapped, { key: 99, account_id: '', description: '', debit: '', credit: '' }]);
      setNextKey(mapped.length + 2);
    } else {
      resetForm();
    }
  }, [editEntry, open]);

  const resetForm = () => {
    setDate('');
    setDescription('');
    setReferenceNumber('');
    setJeType('');
    setNotes('');
    setLines([
      { key: 1, account_id: '', description: '', debit: '', credit: '' },
      { key: 2, account_id: '', description: '', debit: '', credit: '' },
    ]);
    setNextKey(3);
  };

  const totalDebits = lines.reduce((s, l) => s + (parseFloat(l.debit) || 0), 0);
  const totalCredits = lines.reduce((s, l) => s + (parseFloat(l.credit) || 0), 0);
  const difference = Math.abs(totalDebits - totalCredits);
  const isBalanced = difference < 0.01;
  const allLinesHaveAccount = lines.every(l => !!l.account_id);
  const hasAccounts = activeAccounts.length > 0;
  const canSaveDraft = hasAccounts && !!description.trim() && !!date && allLinesHaveAccount;
  const isValid = canSaveDraft && isBalanced;

  const updateLine = (key: number, field: keyof LineRow, value: string) => {
    setLines(prev => prev.map(l => l.key === key ? { ...l, [field]: value } : l));
  };

  const addLine = () => {
    setLines(prev => [...prev, { key: nextKey, account_id: '', description: '', debit: '', credit: '' }]);
    setNextKey(k => k + 1);
  };

  const removeLine = (key: number) => {
    if (lines.length <= 2) return;
    setLines(prev => prev.filter(l => l.key !== key));
  };

  const buildPayload = (): CreateJEPayload => ({
    entry_date: date,
    description: description.trim(),
    reference_number: referenceNumber.trim() || undefined,
    je_type: jeType || undefined,
    notes: notes.trim() || undefined,
    manual_entry: true,
    lines: lines.map((l, i) => ({
      line_number: i + 1,
      account_id: l.account_id,
      debit_amount: parseFloat(l.debit) || 0,
      credit_amount: parseFloat(l.credit) || 0,
      description: l.description.trim() || undefined,
    })),
  });

  const handleSaveDraft = async () => {
    if (!canSaveDraft) return;
    setSaving(true);
    try {
      const payload = buildPayload();
      const res = editEntry
        ? await updateJournalEntry(editEntry.id, payload)
        : await createJournalEntry(payload);
      if (!res.success) throw new Error(res.error);
      toastSuccess(editEntry ? 'Draft updated' : 'Draft saved');
      onSaved?.();
      onClose();
      router.refresh();
    } catch (err: any) {
      toastError(err.message ?? 'Failed to save draft');
    } finally {
      setSaving(false);
    }
  };

  const handlePost = async () => {
    if (!isValid) return;
    setPosting(true);
    try {
      const payload = buildPayload();
      let entryId = editEntry?.id;
      if (!entryId) {
        const res = await createJournalEntry(payload);
        if (!res.success || !res.data) throw new Error(res.error);
        entryId = res.data.id;
      } else {
        const res = await updateJournalEntry(entryId, payload);
        if (!res.success) throw new Error(res.error);
      }
      const postRes = await postJournalEntry(entryId!);
      if (!postRes.success) throw new Error(postRes.error);
      toastSuccess('Journal entry posted');
      onSaved?.();
      onClose();
      router.refresh();
    } catch (err: any) {
      toastError(err.message ?? 'Failed to post entry');
    } finally {
      setPosting(false);
    }
  };

  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/50"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Panel */}
      <div className="fixed inset-y-0 right-0 z-50 w-full max-w-2xl flex flex-col shadow-2xl"
        style={{ backgroundColor: 'var(--card)', borderLeft: '1px solid var(--border)' }}>

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border flex-shrink-0">
          <div>
            <h2 className="text-base font-semibold text-foreground">
              {editEntry ? 'Edit Journal Entry' : 'New Journal Entry'}
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">Manual double-entry posting</p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-muted transition-colors"
          >
            <svg className="w-4 h-4 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">

          {/* Empty accounts warning */}
          {!hasAccounts && (
            <div
              className="rounded-xl border p-4 text-sm"
              style={{
                backgroundColor: 'rgba(245,158,11,0.08)',
                borderColor: 'rgba(245,158,11,0.35)',
                color: 'var(--foreground)',
              }}
            >
              <p className="font-medium mb-1">No accounts available</p>
              <p className="text-xs text-muted-foreground">
                Set up your Chart of Accounts before posting a journal entry.{' '}
                <a href="/accounts" className="underline" style={{ color: 'var(--accent-teal)' }}>
                  Go to Chart of Accounts
                </a>
              </p>
            </div>
          )}

          {/* Header fields */}
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2 sm:col-span-1">
              <label className="block text-xs font-medium text-muted-foreground mb-1">
                Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={date}
                onChange={e => setDate(e.target.value)}
                className="w-full rounded-lg border border-border bg-input text-foreground text-sm px-3 py-2 focus:outline-none focus:ring-2"
                style={{ ['--tw-ring-color' as any]: 'var(--accent-teal)' }}
              />
            </div>
            <div className="col-span-2 sm:col-span-1">
              <label className="block text-xs font-medium text-muted-foreground mb-1">Reference #</label>
              <input
                type="text"
                value={referenceNumber}
                onChange={e => setReferenceNumber(e.target.value)}
                placeholder="e.g. ADJ-2026-001"
                className="w-full rounded-lg border border-border bg-input text-foreground text-sm px-3 py-2 focus:outline-none focus:ring-2"
              />
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-medium text-muted-foreground mb-1">
                Description <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="e.g. Year 1 CCA deduction - Class 12 asset"
                className="w-full rounded-lg border border-border bg-input text-foreground text-sm px-3 py-2 focus:outline-none focus:ring-2"
              />
            </div>
            <div className="col-span-2 sm:col-span-1">
              <label className="block text-xs font-medium text-muted-foreground mb-1">Entry Type</label>
              <select
                value={jeType}
                onChange={e => setJeType(e.target.value)}
                className="w-full rounded-lg border border-border bg-input text-foreground text-sm px-3 py-2 focus:outline-none focus:ring-2"
              >
                <option value="">Select type...</option>
                {JE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
          </div>

          {/* Line items */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Line Items
              </label>
              <button
                onClick={addLine}
                className="text-xs font-medium flex items-center gap-1 px-2.5 py-1 rounded-md border border-border hover:bg-muted transition-colors"
                style={{ color: 'var(--accent-teal)' }}
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Add line
              </button>
            </div>

            {/* Column headers */}
            <div className="grid grid-cols-12 gap-2 px-1">
              <div className="col-span-5 text-xs text-muted-foreground font-medium">Account</div>
              <div className="col-span-2 text-xs text-muted-foreground font-medium">Description</div>
              <div className="col-span-2 text-xs text-muted-foreground font-medium text-right">Debit</div>
              <div className="col-span-2 text-xs text-muted-foreground font-medium text-right">Credit</div>
              <div className="col-span-1" />
            </div>

            {/* Line rows */}
            <div className="space-y-2">
              {lines.map((line, idx) => (
                <div key={line.key} className="grid grid-cols-12 gap-2 items-center">
                  <div className="col-span-5">
                    <select
                      value={line.account_id}
                      onChange={e => updateLine(line.key, 'account_id', e.target.value)}
                      disabled={!hasAccounts}
                      className="w-full rounded-lg border border-border bg-input text-foreground text-xs px-2 py-2 focus:outline-none focus:ring-1 disabled:opacity-50"
                    >
                      <option value="">Select account...</option>
                      {activeAccounts.map(a => {
                        const code = a.account_code ? `${a.account_code} - ` : '';
                        const name = a.account_name ?? '(unnamed account)';
                        return (
                          <option key={a.id} value={a.id}>
                            {`${code}${name}`}
                          </option>
                        );
                      })}
                    </select>
                  </div>
                  <div className="col-span-2">
                    <input
                      type="text"
                      value={line.description}
                      onChange={e => updateLine(line.key, 'description', e.target.value)}
                      placeholder="Optional"
                      className="w-full rounded-lg border border-border bg-input text-foreground text-xs px-2 py-2 focus:outline-none focus:ring-1"
                    />
                  </div>
                  <div className="col-span-2">
                    <input
                      type="number"
                      value={line.debit}
                      onChange={e => updateLine(line.key, 'debit', e.target.value)}
                      placeholder="0.00"
                      min="0"
                      step="0.01"
                      className="w-full rounded-lg border border-border bg-input text-foreground text-xs px-2 py-2 text-right focus:outline-none focus:ring-1"
                    />
                  </div>
                  <div className="col-span-2">
                    <input
                      type="number"
                      value={line.credit}
                      onChange={e => updateLine(line.key, 'credit', e.target.value)}
                      placeholder="0.00"
                      min="0"
                      step="0.01"
                      className="w-full rounded-lg border border-border bg-input text-foreground text-xs px-2 py-2 text-right focus:outline-none focus:ring-1"
                    />
                  </div>
                  <div className="col-span-1 flex justify-center">
                    <button
                      onClick={() => removeLine(line.key)}
                      disabled={lines.length <= 2}
                      className="w-6 h-6 rounded flex items-center justify-center hover:bg-muted transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      <svg className="w-3.5 h-3.5 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Balance indicator */}
            <div className="rounded-xl border border-border p-4 mt-3"
              style={{ backgroundColor: isBalanced ? 'var(--accent-teal-muted, #E8F4EE)' : 'rgba(239,68,68,0.06)' }}>
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Total Debits</p>
                  <p className="text-sm font-semibold text-foreground">${totalDebits.toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Total Credits</p>
                  <p className="text-sm font-semibold text-foreground">${totalCredits.toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Difference</p>
                  <p className={cn('text-sm font-bold', isBalanced ? '' : 'text-red-500')}
                    style={isBalanced ? { color: 'var(--accent-teal)' } : {}}>
                    {isBalanced ? 'Balanced' : `$${difference.toFixed(2)}`}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer actions */}
        <div className="flex items-center justify-between gap-3 px-6 py-4 border-t border-border flex-shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-sm text-muted-foreground hover:bg-muted transition-colors border border-border"
          >
            Cancel
          </button>
          <div className="flex gap-2">
            <button
              onClick={handleSaveDraft}
              disabled={saving || !canSaveDraft}
              title={!canSaveDraft ? 'Fill in date, description, and an account on every line.' : ''}
              className="px-4 py-2 rounded-lg text-sm font-medium border border-border text-foreground hover:bg-muted transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {saving ? 'Saving...' : 'Save Draft'}
            </button>
            <button
              onClick={handlePost}
              disabled={posting || !isValid}
              className="px-4 py-2 rounded-lg text-sm font-semibold text-white transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
              style={{ backgroundColor: 'var(--accent-teal)' }}
              title={!isBalanced ? 'Entry must be balanced before posting' : ''}
            >
              {posting ? 'Posting...' : 'Post Entry'}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

// -- Draft list component (used on journal-entries page) ---------------------

interface DraftListProps {
  drafts: JournalEntry[];
  accounts: Account[];
}

export function JournalEntriesDraftList({ drafts, accounts }: DraftListProps) {
  const router = useRouter();
  const [panelOpen, setPanelOpen] = useState(false);
  const [editEntry, setEditEntry] = useState<JournalEntry | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [posting, setPosting] = useState<string | null>(null);

  const handleEdit = (entry: JournalEntry) => {
    setEditEntry(entry);
    setPanelOpen(true);
  };

  const handleNew = () => {
    setEditEntry(null);
    setPanelOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this draft journal entry?')) return;
    setDeleting(id);
    const res = await deleteJournalEntry(id);
    if (res.success) {
      toastSuccess('Draft deleted');
      router.refresh();
    } else {
      toastError(res.error ?? 'Failed to delete');
    }
    setDeleting(null);
  };

  const handlePost = async (id: string) => {
    setPosting(id);
    const res = await postJournalEntry(id);
    if (res.success) {
      toastSuccess('Journal entry posted');
      router.refresh();
    } else {
      toastError(res.error ?? 'Failed to post');
    }
    setPosting(null);
  };

  return (
    <>
      <ManualJEPanel
        accounts={accounts}
        open={panelOpen}
        onClose={() => setPanelOpen(false)}
        editEntry={editEntry}
        onSaved={() => router.refresh()}
      />

      <div className="flex justify-end">
        <button
          onClick={handleNew}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white"
          style={{ backgroundColor: 'var(--accent-teal)' }}
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          New Journal Entry
        </button>
      </div>

      {drafts.length === 0 ? (
        <div className="rounded-xl border border-border bg-card p-12 text-center">
          <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mx-auto mb-3">
            <svg className="w-6 h-6 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <p className="text-sm font-medium text-foreground">No draft journal entries</p>
          <p className="text-xs text-muted-foreground mt-1">Create a new journal entry to record CCA deductions, accruals, or corrections.</p>
        </div>
      ) : (
        <div className="rounded-xl border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[var(--bg-table-header,hsl(var(--muted)))] text-muted-foreground uppercase text-xs tracking-wide">
                <th className="text-left px-4 py-3 font-medium">Entry #</th>
                <th className="text-left px-4 py-3 font-medium">Date</th>
                <th className="text-left px-4 py-3 font-medium">Description</th>
                <th className="text-left px-4 py-3 font-medium">Type</th>
                <th className="text-right px-4 py-3 font-medium">Debits</th>
                <th className="text-right px-4 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {drafts.map((entry, idx) => {
                const totalDebits = entry.lines?.reduce((s, l) => s + Number(l.debit_amount), 0) ?? 0;
                return (
                  <tr key={entry.id} className={idx % 2 === 0 ? 'bg-card' : 'bg-background'}>
                    <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                      {entry.entry_number ?? '--'}
                    </td>
                    <td className="px-4 py-3 text-foreground">
                      {new Date(entry.entry_date).toLocaleDateString('en-CA')}
                    </td>
                    <td className="px-4 py-3 text-foreground max-w-[240px] truncate">
                      {entry.description}
                    </td>
                    <td className="px-4 py-3">
                      {entry.je_type ? (
                        <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                          {entry.je_type}
                        </span>
                      ) : '--'}
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-foreground">
                      ${totalDebits.toFixed(2)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleEdit(entry)}
                          className="text-xs px-2.5 py-1 rounded-md border border-border text-foreground hover:bg-muted transition-colors"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handlePost(entry.id)}
                          disabled={posting === entry.id}
                          className="text-xs px-2.5 py-1 rounded-md text-white font-medium transition-opacity disabled:opacity-40"
                          style={{ backgroundColor: 'var(--accent-teal)' }}
                        >
                          {posting === entry.id ? 'Posting...' : 'Post'}
                        </button>
                        <button
                          onClick={() => handleDelete(entry.id)}
                          disabled={deleting === entry.id}
                          className="text-xs px-2.5 py-1 rounded-md border border-red-200 dark:border-red-900 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors disabled:opacity-40"
                        >
                          {deleting === entry.id ? '...' : 'Delete'}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

// -- Inline trigger button (used in TransactionInbox header) ------------------

interface NewJEButtonProps {
  accounts: Account[];
}

export function NewJEButton({ accounts }: NewJEButtonProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  return (
    <>
      <ManualJEPanel
        accounts={accounts}
        open={open}
        onClose={() => setOpen(false)}
        onSaved={() => router.refresh()}
      />
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border border-border text-foreground hover:bg-muted transition-colors"
      >
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        Journal Entry
      </button>
    </>
  );
}
