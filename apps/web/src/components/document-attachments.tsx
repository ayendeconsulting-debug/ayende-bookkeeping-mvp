'use client';

import { useState, useRef } from 'react';
import { Paperclip, Upload, Trash2, Download, FileText, Image, Loader2, AlertCircle, Sparkles, AlertTriangle, CheckCircle2 } from 'lucide-react';
import {
  getDocumentUploadUrl, saveDocumentRecord, getDocumentDownloadUrl, deleteDocument,
  extractReceipt, pollAiJob,
} from '@/app/(app)/transactions/actions';
import { toastSuccess, toastError } from '@/lib/toast';
import { AdminOnly } from '@/components/admin-only';
import { Button } from '@/components/ui/button';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';

interface StoredDocument {
  id: string; file_name: string; file_type: string; file_size_bytes: number; created_at: string;
}

interface ReceiptExtractResult {
  vendor: string;
  amount: number;
  date: string;
  currency: string;
  confidence: number;
}

type ExtractState =
  | { status: 'idle' }
  | { status: 'extracting' }
  | { status: 'complete'; result: ReceiptExtractResult }
  | { status: 'low_confidence' }
  | { status: 'failed'; message: string };

interface DocumentAttachmentsProps {
  rawTransactionId?: string;
  journalEntryId?: string;
  initialDocuments?: StoredDocument[];
  // Phase 29d.1 - optional, used by mismatch detection on the result card.
  // Pass the bank-imported amount (signed) and date (yyyy-mm-dd) for the parent transaction.
  // When undefined, mismatch flagging is skipped silently.
  transactionAmount?: number;
  transactionDate?: string;
}

const ACCEPTED_TYPES  = '.pdf,.jpg,.jpeg,.png';
const MAX_SIZE_BYTES  = 10 * 1024 * 1024;
const POLL_INTERVAL_MS = 2000;
const MAX_POLLS = 12; // 12 * 2s = ~24s ceiling per FR-29-2 + DP-poll-cap stretch
const CONFIDENCE_THRESHOLD = 0.5;
const AMOUNT_TOLERANCE = 0.01;
const DATE_TOLERANCE_DAYS = 1;

