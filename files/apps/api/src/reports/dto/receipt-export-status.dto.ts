import { ReceiptExportStatus } from '../../entities/receipt-export-job.entity';

/**
 * Phase 31b.6 - Response shape for GET /reports/receipt-export/status/:jobId.
 *
 * Whitelist (per FR-31-6-10): excludes download_key (internal S3 path) and
 * user_email (internal recipient field). Frontend uses this for polling
 * progress + showing extract counts.
 *
 * completed_at and expires_at are null until the job finishes. error_message
 * is null unless status === 'failed'. extracts_completed / extracts_failed /
 * extracts_cap_exceeded are 0 until the run() body tallies outcomes.
 */
export class ReceiptExportStatusResponseDto {
  job_id: string;
  status: ReceiptExportStatus;
  receipts_total: number;
  extracts_required: number;
  extracts_completed: number;
  extracts_failed: number;
  extracts_cap_exceeded: number;
  start_date: string; // YYYY-MM-DD
  end_date: string;   // YYYY-MM-DD
  created_at: string; // ISO 8601
  completed_at: string | null;
  expires_at: string | null;
  error_message: string | null;
}
