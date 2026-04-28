'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import { Loader2, Download, AlertTriangle, FileArchive } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { toastSuccess, toastError, toastInfo } from '@/lib/toast';
import {
  preflightExport,
  submitExport,
  getExportStatus,
  getExportDownloadUrl,
  type PreflightResult,
  type ExportStatusResponse,
} from '@/app/(app)/reports/receipt-export/actions';

const POLL_INTERVAL_MS = 3000;
const PREFLIGHT_DEBOUNCE = 400;
const POLL_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes

type Phase = 'picker' | 'polling' | 'complete' | 'failed';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function todayISO(): string {
  return new Date().toISOString().split('T')[0];
}
function ninetyDaysAgoISO(): string {
  const d = new Date();
  d.setDate(d.getDate() - 90);
  return d.toISOString().split('T')[0];
}

export function ReceiptExportModal({ open, onOpenChange }: Props) {
  // Picker state
  const [startDate, setStartDate] = useState(ninetyDaysAgoISO());
  const [endDate, setEndDate] = useState(todayISO());
  const [acknowledgePartial, setAcknowledgePartial] = useState(false);
  const [preflight, setPreflight] = useState<PreflightResult | null>(null);
  const [preflightError, setPreflightError] = useState<string | null>(null);
  const [preflightLoading, setPreflightLoading] = useState(false);

  // Job/poll state
  const [phase, setPhase] = useState<Phase>('picker');
  const [, setJobId] = useState<string | null>(null);
  const [status, setStatus] = useState<ExportStatusResponse | null>(null);
  const [submitErr, setSubmitErr] = useState<string | null>(null);
  const [downloadErr, setDownloadErr] = useState<string | null>(null);

  const [isSubmitting, startSubmit] = useTransition();
  const [isDownloading, setIsDownloading] = useState(false);

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pollTimeRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const jobIdRef = useRef<string | null>(null);

  function clearTimers() {
    if (pollRef.current) clearInterval(pollRef.current);
    if (pollTimeRef.current) clearTimeout(pollTimeRef.current);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    pollRef.current = null;
    pollTimeRef.current = null;
    debounceRef.current = null;
  }

  // Cleanup on unmount
  useEffect(() => () => clearTimers(), []);

  // Reset all state (used when modal closes or on retry-from-scratch)
  function resetAll() {
    clearTimers();
    setStartDate(ninetyDaysAgoISO());
    setEndDate(todayISO());
    setAcknowledgePartial(false);
    setPreflight(null);
    setPreflightError(null);
    setPreflightLoading(false);
    setPhase('picker');
    setJobId(null);
    jobIdRef.current = null;
    setStatus(null);
    setSubmitErr(null);
    setDownloadErr(null);
    setIsDownloading(false);
  }

  function handleOpenChange(o: boolean) {
    if (!o) {
      // Leave a breadcrumb if the user closes mid-poll
      if (phase === 'polling' && jobIdRef.current) {
        toastInfo(
          'Export running in background',
          `Job ID: ${jobIdRef.current.slice(0, 8)}...`,
        );
      }
      resetAll();
    }
    onOpenChange(o);
  }

  // Preflight on date change with debounce
  useEffect(() => {
    if (phase !== 'picker' || !open) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);

    setPreflightLoading(true);
    setPreflightError(null);

    debounceRef.current = setTimeout(async () => {
      const res = await preflightExport(startDate, endDate);
      setPreflightLoading(false);
      if (res.success) {
        setPreflight(res.data);
        if (res.data.ai_cap_exceeded_by === 0) setAcknowledgePartial(false);
      } else {
        setPreflight(null);
        setPreflightError(res.error);
      }
    }, PREFLIGHT_DEBOUNCE);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [startDate, endDate, phase, open]);

  // Start polling for the given job ID
  function startPolling(id: string) {
    setJobId(id);
    jobIdRef.current = id;
    setPhase('polling');

    pollRef.current = setInterval(async () => {
      const cur = jobIdRef.current;
      if (!cur) return;
      const res = await getExportStatus(cur);
      if (!res.success) {
        // Transient error - keep polling
        return;
      }
      setStatus(res.data);
      if (res.data.status === 'complete') {
        clearTimers();
        setPhase('complete');
        toastSuccess(
          'Receipt export ready',
          `${res.data.extracts_completed} receipts processed`,
        );
      } else if (res.data.status === 'failed') {
        clearTimers();
        setPhase('failed');
        toastError(
          'Receipt export failed',
          res.data.error_message ?? 'See details in the modal',
        );
      }
    }, POLL_INTERVAL_MS);

    pollTimeRef.current = setTimeout(() => {
      clearTimers();
      setPhase('failed');
      setStatus((s) =>
        s
          ? {
              ...s,
              status: 'failed',
              error_message:
                'Polling timed out after 5 minutes. The export may still be running; check back later.',
            }
          : s,
      );
    }, POLL_TIMEOUT_MS);
  }

  // Submit handler
  function handleSubmit() {
    if (!preflight) return;
    setSubmitErr(null);
    startSubmit(async () => {
      const out = await submitExport(startDate, endDate, acknowledgePartial);
      if (out.kind === 'ok') {
        startPolling(out.data.job_id);
      } else if (out.kind === 'already_running') {
        toastInfo('Existing export in progress', 'Switching to that job');
        startPolling(out.existing_job_id);
      } else if (out.kind === 'cap_exceeded') {
        // Rare - client gate already handles this
        setPreflight(out.preflight);
        setAcknowledgePartial(false);
        setSubmitErr('AI cap exceeded. Please re-confirm partial export.');
      } else if (out.kind === 'bad_request') {
        setSubmitErr(out.message);
      } else {
        setSubmitErr(out.message);
        toastError('Submit failed', out.message);
      }
    });
  }

  // Download handler
  async function handleDownload() {
    if (!jobIdRef.current) return;
    setIsDownloading(true);
    setDownloadErr(null);
    const res = await getExportDownloadUrl(jobIdRef.current);
    setIsDownloading(false);
    if (res.success) {
      window.location.href = res.data.url;
    } else {
      setDownloadErr(res.error);
      toastError('Download failed', res.error);
    }
  }

  // Retry from failed state - reset phase but keep date range
  function handleRetry() {
    clearTimers();
    setPhase('picker');
    setJobId(null);
    jobIdRef.current = null;
    setStatus(null);
    setSubmitErr(null);
    setDownloadErr(null);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Bulk receipt export</DialogTitle>
          <DialogDescription>
            Download all your receipts in a date range as a single zip file.
          </DialogDescription>
        </DialogHeader>

        {/* PICKER PHASE */}
        {phase === 'picker' && (
          <div className="flex flex-col gap-4 mt-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <Label>Start date</Label>
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>End date</Label>
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>
            </div>

            {preflightLoading && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                Counting receipts...
              </div>
            )}
            {preflightError && (
              <p className="text-sm text-destructive">{preflightError}</p>
            )}
            {preflight && !preflightLoading && (
              <div className="rounded-lg border border-border bg-muted/30 px-3 py-2.5 text-sm space-y-1">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Receipts found</span>
                  <span className="font-medium">{preflight.receipts_found}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Already extracted</span>
                  <span className="font-medium">
                    {preflight.receipts_with_extract}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Need extraction</span>
                  <span className="font-medium">
                    {preflight.receipts_needing_extract}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">AI cap remaining</span>
                  <span className="font-medium">
                    {preflight.ai_cap_remaining}
                  </span>
                </div>
              </div>
            )}

            {preflight && preflight.ai_cap_exceeded_by > 0 && (
              <div className="rounded-lg border border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-950/30 px-3 py-2.5">
                <div className="flex gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                  <div className="text-xs text-amber-800 dark:text-amber-200">
                    <p className="font-medium">
                      AI cap exceeded by {preflight.ai_cap_exceeded_by} receipts
                    </p>
                    <p className="mt-1">
                      Receipts beyond your remaining AI cap will be included in
                      the zip but without extracted data in the manifest.
                    </p>
                  </div>
                </div>
                <label className="flex items-center gap-2 mt-2.5 text-xs text-amber-900 dark:text-amber-100 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={acknowledgePartial}
                    onChange={(e) => setAcknowledgePartial(e.target.checked)}
                    className="rounded border-amber-400"
                  />
                  I understand some receipts will not be processed
                </label>
              </div>
            )}

            {submitErr && (
              <p className="text-sm text-destructive">{submitErr}</p>
            )}
          </div>
        )}

        {/* POLLING PHASE */}
        {phase === 'polling' && status && (
          <div className="flex flex-col gap-4 mt-2">
            <div className="flex items-center gap-3">
              <Loader2 className="w-5 h-5 animate-spin text-primary" />
              <div>
                <p className="text-sm font-medium">
                  {status.status === 'queued'
                    ? 'Queued...'
                    : 'Processing receipts...'}
                </p>
                <p className="text-xs text-muted-foreground">
                  {status.extracts_required > 0
                    ? `${
                        status.extracts_completed +
                        status.extracts_failed +
                        status.extracts_cap_exceeded
                      } of ${status.extracts_required} extracts processed`
                    : `${status.receipts_total} receipts to package`}
                </p>
              </div>
            </div>
            <div className="rounded-lg bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
              You can close this dialog. Your export will continue running in
              the background; refresh the page to check status.
            </div>
          </div>
        )}

        {/* COMPLETE PHASE */}
        {phase === 'complete' && status && (
          <div className="flex flex-col gap-4 mt-2">
            <div className="flex items-center gap-3">
              <FileArchive className="w-5 h-5 text-primary" />
              <div>
                <p className="text-sm font-medium">Export ready</p>
                <p className="text-xs text-muted-foreground">
                  {status.extracts_completed} processed
                  {status.extracts_failed > 0 &&
                    ` - ${status.extracts_failed} failed`}
                  {status.extracts_cap_exceeded > 0 &&
                    ` - ${status.extracts_cap_exceeded} skipped (cap)`}
                </p>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Download expires in 7 days. Each click issues a fresh signed link.
            </p>
            {downloadErr && (
              <p className="text-sm text-destructive">{downloadErr}</p>
            )}
          </div>
        )}

        {/* FAILED PHASE */}
        {phase === 'failed' && (
          <div className="flex flex-col gap-3 mt-2">
            <div className="flex gap-2">
              <AlertTriangle className="w-4 h-4 text-destructive flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium">Export failed</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {status?.error_message ?? 'An unexpected error occurred.'}
                </p>
              </div>
            </div>
          </div>
        )}

        <DialogFooter>
          {phase === 'picker' && (
            <>
              <Button
                variant="outline"
                onClick={() => handleOpenChange(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={
                  isSubmitting ||
                  !preflight ||
                  preflight.receipts_found === 0 ||
                  (preflight.ai_cap_exceeded_by > 0 && !acknowledgePartial)
                }
              >
                {isSubmitting ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : null}
                Start export
              </Button>
            </>
          )}
          {phase === 'polling' && (
            <Button variant="outline" onClick={() => handleOpenChange(false)}>
              Close
            </Button>
          )}
          {phase === 'complete' && (
            <>
              <Button
                variant="outline"
                onClick={() => handleOpenChange(false)}
              >
                Close
              </Button>
              <Button onClick={handleDownload} disabled={isDownloading}>
                {isDownloading ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <Download className="w-4 h-4 mr-2" />
                )}
                Download zip
              </Button>
            </>
          )}
          {phase === 'failed' && (
            <>
              <Button
                variant="outline"
                onClick={() => handleOpenChange(false)}
              >
                Close
              </Button>
              <Button onClick={handleRetry}>Try again</Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
