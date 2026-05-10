'use client';

import { useState, useEffect, useTransition, useCallback } from 'react';
import { Sparkles, Loader2, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { cn } from '@/lib/utils';
import {
  runFirmSmartMatch,
  getFirmSmartMatchStatus,
  FirmSmartMatchRun,
} from '@/app/(accountant)/accountant/clients/smart-match-actions';
import { toastSuccess, toastError } from '@/lib/toast';

interface FirmSmartMatchTriggerProps {
  activeClientCount: number;
}

const POLL_INTERVAL_MS = 3000;

export function FirmSmartMatchTrigger({ activeClientCount }: FirmSmartMatchTriggerProps) {
  const [isPending, startTransition] = useTransition();
  const [run, setRun] = useState<FirmSmartMatchRun | null>(null);
  const [polling, setPolling] = useState(false);

  // ── Load latest run on mount ───────────────────────────────────────────────
  useEffect(() => {
    getFirmSmartMatchStatus().then((res) => {
      if (res.success && res.data) {
        setRun(res.data);
        if (res.data.status === 'running') setPolling(true);
      }
    });
  }, []);

  // ── Poll while running ─────────────────────────────────────────────────────
  const poll = useCallback(async () => {
    const res = await getFirmSmartMatchStatus();
    if (!res.success || !res.data) return;
    setRun(res.data);
    if (res.data.status !== 'running') setPolling(false);
  }, []);

  useEffect(() => {
    if (!polling) return;
    const id = setInterval(poll, POLL_INTERVAL_MS);
    return () => clearInterval(id);
  }, [polling, poll]);

  // ── Trigger ────────────────────────────────────────────────────────────────
  function handleRun() {
    startTransition(async () => {
      const res = await runFirmSmartMatch();
      if (res.success && res.data) {
        toastSuccess(`Smart Match queued for ${res.data.client_count} client${res.data.client_count !== 1 ? 's' : ''}.`);
        // Fetch fresh run row
        const statusRes = await getFirmSmartMatchStatus();
        if (statusRes.success && statusRes.data) {
          setRun(statusRes.data);
          if (statusRes.data.status === 'running') setPolling(true);
        }
      } else {
        toastError(res.error ?? 'Failed to start Smart Match.');
      }
    });
  }

  const isRunning = run?.status === 'running';
  const isComplete = run?.status === 'complete';

  return (
    <div className="flex flex-col gap-2">
      {/* Trigger button */}
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            disabled={isPending || isRunning || activeClientCount === 0}
            className="border-accent-teal/60 text-accent-teal hover:bg-accent-teal-muted"
          >
            {isRunning ? (
              <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
            ) : (
              <Sparkles className="w-4 h-4 mr-1.5" />
            )}
            {isRunning ? 'Running...' : 'Run Smart Match for all clients'}
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Run Smart Match for all clients?</AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <span className="block">
                This will queue Smart Match for{' '}
                <span className="font-semibold text-foreground">
                  {activeClientCount} active client{activeClientCount !== 1 ? 's' : ''}
                </span>
                . AI suggestions will be generated for transactions that
                {' '}have not been classified yet.
              </span>
              <span className="block text-xs text-muted-foreground">
                Each client{"'"}s transactions are processed independently.
                You can still open individual client books while the run is in progress.
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRun}
              className="bg-accent-teal hover:bg-accent-teal/90 text-white"
            >
              <Sparkles className="w-3.5 h-3.5 mr-1.5" />
              Run Smart Match
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Progress banner */}
      {run && (isRunning || isComplete) && (
        <div className={cn(
          'flex items-center gap-2.5 rounded-lg border px-3.5 py-2.5 text-sm transition-colors',
          isComplete
            ? 'border-emerald-200 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-950/30'
            : 'border-accent-teal/30 bg-accent-teal-muted/40',
        )}>
          {isComplete ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
          ) : (
            <Loader2 className="w-4 h-4 text-accent-teal flex-shrink-0 animate-spin" />
          )}
          <span className={cn(
            'font-medium',
            isComplete ? 'text-emerald-700 dark:text-emerald-400' : 'text-accent-teal',
          )}>
            {isComplete
              ? `Smart Match complete ${'\u00b7'} ${run.client_count} client${run.client_count !== 1 ? 's' : ''} processed`
              : `Smart Match running ${'\u00b7'} ${run.clients_complete} of ${run.client_count} complete`}
          </span>
        </div>
      )}
    </div>
  );
}