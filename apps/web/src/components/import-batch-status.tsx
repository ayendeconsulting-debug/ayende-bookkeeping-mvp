'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { getImportBatch, ImportBatch } from '@/app/(app)/transactions/import/actions';

interface Props {
  batchId: string;
  onReset: () => void;
}

export function ImportBatchStatus({ batchId, onReset }: Props) {
  const [batch, setBatch] = useState<ImportBatch | null>(null);
  const [error, setError] = useState('');
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const router = useRouter();

  const fetchBatch = async () => {
    const res = await getImportBatch(batchId);
    if (res.success && res.data) {
      setBatch(res.data);
      if (res.data.status === 'completed' || res.data.status === 'failed') {
        if (intervalRef.current) clearInterval(intervalRef.current);
      }
    } else {
      setError(res.error ?? 'Failed to fetch batch status');
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
  };

  useEffect(() => {
    fetchBatch();
    intervalRef.current = setInterval(fetchBatch, 3000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [batchId]);

  const isTerminal = batch?.status === 'completed' || batch?.status === 'failed';

  return (
    <div className="rounded-xl border border-border bg-card p-6 space-y-5">
      {/* Header */}
      <div className="flex items-start gap-4">
        <div
          className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{ backgroundColor: 'var(--accent-teal-muted)' }}
        >
          {!isTerminal ? (
            <svg className="w-5 h-5 animate-spin" style={{ color: 'var(--accent-teal)' }} fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          ) : batch?.status === 'completed' ? (
            <svg className="w-5 h-5" style={{ color: 'var(--accent-teal)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          ) : (
            <svg className="w-5 h-5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-foreground truncate">
            {batch?.file_name ?? 'Processing…'}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {statusLabel(batch?.status)}
          </p>
        </div>

        <StatusPill status={batch?.status} />
      </div>

      {/* Progress bar — shown while pending/processing */}
      {(!batch || !isTerminal) && (
        <div className="space-y-1.5">
          <div className="h-1.5 rounded-full bg-muted overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{
                width: batch?.status === 'processing' ? '60%' : '20%',
                backgroundColor: 'var(--accent-teal)',
              }}
            />
          </div>
        </div>
      )}

      {/* Stats — shown on completion */}
      {batch?.status === 'completed' && (
        <div className="grid grid-cols-3 gap-3">
          <StatCard label="Imported" value={batch.processed_rows} color="var(--accent-teal)" />
          <StatCard label="Duplicates" value={batch.duplicate_rows} color="var(--text-secondary, hsl(var(--muted-foreground)))" />
          <StatCard label="Errors" value={batch.error_rows} color={batch.error_rows > 0 ? 'var(--accent-coral)' : 'var(--text-secondary, hsl(var(--muted-foreground)))'} />
        </div>
      )}

      {/* Error message */}
      {batch?.status === 'failed' && batch.error_message && (
        <div className="rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 px-4 py-3">
          <p className="text-xs text-red-700 dark:text-red-400">{batch.error_message}</p>
        </div>
      )}

      {error && (
        <p className="text-xs text-red-500">{error}</p>
      )}

      {/* Actions */}
      {isTerminal && (
        <div className="flex gap-3">
          {batch?.status === 'completed' && batch.processed_rows > 0 && (
            <button
              onClick={() => router.push('/transactions?status=pending')}
              className="flex-1 py-2.5 rounded-lg text-sm font-semibold text-white transition-opacity"
              style={{ backgroundColor: 'var(--accent-teal)' }}
            >
              Go to Transactions
            </button>
          )}
          <button
            onClick={onReset}
            className="flex-1 py-2.5 rounded-lg text-sm font-medium border border-border text-foreground hover:bg-muted transition-colors"
          >
            Import another file
          </button>
        </div>
      )}
    </div>
  );
}

function statusLabel(status?: string): string {
  switch (status) {
    case 'pending':    return 'Queued — waiting for parser…';
    case 'processing': return 'Parsing transactions…';
    case 'completed':  return 'Import complete';
    case 'failed':     return 'Import failed';
    default:           return 'Starting…';
  }
}

function StatusPill({ status }: { status?: string }) {
  const config: Record<string, { label: string; cls: string }> = {
    pending:    { label: 'Queued',   cls: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' },
    processing: { label: 'Parsing',  cls: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
    completed:  { label: 'Complete', cls: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' },
    failed:     { label: 'Failed',   cls: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' },
  };
  const { label, cls } = config[status ?? ''] ?? { label: 'Starting', cls: 'bg-muted text-muted-foreground' };
  return (
    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full flex-shrink-0 ${cls}`}>
      {label}
    </span>
  );
}

function StatCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="rounded-lg bg-muted/50 px-4 py-3 text-center">
      <p className="text-xl font-bold" style={{ color }}>{value}</p>
      <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
    </div>
  );
}
