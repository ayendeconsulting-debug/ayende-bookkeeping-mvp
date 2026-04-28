import { ReceiptExportPageClient } from '@/components/receipt-export-page-client';

export default function ReceiptExportPage() {
  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-foreground">
          Bulk receipt export
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Download all your receipts in a date range as a single zip file with
          a manifest CSV. Useful for year-end backups and accountant handoffs.
        </p>
      </div>
      <ReceiptExportPageClient />
    </div>
  );
}