function FileIcon({ fileType }: { fileType: string }) {
  if (['jpg', 'jpeg', 'png'].includes(fileType.toLowerCase())) {
    return <Image className="w-4 h-4 text-blue-500 flex-shrink-0" />;
  }
  return <FileText className="w-4 h-4 text-red-500 flex-shrink-0" />;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatExtractedDate(iso: string): string {
  // iso is yyyy-mm-dd; render as user-friendly localized date without timezone surprises
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return iso;
  const [y, m, d] = iso.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  return dt.toLocaleDateString('en-CA', { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatExtractedAmount(amount: number, currency: string): string {
  const formatted = amount.toFixed(2);
  return currency ? `${currency} ${formatted}` : formatted;
}

function dayDiff(isoA: string, isoB: string): number {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(isoA) || !/^\d{4}-\d{2}-\d{2}$/.test(isoB)) return NaN;
  const [ay, am, ad] = isoA.split('-').map(Number);
  const [by, bm, bd] = isoB.split('-').map(Number);
  const a = Date.UTC(ay, am - 1, ad);
  const b = Date.UTC(by, bm - 1, bd);
  return Math.abs(Math.round((a - b) / 86400000));
}

export function DocumentAttachments({
  rawTransactionId,
  journalEntryId,
  initialDocuments = [],
  transactionAmount,
  transactionDate,
}: DocumentAttachmentsProps) {
  const [documents, setDocuments] = useState<StoredDocument[]>(initialDocuments);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [extractStates, setExtractStates] = useState<Record<string, ExtractState>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';

    if (file.size > MAX_SIZE_BYTES) { setUploadError('File exceeds 10 MB limit.'); return; }

    const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
    if (!['pdf', 'jpg', 'jpeg', 'png'].includes(ext)) { setUploadError('Only PDF, JPG, and PNG files are supported.'); return; }

    setUploadError(null); setUploading(true);

    try {
      const urlResult = await getDocumentUploadUrl({ rawTransactionId, journalEntryId, fileName: file.name, fileType: ext, fileSizeBytes: file.size });
      if (!urlResult.success || !urlResult.data) throw new Error(urlResult.error ?? 'Failed to get upload URL');

      const { upload_url, s3_key, s3_bucket } = urlResult.data;
      const s3Response = await fetch(upload_url, { method: 'PUT', body: file, headers: { 'Content-Type': file.type } });
      if (!s3Response.ok) throw new Error('S3 upload failed. Please try again.');

      const saveResult = await saveDocumentRecord({ rawTransactionId, journalEntryId, s3Key: s3_key, s3Bucket: s3_bucket, fileName: file.name, fileType: ext, fileSizeBytes: file.size });
      if (!saveResult.success || !saveResult.data) throw new Error(saveResult.error ?? 'Failed to save document record');

      setDocuments((prev) => [saveResult.data as StoredDocument, ...prev]);
      toastSuccess('Document attached', file.name);
    } catch (err: any) {
      const msg = err.message ?? 'Upload failed';
      setUploadError(msg); toastError('Upload failed', msg);
    } finally {
      setUploading(false);
    }
  }

  async function handleDownload(doc: StoredDocument) {
    const result = await getDocumentDownloadUrl(doc.id);
    if (result.success && result.data) window.open(result.data.url, '_blank');
    else toastError('Download failed', result.error ?? 'Could not get download link.');
  }

  async function handleDelete(doc: StoredDocument) {
    const result = await deleteDocument(doc.id);
    if (result.success) {
      setDocuments((prev) => prev.filter((d) => d.id !== doc.id));
      // Drop any extract state for this document
      setExtractStates((prev) => {
        const next = { ...prev };
        delete next[doc.id];
        return next;
      });
      toastSuccess('Document removed', doc.file_name);
    } else {
      toastError('Delete failed', result.error ?? 'Please try again.');
    }
  }

  async function handleExtract(doc: StoredDocument) {
    setExtractStates((prev) => ({ ...prev, [doc.id]: { status: 'extracting' } }));

    const enqueue = await extractReceipt(doc.id);
    if (!enqueue.success || !enqueue.data) {
      const msg = enqueue.error ?? 'Failed to start AI extraction';
      // 429 surfaces here too - the AiUsageGuard message comes through verbatim.
      toastError('AI extract failed', msg);
      setExtractStates((prev) => ({ ...prev, [doc.id]: { status: 'failed', message: msg } }));
      return;
    }

    const jobId = enqueue.data.job_id;
    let polls = 0;

    const tick = async () => {
      polls += 1;
      const status = await pollAiJob(jobId);

      if (!status.success || !status.data) {
        const msg = status.error ?? 'Lost connection to AI job';
        toastError('AI extract failed', msg);
        setExtractStates((prev) => ({ ...prev, [doc.id]: { status: 'failed', message: msg } }));
        return;
      }

      const data = status.data;

      if (data.status === 'complete') {
        const result = data.result as ReceiptExtractResult | undefined;
        if (!result || typeof result.confidence !== 'number') {
          setExtractStates((prev) => ({ ...prev, [doc.id]: { status: 'failed', message: 'AI returned no result' } }));
          return;
        }
        if (result.confidence < CONFIDENCE_THRESHOLD) {
          setExtractStates((prev) => ({ ...prev, [doc.id]: { status: 'low_confidence' } }));
        } else {
          setExtractStates((prev) => ({ ...prev, [doc.id]: { status: 'complete', result } }));
          toastSuccess('Receipt extracted', `${result.vendor || 'Receipt'} - ${formatExtractedAmount(result.amount, result.currency)}`);
        }
        return;
      }

      if (data.status === 'failed') {
        const msg = 'AI extraction failed - please try again';
        toastError('AI extract failed', msg);
        setExtractStates((prev) => ({ ...prev, [doc.id]: { status: 'failed', message: msg } }));
        return;
      }

      if (polls >= MAX_POLLS) {
        const msg = 'Extraction is taking longer than expected. Try again or check back later.';
        toastError('AI extract timeout', msg);
        setExtractStates((prev) => ({ ...prev, [doc.id]: { status: 'failed', message: msg } }));
        return;
      }

      // queued or processing - continue polling
      setTimeout(() => { void tick(); }, POLL_INTERVAL_MS);
    };

    setTimeout(() => { void tick(); }, POLL_INTERVAL_MS);
  }

  function handleResetExtract(documentId: string) {
    setExtractStates((prev) => ({ ...prev, [documentId]: { status: 'idle' } }));
  }

  function renderExtractCard(doc: StoredDocument) {
    const state = extractStates[doc.id] ?? { status: 'idle' };

    if (state.status === 'idle' || state.status === 'extracting' || state.status === 'failed') {
      return null;
    }

    if (state.status === 'low_confidence') {
      return (
        <div className="ml-6 mt-1 rounded-lg border border-amber-200 bg-amber-50 dark:bg-amber-900/20 dark:border-amber-800 px-3 py-2">
          <div className="flex items-start gap-2">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="text-xs text-amber-800 dark:text-amber-300 font-medium">AI couldn&apos;t read this receipt clearly</p>
              <p className="text-[11px] text-amber-700 dark:text-amber-400 mt-0.5">Try a clearer photo if needed.</p>
            </div>
            <button type="button" onClick={() => handleResetExtract(doc.id)}
              className="text-[11px] text-amber-700 dark:text-amber-400 hover:underline flex-shrink-0">
              Reset
            </button>
          </div>
        </div>
      );
    }

    // complete
    const r = state.result;
    const hasAmountMismatch =
      typeof transactionAmount === 'number' &&
      Math.abs(Math.abs(transactionAmount) - r.amount) > AMOUNT_TOLERANCE;
    const hasDateMismatch =
      typeof transactionDate === 'string' &&
      !Number.isNaN(dayDiff(transactionDate.slice(0, 10), r.date)) &&
      dayDiff(transactionDate.slice(0, 10), r.date) > DATE_TOLERANCE_DAYS;
    const hasMismatch = hasAmountMismatch || hasDateMismatch;
    const hasComparisonContext = typeof transactionAmount === 'number' || typeof transactionDate === 'string';

    return (
      <div className="ml-6 mt-1 rounded-lg border border-emerald-200 bg-emerald-50/60 dark:bg-emerald-900/10 dark:border-emerald-800/60 px-3 py-2">
        <div className="flex items-center gap-1.5 mb-1">
          <Sparkles className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
          <span className="text-[10px] font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-400">AI Extracted</span>
        </div>
        <p className="text-xs text-foreground font-medium">
          {r.vendor || 'Unknown vendor'}
          <span className="text-muted-foreground font-normal"> · </span>
          {formatExtractedAmount(r.amount, r.currency)}
          <span className="text-muted-foreground font-normal"> · </span>
          {formatExtractedDate(r.date)}
        </p>

        {hasComparisonContext && !hasMismatch && (
          <div className="flex items-center gap-1 mt-1.5 text-[11px] text-emerald-700 dark:text-emerald-400">
            <CheckCircle2 className="w-3 h-3 flex-shrink-0" />
            Matches transaction
          </div>
        )}

        {hasAmountMismatch && (
          <div className="flex items-start gap-1 mt-1.5 text-[11px] text-amber-700 dark:text-amber-400">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 flex-shrink-0 mt-1" />
            <span>
              Amount differs from bank ({formatExtractedAmount(Math.abs(transactionAmount as number), r.currency || '')} on bank, {formatExtractedAmount(r.amount, r.currency)} on receipt)
            </span>
          </div>
        )}

        {hasDateMismatch && (
          <div className="flex items-start gap-1 mt-1.5 text-[11px] text-amber-700 dark:text-amber-400">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 flex-shrink-0 mt-1" />
            <span>
              Date differs from bank (bank: {formatExtractedDate((transactionDate as string).slice(0, 10))}, receipt: {formatExtractedDate(r.date)})
            </span>
          </div>
        )}

        <div className="flex justify-end mt-1.5">
          <button type="button" onClick={() => handleResetExtract(doc.id)}
            className="text-[11px] text-emerald-700 dark:text-emerald-400 hover:underline">
            Reset
          </button>
        </div>
      </div>
    );
  }

  function renderExtractButton(doc: StoredDocument) {
    const state = extractStates[doc.id] ?? { status: 'idle' };

    if (state.status === 'extracting') {
      return (
        <button type="button" disabled
          className="text-muted-foreground p-1 rounded opacity-60 cursor-wait" title="Extracting...">
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
        </button>
      );
    }

    if (state.status === 'idle' || state.status === 'failed') {
      return (
        <button type="button" onClick={() => handleExtract(doc)}
          className="text-muted-foreground hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors p-1 rounded"
          title="Extract with AI">
          <Sparkles className="w-3.5 h-3.5" />
        </button>
      );
    }

    // complete or low_confidence - card is shown below; no button
    return null;
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wide">
          <Paperclip className="w-3.5 h-3.5" />
          Attachments {documents.length > 0 && `(${documents.length})`}
        </div>
        <AdminOnly>
          <button type="button" onClick={() => fileInputRef.current?.click()} disabled={uploading}
            className="flex items-center gap-1 text-xs text-primary hover:text-primary/80 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
            {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
            {uploading ? 'Uploading...' : 'Attach file'}
          </button>
        </AdminOnly>
        <input ref={fileInputRef} type="file" accept={ACCEPTED_TYPES} onChange={handleFileSelect} className="hidden" />
      </div>

      {uploadError && (
        <div className="flex items-center gap-1.5 text-xs text-destructive">
          <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />{uploadError}
        </div>
      )}

      {documents.length === 0 && !uploading && (
        <p className="text-xs text-muted-foreground">No attachments yet. PDF, JPG, PNG up to 10 MB.</p>
      )}

      {documents.length > 0 && (
        <div className="flex flex-col gap-1.5">
          {documents.map((doc) => (
            <div key={doc.id} className="flex flex-col gap-1">
              <div className="flex items-center justify-between rounded-lg border border-border bg-muted/50 px-3 py-2">
                <div className="flex items-center gap-2 min-w-0">
                  <FileIcon fileType={doc.file_type} />
                  <div className="min-w-0">
                    <div className="text-xs font-medium text-foreground truncate max-w-[180px]">{doc.file_name}</div>
                    <div className="text-[10px] text-muted-foreground">{formatBytes(doc.file_size_bytes)}</div>
                  </div>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <AdminOnly>
                    {renderExtractButton(doc)}
                  </AdminOnly>
                  <button type="button" onClick={() => handleDownload(doc)}
                    className="text-muted-foreground hover:text-primary transition-colors p-1 rounded" title="Download">
                    <Download className="w-3.5 h-3.5" />
                  </button>
                  <AdminOnly>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <button type="button" className="text-muted-foreground hover:text-destructive transition-colors p-1 rounded" title="Remove">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Remove attachment?</AlertDialogTitle>
                          <AlertDialogDescription>{doc.file_name} will be permanently deleted.</AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleDelete(doc)} className="bg-destructive hover:bg-destructive/90 text-destructive-foreground">Remove</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </AdminOnly>
                </div>
              </div>
              {renderExtractCard(doc)}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
