'use client';

import { useEffect, useState } from 'react';
import {
  X,
  Paperclip,
  AlertTriangle,
  ChevronRight,
} from 'lucide-react';
import type { RawTransaction, TransactionDetail } from '@/types';
import { Button } from '@/components/ui/button';
import { getTransactionDetail } from '@/app/(app)/transactions/actions';
import { DocumentAttachments } from '@/components/document-attachments';

export type PanelAction =
  | 'classify'
  | 'post'
  | 'unclassify'
  | 'split'
  | 'transfer'
  | 'explain'
  | 'restore';

interface TransactionDetailPanelProps {
  rawTransactionId: string | null;
  onClose: () => void;
  onAction?: (action: PanelAction, txId: string) => void;
}

const fmtCAD = new Intl.NumberFormat('en-CA', {
  style: 'currency',
  currency: 'CAD',
});

function fmtDate(s: string | Date): string {
  const d = typeof s === 'string' ? new Date(s) : s;
  return d.toLocaleDateString('en-CA', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function StatusBadge({ status }: { status: RawTransaction['status'] }) {
  const styles: Record<RawTransaction['status'], string> = {
    pending: 'bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30',
    classified: 'bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-500/30',
    posted: 'bg-green-500/15 text-green-700 dark:text-green-400 border-green-500/30',
    ignored: 'bg-muted text-muted-foreground border-border',
  };
  const labels: Record<RawTransaction['status'], string> = {
    pending: 'Pending',
    classified: 'Classified',
    posted: 'Posted',
    ignored: 'Ignored',
  };
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-md border ${styles[status]}`}
    >
      {labels[status]}
    </span>
  );
}

export function TransactionDetailPanel({
  rawTransactionId,
  onClose,
  onAction,
}: TransactionDetailPanelProps) {
  const [detail, setDetail] = useState<TransactionDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load detail when rawTransactionId becomes a string
  useEffect(() => {
    let cancelled = false;
    if (!rawTransactionId) {
      setDetail(null);
      setError(null);
      return;
    }
    setLoading(true);
    setError(null);
    setDetail(null);
    getTransactionDetail(rawTransactionId).then((result) => {
      if (cancelled) return;
      if (result.success) {
        setDetail(result.data as TransactionDetail);
      } else {
        setError(result.error || 'Failed to load transaction details.');
      }
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [rawTransactionId]);

  // Esc key handler
  useEffect(() => {
    if (!rawTransactionId) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [rawTransactionId, onClose]);

  if (!rawTransactionId) return null;

  function fireAction(action: PanelAction) {
    if (!detail || !onAction) return;
    onAction(action, detail.raw.id);
    onClose();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-stretch sm:justify-end bg-black/60"
      onClick={onClose}
    >
      <div
        className="bg-card rounded-t-xl sm:rounded-none sm:rounded-l-xl shadow-2xl w-full sm:w-[640px] sm:h-full max-h-[95vh] sm:max-h-none flex flex-col border border-border overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-card border-b border-border px-4 sm:px-6 py-3 flex items-start justify-between gap-3">
          {loading || !detail ? (
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-muted rounded w-3/4 animate-pulse" />
              <div className="h-3 bg-muted rounded w-1/2 animate-pulse" />
            </div>
          ) : (
            <DetailHeader detail={detail} />
          )}
          <button
            onClick={onClose}
            aria-label="Close"
            className="text-muted-foreground hover:text-foreground p-1 -m-1 flex-shrink-0"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body (scrollable) */}
        <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 space-y-4">
          {error && (
            <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
              <AlertTriangle className="h-4 w-4 inline-block mr-2" />
              {error}
            </div>
          )}

          {loading && !error && <BodySkeleton />}

          {detail && !loading && !error && (
            <>
              {detail.raw.anomaly_flags && detail.raw.anomaly_flags.length > 0 && (
                <AnomalySection
                  flags={detail.raw.anomaly_flags}
                  onExplain={() => fireAction('explain')}
                />
              )}

              {detail.raw.status === 'pending' && <PendingBody onAction={fireAction} />}
              {detail.raw.status === 'classified' && (
                <ClassifiedBody detail={detail} onAction={fireAction} />
              )}
              {detail.raw.status === 'posted' && <PostedBody detail={detail} />}
              {detail.raw.status === 'ignored' && <IgnoredBody onAction={fireAction} />}

              <div className="pt-2">
                {detail.journalEntry ? (
                  <DocumentAttachments
                    journalEntryId={detail.journalEntry.id}
                    initialDocuments={detail.documents as any}
                  />
                ) : (
                  <DocumentAttachments
                    rawTransactionId={detail.raw.id}
                    initialDocuments={detail.documents as any}
                  />
                )}
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="bg-card border-t border-border px-4 sm:px-6 py-3 flex items-center justify-end gap-3">
          <Button onClick={onClose} variant="outline" className="min-h-[44px]">
            Close
          </Button>
        </div>
      </div>
    </div>
  );
}

function DetailHeader({ detail }: { detail: TransactionDetail }) {
  const { raw, documents } = detail;
  const amount = Number(raw.amount);
  const isInflow = amount > 0;
  return (
    <div className="flex-1 min-w-0">
      <div className="flex items-center gap-2 mb-1 flex-wrap">
        <span className="text-xs text-muted-foreground">{fmtDate(raw.transaction_date)}</span>
        <StatusBadge status={raw.status} />
        {raw.is_personal && (
          <span className="inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-md bg-purple-500/15 text-purple-700 dark:text-purple-400 border border-purple-500/30">
            Personal
          </span>
        )}
        {documents.length > 0 && (
          <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
            <Paperclip className="h-3.5 w-3.5" />
            {documents.length}
          </span>
        )}
      </div>
      <p className="font-medium text-foreground truncate" title={raw.description}>
        {raw.description}
      </p>
      <div className="flex items-center gap-2 mt-0.5">
        <span
          className={`text-sm font-semibold ${
            isInflow ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
          }`}
        >
          {isInflow ? '+' : ''}
          {fmtCAD.format(amount)}
        </span>
        {raw.source_account_name && (
          <span className="text-xs text-muted-foreground truncate">{raw.source_account_name}</span>
        )}
      </div>
    </div>
  );
}

function BodySkeleton() {
  return (
    <div className="space-y-3">
      <div className="h-20 bg-muted rounded animate-pulse" />
      <div className="h-10 bg-muted rounded animate-pulse" />
      <div className="h-32 bg-muted rounded animate-pulse" />
    </div>
  );
}

function AnomalySection({
  flags,
  onExplain,
}: {
  flags: string[];
  onExplain: () => void;
}) {
  return (
    <div className="rounded-md border border-amber-500/30 bg-amber-500/10 p-3 text-sm">
      <div className="flex items-start gap-2">
        <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
        <div className="flex-1">
          <p className="font-medium text-amber-700 dark:text-amber-400 mb-1">
            AI flagged this transaction
          </p>
          <ul className="text-amber-700 dark:text-amber-400/80 text-xs list-disc pl-4 space-y-0.5">
            {flags.map((flag, i) => (
              <li key={i}>{flag}</li>
            ))}
          </ul>
          <button
            onClick={onExplain}
            className="text-xs font-medium text-amber-700 dark:text-amber-400 hover:underline mt-2 inline-flex items-center"
          >
            Explain with AI
            <ChevronRight className="h-3 w-3 ml-0.5" />
          </button>
        </div>
      </div>
    </div>
  );
}

function PendingBody({ onAction }: { onAction: (a: PanelAction) => void }) {
  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        This transaction has not been classified yet.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        <Button onClick={() => onAction('classify')} className="min-h-[44px]">
          Classify
        </Button>
        <Button
          onClick={() => onAction('transfer')}
          variant="outline"
          className="min-h-[44px]"
        >
          Mark transfer
        </Button>
        <Button onClick={() => onAction('split')} variant="outline" className="min-h-[44px]">
          Split
        </Button>
      </div>
    </div>
  );
}

function ClassifiedBody({
  detail,
  onAction,
}: {
  detail: TransactionDetail;
  onAction: (a: PanelAction) => void;
}) {
  const { classified, accountMap } = detail;
  if (!classified) return null;
  const accountName = accountMap[classified.account_id]?.account_name || 'Unknown account';
  const accountCode = accountMap[classified.account_id]?.account_code;
  return (
    <div className="space-y-3">
      <div className="rounded-md border border-border bg-muted/30 p-3 space-y-1.5 text-sm">
        <div className="flex justify-between gap-2">
          <span className="text-muted-foreground">Account</span>
          <span className="font-medium text-foreground text-right">
            {accountCode && (
              <span className="text-xs text-muted-foreground mr-1.5">{accountCode}</span>
            )}
            {accountName}
          </span>
        </div>
        {classified.classification_method && (
          <div className="flex justify-between">
            <span className="text-muted-foreground">Method</span>
            <span className="text-xs text-foreground capitalize">
              {classified.classification_method}
            </span>
          </div>
        )}
        {classified.is_split && (
          <div className="flex justify-between">
            <span className="text-muted-foreground">Split</span>
            <span className="text-xs text-foreground">{classified.split_count} lines</span>
          </div>
        )}
        {classified.is_transfer && (
          <div className="flex justify-between">
            <span className="text-muted-foreground">Type</span>
            <span className="text-xs text-foreground">Transfer</span>
          </div>
        )}
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Button onClick={() => onAction('post')} className="min-h-[44px]">
          Post to ledger
        </Button>
        <Button
          onClick={() => onAction('unclassify')}
          variant="outline"
          className="min-h-[44px]"
        >
          Unclassify
        </Button>
      </div>
    </div>
  );
}

function PostedBody({ detail }: { detail: TransactionDetail }) {
  const { journalEntry, journalLines, accountMap } = detail;
  if (!journalEntry) return null;

  const totalDebit = journalLines.reduce((s, l) => s + Number(l.debit_amount || 0), 0);
  const totalCredit = journalLines.reduce((s, l) => s + Number(l.credit_amount || 0), 0);

  // Defensive access in case JournalEntry type on frontend is missing these fields
  const entryNumber = (journalEntry as any).entry_number as string | undefined;
  const postedAt = (journalEntry as any).posted_at as string | undefined;

  return (
    <div className="space-y-3">
      <div className="rounded-md border border-border bg-muted/30 p-3 space-y-1.5 text-sm">
        {entryNumber && (
          <div className="flex justify-between">
            <span className="text-muted-foreground">Entry number</span>
            <span className="font-mono text-xs text-foreground">{entryNumber}</span>
          </div>
        )}
        {postedAt && (
          <div className="flex justify-between">
            <span className="text-muted-foreground">Posted</span>
            <span className="text-xs text-foreground">{fmtDate(postedAt)}</span>
          </div>
        )}
      </div>

      {/* Desktop: table */}
      <div className="hidden sm:block">
        <table className="w-full text-sm border border-border rounded-md overflow-hidden">
          <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
            <tr>
              <th className="text-left font-medium px-3 py-2">Account</th>
              <th className="text-left font-medium px-3 py-2">Description</th>
              <th className="text-right font-medium px-3 py-2">Debit</th>
              <th className="text-right font-medium px-3 py-2">Credit</th>
            </tr>
          </thead>
          <tbody>
            {journalLines.map((line) => {
              const acct = accountMap[line.account_id];
              return (
                <tr key={line.id} className="border-t border-border">
                  <td className="px-3 py-2">
                    {acct?.account_code && (
                      <span className="text-xs text-muted-foreground mr-1.5">
                        {acct.account_code}
                      </span>
                    )}
                    {acct?.account_name || '-'}
                  </td>
                  <td className="px-3 py-2 text-muted-foreground text-xs">
                    {line.description || ''}
                  </td>
                  <td className="px-3 py-2 text-right font-mono">
                    {Number(line.debit_amount) > 0
                      ? fmtCAD.format(Number(line.debit_amount))
                      : ''}
                  </td>
                  <td className="px-3 py-2 text-right font-mono">
                    {Number(line.credit_amount) > 0
                      ? fmtCAD.format(Number(line.credit_amount))
                      : ''}
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot className="bg-muted/30 border-t-2 border-border">
            <tr>
              <td
                colSpan={2}
                className="px-3 py-2 text-right text-xs uppercase text-muted-foreground font-medium"
              >
                Totals
              </td>
              <td className="px-3 py-2 text-right font-mono font-semibold">
                {fmtCAD.format(totalDebit)}
              </td>
              <td className="px-3 py-2 text-right font-mono font-semibold">
                {fmtCAD.format(totalCredit)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Mobile: stacked cards */}
      <div className="sm:hidden space-y-2">
        {journalLines.map((line) => {
          const acct = accountMap[line.account_id];
          return (
            <div key={line.id} className="rounded-md border border-border p-3 text-sm">
              <p className="font-medium text-foreground">
                {acct?.account_code && (
                  <span className="text-xs text-muted-foreground mr-1.5">
                    {acct.account_code}
                  </span>
                )}
                {acct?.account_name || '-'}
              </p>
              {line.description && (
                <p className="text-xs text-muted-foreground mt-0.5">{line.description}</p>
              )}
              <div className="grid grid-cols-2 gap-3 mt-2 text-xs">
                <div>
                  <span className="text-muted-foreground">Debit</span>
                  <p className="font-mono font-medium">
                    {Number(line.debit_amount) > 0
                      ? fmtCAD.format(Number(line.debit_amount))
                      : '-'}
                  </p>
                </div>
                <div>
                  <span className="text-muted-foreground">Credit</span>
                  <p className="font-mono font-medium">
                    {Number(line.credit_amount) > 0
                      ? fmtCAD.format(Number(line.credit_amount))
                      : '-'}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
        <div className="rounded-md bg-muted/30 p-3 text-xs grid grid-cols-2 gap-3">
          <div>
            <span className="text-muted-foreground uppercase">Total Debit</span>
            <p className="font-mono font-semibold mt-0.5">{fmtCAD.format(totalDebit)}</p>
          </div>
          <div>
            <span className="text-muted-foreground uppercase">Total Credit</span>
            <p className="font-mono font-semibold mt-0.5">{fmtCAD.format(totalCredit)}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function IgnoredBody({ onAction }: { onAction: (a: PanelAction) => void }) {
  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        This transaction is ignored and not affecting reports.
      </p>
      <Button
        onClick={() => onAction('restore')}
        variant="outline"
        className="min-h-[44px]"
      >
        Restore
      </Button>
    </div>
  );
}
