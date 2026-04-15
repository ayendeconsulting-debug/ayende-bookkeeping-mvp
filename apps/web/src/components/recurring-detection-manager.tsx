'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { RecurringDetectionCandidate, ConfirmedRecurring } from '@/types';
import { formatCurrency, cn } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { confirmDetection, dismissDetection } from '@/app/(app)/personal/recurring/actions';
import { toastSuccess, toastError } from '@/lib/toast';
import { Check, X, RefreshCw, AlertCircle } from 'lucide-react';

interface RecurringDetectionManagerProps {
  initialCandidates: RecurringDetectionCandidate[];
  initialConfirmed: ConfirmedRecurring[];
}

const FREQUENCY_LABELS: Record<string, string> = {
  weekly: 'Weekly',
  monthly: 'Monthly',
  quarterly: 'Quarterly',
  annually: 'Annual',
};

const TYPE_COLORS: Record<string, string> = {
  subscription: 'bg-purple-50 text-purple-700 border-purple-100 dark:bg-purple-900/20 dark:text-purple-300 dark:border-purple-800/30',
  housing:      'bg-blue-50 text-blue-700 border-blue-100 dark:bg-blue-900/20 dark:text-blue-300 dark:border-blue-800/30',
  utilities:    'bg-yellow-50 text-yellow-700 border-yellow-100 dark:bg-yellow-900/20 dark:text-yellow-300 dark:border-yellow-800/30',
  insurance:    'bg-green-50 text-green-700 border-green-100 dark:bg-green-900/20 dark:text-green-300 dark:border-green-800/30',
  fitness:      'bg-orange-50 text-orange-700 border-orange-100 dark:bg-orange-900/20 dark:text-orange-300 dark:border-orange-800/30',
  recurring:    'bg-muted text-muted-foreground border-border',
};

function calcMonthlyEquivalent(amount: number, frequency: string): number {
  switch (frequency) {
    case 'weekly':    return amount * 4.33;
    case 'monthly':   return amount;
    case 'quarterly': return amount / 3;
    case 'annually':  return amount / 12;
    default:          return amount;
  }
}

