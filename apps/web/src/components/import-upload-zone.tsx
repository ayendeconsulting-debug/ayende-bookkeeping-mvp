'use client';

import { useState, useRef, useCallback } from 'react';
import { Account } from '@/types';
import { getImportUploadUrl, createImportBatch } from '@/app/(app)/transactions/import/actions';
import { ImportBatchStatus } from '@/components/import-batch-status';

interface Props {
  accounts: Account[];
}

type UploadState = 'idle' | 'uploading' | 'processing' | 'done' | 'error';

export function ImportUploadZone({ accounts }: Props) {
  const [dragOver, setDragOver] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [sourceAccountId, setSourceAccountId] = useState('');
  const [uploadState, setUploadState] = useState<UploadState>('idle');
  const [uploadProgress, setUploadProgress] = useState(0);
  const [errorMsg, setErrorMsg] = useState('');
  const [batchId, setBatchId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const ACCEPTED_TYPES = ['text/csv', 'application/csv', 'application/pdf', 'text/plain'];
  const ACCEPTED_EXT = ['.csv', '.pdf'];

  const isValidFile = (f: File) => {
    const ext = '.' + f.name.split('.').pop()?.toLowerCase();
    return ACCEPTED_EXT.includes(ext) || ACCEPTED_TYPES.includes(f.type);
  };

  const getFileType = (f: File): 'csv' | 'pdf' => {
    return f.name.toLowerCase().endsWith('.pdf') ? 'pdf' : 'csv';
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const dropped = e.dataTransfer.files[0];
    if (dropped && isValidFile(dropped)) {
      setFile(dropped);
      setErrorMsg('');
    } else {
      setErrorMsg('Only CSV and PDF files are accepted.');
    }
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected && isValidFile(selected)) {
      setFile(selected);
      setErrorMsg('');
    }
  };

  const handleUpload = async () => {
    if (!file || !sourceAccountId) return;
    setUploadState('uploading');
    setUploadProgress(0);
    setErrorMsg('');

    try {
      // Step 1: Get pre-signed URL
      const urlRes = await getImportUploadUrl({
        file_name: file.name,
        file_type: getFileType(file),
        file_size_bytes: file.size,
      });
      if (!urlRes.success || !urlRes.data) throw new Error(urlRes.error ?? 'Failed to get upload URL');

      // Step 2: Upload directly to S3
      const xhr = new XMLHttpRequest();
      await new Promise<void>((resolve, reject) => {
        xhr.upload.addEventListener('progress', (e) => {
          if (e.lengthComputable) setUploadProgress(Math.round((e.loaded / e.total) * 90));
        });
        xhr.addEventListener('load', () => {
          if (xhr.status >= 200 && xhr.status < 300) resolve();
          else reject(new Error(`S3 upload failed: ${xhr.status}`));
        });
        xhr.addEventListener('error', () => reject(new Error('Upload failed — check your connection')));
        xhr.open('PUT', urlRes.data!.upload_url);
        xhr.setRequestHeader('Content-Type', getFileType(file) === 'pdf' ? 'application/pdf' : 'text/csv');
        xhr.send(file);
      });
      setUploadProgress(95);

      // Step 3: Create batch record
      const batchRes = await createImportBatch({
        file_name: file.name,
        file_type: getFileType(file),
        file_size: file.size,
        s3_key: urlRes.data.s3_key,
        s3_bucket: urlRes.data.s3_bucket,
        source_account_id: sourceAccountId,
      });
      if (!batchRes.success || !batchRes.data) throw new Error(batchRes.error ?? 'Failed to create batch');

      setUploadProgress(100);
      setUploadState('processing');
      setBatchId(batchRes.data.id);
    } catch (err: any) {
      setUploadState('error');
      setErrorMsg(err.message ?? 'Upload failed. Please try again.');
    }
  };

  const handleReset = () => {
    setFile(null);
    setSourceAccountId('');
    setUploadState('idle');
    setUploadProgress(0);
    setErrorMsg('');
    setBatchId(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const formatBytes = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  // ── Batch completed state ─────────────────────────────────────────────────
  if (batchId && uploadState === 'processing') {
    return (
      <div className="space-y-4">
        <ImportBatchStatus batchId={batchId} onReset={handleReset} />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Drop zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => !file && fileInputRef.current?.click()}
        className="relative rounded-xl border-2 border-dashed transition-all duration-200 cursor-pointer"
        style={{
          borderColor: dragOver ? 'var(--accent-teal)' : file ? 'var(--accent-teal)' : 'var(--border)',
          backgroundColor: dragOver ? 'var(--accent-teal-muted)' : 'var(--card)',
        }}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv,.pdf"
          className="hidden"
          onChange={handleFileSelect}
        />

        <div className="px-8 py-10 flex flex-col items-center gap-3 text-center">
          {!file ? (
            <>
              <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
                <svg className="w-6 h-6 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                    d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">
                  Drop your file here, or{' '}
                  <span style={{ color: 'var(--accent-teal)' }}>browse</span>
                </p>
                <p className="text-xs text-muted-foreground mt-1">CSV and PDF bank statements — max 10 MB</p>
              </div>
            </>
          ) : (
            <div className="flex items-center gap-3 w-full max-w-sm">
              <div
                className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{ backgroundColor: 'var(--accent-teal-muted)' }}
              >
                <svg className="w-5 h-5" style={{ color: 'var(--accent-teal)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div className="text-left flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">{file.name}</p>
                <p className="text-xs text-muted-foreground">
                  {getFileType(file).toUpperCase()} · {formatBytes(file.size)}
                </p>
              </div>
              <button
                onClick={(e) => { e.stopPropagation(); handleReset(); }}
                className="w-7 h-7 rounded-full bg-muted hover:bg-accent flex items-center justify-center flex-shrink-0 transition-colors"
              >
                <svg className="w-4 h-4 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Error */}
      {errorMsg && (
        <p className="text-sm text-red-500 dark:text-red-400">{errorMsg}</p>
      )}

      {/* Source account + upload button */}
      {file && uploadState === 'idle' && (
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
          <div className="flex-1">
            <label className="block text-xs font-medium text-muted-foreground mb-1">
              Source account <span className="text-red-500">*</span>
            </label>
            <select
              value={sourceAccountId}
              onChange={(e) => setSourceAccountId(e.target.value)}
              className="w-full rounded-lg border border-border bg-input text-foreground text-sm px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[var(--accent-teal)]"
            >
              <option value="">Select the account this file is from…</option>
              {accounts.map((a: any) => (
                <option key={a.id} value={a.id}>
                  {a.name} {a.code ? `(${a.code})` : ''}
                </option>
              ))}
            </select>
          </div>
          <button
            onClick={handleUpload}
            disabled={!sourceAccountId}
            className="mt-5 sm:mt-0 px-5 py-2 rounded-lg text-sm font-semibold text-white transition-opacity disabled:opacity-40 disabled:cursor-not-allowed flex-shrink-0"
            style={{ backgroundColor: 'var(--accent-teal)' }}
          >
            Upload & Import
          </button>
        </div>
      )}

      {/* Upload progress */}
      {uploadState === 'uploading' && (
        <div className="space-y-2">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Uploading {file?.name}…</span>
            <span>{uploadProgress}%</span>
          </div>
          <div className="h-1.5 rounded-full bg-muted overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-300"
              style={{ width: `${uploadProgress}%`, backgroundColor: 'var(--accent-teal)' }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
