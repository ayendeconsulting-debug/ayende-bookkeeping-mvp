'use client';

import { useEffect, useRef, useState } from 'react';
import { X, Sparkles, AlertCircle, RefreshCw } from 'lucide-react';
import { RawTransaction } from '@/types';
import { formatCurrency, cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { explainTransaction, pollAiJob } from '@/app/(app)/transactions/actions';

interface ExplainerResult {
  explanation:    string;
  account_name?:  string;
  category?:      string;
  confidence?:    'high' | 'medium' | 'low';
  anomaly_flags?: string[];
}

interface TransactionExplainerPanelProps {
  transaction: RawTransaction | null;
  open:        boolean;
  onClose:     () => void;
}

const POLL_INTERVAL_MS = 2000;
const TIMEOUT_MS       = 30000;

const confidenceColour: Record<string, string> = {
  high:   'text-green-600 bg-green-50',
  medium: 'text-amber-600 bg-amber-50',
  low:    'text-red-600 bg-red-50',
};

export function TransactionExplainerPanel({
  transaction, open, onClose,
}: TransactionExplainerPanelProps) {
  const [status,  setStatus]  = useState<'idle' | 'loading' | 'complete' | 'failed'>('idle');
  const [result,  setResult]  = useState<ExplainerResult | null>(null);
  const [errorMsg, setErrorMsg] = useState<string>('');

  const pollRef    = useRef<ReturnType<typeof setInterval> | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout>  | null>(null);
  const jobIdRef   = useRef<string | null>(null);

  function clearTimers() {
    if (pollRef.current)    clearInterval(pollRef.current);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    pollRef.current    = null;
    timeoutRef.current = null;
  }

  function reset() {
    clearTimers();
    setStatus('idle');
    setResult(null);
    setErrorMsg('');
    jobIdRef.current = null;
  }

  async function startExplain() {
    if (!transaction) return;
    reset();
    setStatus('loading');

    const res = await explainTransaction(transaction.id);
    if (!res.success || !res.data?.job_id) {
      // 429 â€” AI cap reached
      if (res.error?.includes('quota') || res.error?.includes('limit') || res.error?.includes('429')) {
        setErrorMsg('AI quota reached. Upgrade your plan for more AI credits.');
      } else {
        setErrorMsg(res.error ?? 'Failed to start explanation.');
      }
      setStatus('failed');
      return;
    }

    jobIdRef.current = res.data.job_id;

    // Start polling
    pollRef.current = setInterval(async () => {
      if (!jobIdRef.current) return;
      const poll = await pollAiJob(jobIdRef.current);
      if (!poll.success) return;

      const { status: jobStatus, result: jobResult } = poll.data ?? {};
      if (jobStatus === 'complete') {
        clearTimers();
        setResult(jobResult as ExplainerResult);
        setStatus('complete');
      } else if (jobStatus === 'failed') {
        clearTimers();
        setErrorMsg('The AI explanation failed. Please try again.');
        setStatus('failed');
      }
    }, POLL_INTERVAL_MS);

    // 30-second timeout
    timeoutRef.current = setTimeout(() => {
      clearTimers();
      setErrorMsg('Explanation timed out. Please try again.');
      setStatus('failed');
    }, TIMEOUT_MS);
  }

  // Start explain when panel opens
  useEffect(() => {
    if (open && transaction) {
      startExplain();
    } else if (!open) {
      reset();
    }
    return () => clearTimers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, transaction?.id]);

  if (!open) return null;

  const amount = transaction ? Number(transaction.amount) : 0;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/30 z-40"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="fixed right-0 top-0 h-full w-full max-w-md bg-white shadow-xl z-50 flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-primary" />
            <span className="font-semibold text-gray-900 text-sm">AI Explanation</span>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-md hover:bg-gray-100 transition-colors"
          >
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>

        {/* Transaction summary */}
        {transaction && (
          <div className="px-5 py-4 border-b border-gray-100 bg-gray-50">
            <p className="text-sm font-medium text-gray-900 truncate">{transaction.description}</p>
            <div className="flex items-center gap-3 mt-1">
              <span className="text-xs text-gray-500">
                {new Date(transaction.transaction_date).toLocaleDateString('en-CA', {
                  year: 'numeric', month: 'short', day: 'numeric',
                })}
              </span>
              <span className={cn(
                'text-sm font-semibold',
                amount >= 0 ? 'text-green-600' : 'text-red-600',
              )}>
                {amount >= 0 ? '+' : ''}{formatCurrency(amount)}
              </span>
              {transaction.source_account_name && (
                <span className="text-xs text-gray-400">{transaction.source_account_name}</span>
              )}
            </div>
          </div>
        )}

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-5">

          {/* Loading */}
          {status === 'loading' && (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <RefreshCw className="w-6 h-6 text-primary animate-spin" />
              <p className="text-sm text-gray-500">Analysing transaction...</p>
            </div>
          )}

          {/* Error */}
          {status === 'failed' && (
            <div className="flex flex-col items-center gap-4 py-10">
              <div className="flex items-center gap-2 text-red-600">
                <AlertCircle className="w-5 h-5" />
                <span className="text-sm font-medium">Explanation failed</span>
              </div>
              <p className="text-sm text-gray-500 text-center">{errorMsg}</p>
              <Button size="sm" variant="outline" onClick={startExplain}>
                Try again
              </Button>
            </div>
          )}

          {/* Result */}
          {status === 'complete' && result && (
            <div className="space-y-5">

              {/* Explanation */}
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
                  Explanation
                </p>
                <p className="text-sm text-gray-800 leading-relaxed">{result.explanation}</p>
              </div>

              {/* Account + Confidence row */}
              {(result.account_name || result.confidence) && (
                <div className="flex items-start gap-4">
                  {result.account_name && (
                    <div className="flex-1">
                      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">
                        Suggested account
                      </p>
                      <p className="text-sm font-medium text-gray-900">{result.account_name}</p>
                    </div>
                  )}
                  {result.confidence && (
                    <div>
                      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">
                        Confidence
                      </p>
                      <span className={cn(
                        'inline-block text-xs font-semibold px-2 py-0.5 rounded-full capitalize',
                        confidenceColour[result.confidence] ?? 'text-gray-600 bg-gray-100',
                      )}>
                        {result.confidence}
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* Category */}
              {result.category && (
                <div>
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">
                    Category
                  </p>
                  <p className="text-sm text-gray-700">{result.category}</p>
                </div>
              )}

              {/* Anomaly flags */}
              {result.anomaly_flags && result.anomaly_flags.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-amber-600 uppercase tracking-wide mb-2">
                    Anomaly flags
                  </p>
                  <ul className="space-y-1.5">
                    {result.anomaly_flags.map((flag, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-amber-700">
                        <AlertCircle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                        {flag}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-gray-200">
          <p className="text-xs text-gray-400">
            AI explanations are for guidance only and do not affect your books.
          </p>
        </div>
      </div>
    </>
  );
}

