/**
 * Phase 31b.2 fix - Queue constant + payload type extracted to its own file
 * to break the circular import between processor and service.
 *
 * Both processor.ts and service.ts import from here. Neither imports the other.
 */

export const RECEIPT_EXPORT_QUEUE = 'receipt-exports';

/**
 * BullMQ payload for receipt export jobs.
 *
 * The processor reads everything else from the receipt_export_jobs row
 * via jobRowId, so the queue payload stays minimal. Source of truth for
 * job state is the database row, not the BullMQ payload.
 */
export interface ReceiptExportJobData {
  jobRowId: string;
}