export function RecurringDetectionManager({
  initialCandidates,
  initialConfirmed,
}: RecurringDetectionManagerProps) {
  const router = useRouter();
  const [candidates, setCandidates] = useState(initialCandidates);
  const [confirmed, setConfirmed]   = useState(initialConfirmed);
  const [isPending, startTransition] = useTransition();

  function handleConfirm(candidate: RecurringDetectionCandidate) {
    startTransition(async () => {
      const result = await confirmDetection(candidate);
      if (result.success) {
        setCandidates((prev) => prev.filter((c) => c.key !== candidate.key));
        setConfirmed((prev) => [
          { ...candidate, is_due_soon: false },
          ...prev.filter((c) => c.key !== candidate.key),
        ]);
        toastSuccess(`"${candidate.merchant}" added to your recurring payments.`);
        router.refresh();
      } else {
        toastError(result.error ?? 'Failed to confirm.');
      }
    });
  }

  function handleDismiss(key: string, merchant: string) {
    startTransition(async () => {
      const result = await dismissDetection(key);
      if (result.success) {
        setCandidates((prev) => prev.filter((c) => c.key !== key));
        toastSuccess(`"${merchant}" dismissed.`);
        router.refresh();
      } else {
        toastError(result.error ?? 'Failed to dismiss.');
      }
    });
  }

  function handleRemoveConfirmed(key: string) {
    startTransition(async () => {
      const result = await dismissDetection(key);
      if (result.success) {
        setConfirmed((prev) => prev.filter((c) => c.key !== key));
        toastSuccess('Removed from recurring payments.');
        router.refresh();
      } else {
        toastError(result.error ?? 'Failed to remove.');
      }
    });
  }

  const totalMonthly = confirmed.reduce(
    (s, c) => s + calcMonthlyEquivalent(c.amount, c.frequency), 0,
  );
  const dueSoon = confirmed.filter((c) => c.is_due_soon);

  return (
    <div className="flex flex-col gap-6">

      {/* Summary strip */}
      {confirmed.length > 0 && (
        <div className="grid grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-5">
              <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">Monthly Cost</div>
              <div className="text-2xl font-semibold text-foreground">{formatCurrency(totalMonthly)}</div>
              <div className="text-xs text-muted-foreground mt-1">{confirmed.length} confirmed payments</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-5">
              <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">Annual Cost</div>
              <div className="text-2xl font-semibold text-foreground">{formatCurrency(totalMonthly * 12)}</div>
              <div className="text-xs text-muted-foreground mt-1">projected yearly total</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-5">
              <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">Due This Week</div>
              <div className={cn('text-2xl font-semibold', dueSoon.length > 0 ? 'text-amber-500' : 'text-foreground')}>
                {dueSoon.length}
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                {dueSoon.length > 0 ? dueSoon.map((d) => d.merchant).join(', ') : 'None due soon'}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Detected candidates */}
      {candidates.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <RefreshCw className="w-4 h-4 text-primary" />
            <h2 className="text-sm font-semibold text-foreground">
              Detected Patterns ({candidates.length})
            </h2>
            <span className="text-xs text-muted-foreground">– confirm to create a recurring template, or dismiss to hide</span>
          </div>

          <Card>
            <CardContent className="p-0">
              <div className="divide-y divide-border">
                {candidates.map((candidate) => (
                  <div key={candidate.key} className="flex items-center gap-3 px-4 py-3.5">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-bold text-foreground truncate">
                          {candidate.merchant}
                        </p>
                        <Badge variant="pending" className="text-[10px] flex-shrink-0">
                          {FREQUENCY_LABELS[candidate.frequency]}
                        </Badge>
                        <span
                          className={cn(
                            'text-[10px] font-medium px-1.5 py-0.5 rounded border flex-shrink-0',
                            TYPE_COLORS[candidate.type] ?? TYPE_COLORS.recurring,
                          )}
                        >
                          {candidate.type}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {candidate.occurrence_count} occurrences · Next:{' '}
                        {new Date(candidate.next_date).toLocaleDateString('en-CA', {
                          month: 'short', day: 'numeric', year: 'numeric',
                        })}
                      </p>
                    </div>

                    <div className="text-right flex-shrink-0">
                      <p className="text-sm font-bold text-foreground">
                        {formatCurrency(candidate.amount)}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0">
                      <Button
                        size="sm"
                        onClick={() => handleConfirm(candidate)}
                        disabled={isPending}
                        className="h-7 px-3 text-xs bg-primary text-white hover:bg-primary-hover"
                      >
                        <Check className="w-3 h-3 mr-1" />
                        Confirm
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDismiss(candidate.key, candidate.merchant)}
                        disabled={isPending}
                        className="h-7 px-3 text-xs"
                      >
                        <X className="w-3 h-3 mr-1" />
                        Dismiss
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {candidates.length === 0 && confirmed.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <RefreshCw className="w-10 h-10 text-muted-foreground/20 mx-auto mb-3" />
            <p className="text-sm font-medium text-foreground mb-1">No recurring patterns detected</p>
            <p className="text-sm text-muted-foreground">
              Connect a bank and import at least 3 months of transactions to detect subscriptions
              and recurring bills.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Confirmed recurring payments */}
      {confirmed.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-foreground mb-3">
            Confirmed Recurring Payments ({confirmed.length})
          </h2>
          <Card>
            <CardContent className="p-0">
              <div className="divide-y divide-border">
                {confirmed.map((item) => {
                  const nextDate      = new Date(item.next_date);
                  const formattedNext = nextDate.toLocaleDateString('en-CA', {
                    month: 'short', day: 'numeric',
                  });
                  return (
                    <div
                      key={item.key}
                      className={cn(
                        'flex items-center gap-4 px-4 py-3 group',
                        item.is_due_soon ? 'bg-amber-500/10' : '',
                      )}
                    >
                      <div
                        className={cn(
                          'w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 text-xs font-bold',
                          TYPE_COLORS[item.type] ?? TYPE_COLORS.recurring,
                        )}
                      >
                        {item.merchant.slice(0, 2).toUpperCase()}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium text-foreground truncate">
                            {item.merchant}
                          </p>
                          {item.is_due_soon && (
                            <span className="flex items-center gap-0.5 text-[10px] font-bold text-amber-500">
                              <AlertCircle className="w-3 h-3" />
                              Due soon
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {FREQUENCY_LABELS[item.frequency]} · Next: {formattedNext}
                        </p>
                      </div>

                      <div className="text-right flex-shrink-0">
                        <p className="text-sm font-semibold text-foreground">
                          {formatCurrency(item.amount)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          ≈ {formatCurrency(calcMonthlyEquivalent(item.amount, item.frequency))}/mo
                        </p>
                      </div>

                      <button
                        onClick={() => handleRemoveConfirmed(item.key)}
                        disabled={isPending}
                        className="opacity-0 group-hover:opacity-100 transition-opacity p-1 text-muted-foreground/40 hover:text-red-400"
                        title="Remove"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
