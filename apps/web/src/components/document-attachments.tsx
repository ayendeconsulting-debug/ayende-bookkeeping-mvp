'use client';

import { useState, useRef, useTransition } from 'react';
import { Paperclip, Upload, Trash2, Download, FileText, Image, Loader2, AlertCircle } from 'lucide-react';
import {
  getDocumentUploadUrl, saveDocumentRecord, getDocumentDownloadUrl, deleteDocument,
} from '@/app/(app)/transactions/actions';
import { toastSuccess, toastError } from '@/lib/toast';
import { AdminOnly } from '@/components/admin-only';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';

interface StoredDocument {
  id: string; file_name: string; file_type: string; file_size_bytes: number; created_at: string;
}

interface DocumentAttachmentsProps {
  rawTransactionId: string;
  initialDocuments?: StoredDocument[];
}

const ACCEPTED_TYPES  = '.pdf,.jpg,.jpeg,.png';
const MAX_SIZE_BYTES  = 10 * 1024 * 1024;

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

export function DocumentAttachments({ rawTransactionId, initialDocuments = [] }: DocumentAttachmentsProps) {
  const [documents, setDocuments] = useState<StoredDocument[]>(initialDocuments);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
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
      const urlResult = await getDocumentUploadUrl({ rawTransactionId, fileName: file.name, fileType: ext, fileSizeBytes: file.size });
      if (!urlResult.success || !urlResult.data) throw new Error(urlResult.error ?? 'Failed to get upload URL');

      const { upload_url, s3_key, s3_bucket } = urlResult.data;
      const s3Response = await fetch(upload_url, { method: 'PUT', body: file, headers: { 'Content-Type': file.type } });
      if (!s3Response.ok) throw new Error('S3 upload failed. Please try again.');

      const saveResult = await saveDocumentRecord({ rawTransactionId, s3Key: s3_key, s3Bucket: s3_bucket, fileName: file.name, fileType: ext, fileSizeBytes: file.size });
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
    if (result.success) { setDocuments((prev) => prev.filter((d) => d.id !== doc.id)); toastSuccess('Document removed', doc.file_name); }
    else toastError('Delete failed', result.error ?? 'Please try again.');
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
            {uploading ? 'Uploading…' : 'Attach file'}
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
            <div key={doc.id} className="flex items-center justify-between rounded-lg border border-border bg-muted/50 px-3 py-2">
              <div className="flex items-center gap-2 min-w-0">
                <FileIcon fileType={doc.file_type} />
                <div className="min-w-0">
                  <div className="text-xs font-medium text-foreground truncate max-w-[180px]">{doc.file_name}</div>
                  <div className="text-[10px] text-muted-foreground">{formatBytes(doc.file_size_bytes)}</div>
                </div>
              </div>
              <div className="flex items-center gap-1 flex-shrink-0">
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
          ))}
        </div>
      )}
    </div>
  );
}
