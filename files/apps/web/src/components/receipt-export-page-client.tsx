'use client';

import { useState } from 'react';
import { FileArchive } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ReceiptExportModal } from '@/components/receipt-export-modal';

export function ReceiptExportPageClient() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <div className="bg-card border border-border rounded-xl p-6">
        <div className="flex flex-col items-start gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <FileArchive className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">
                Export your receipts
              </p>
              <p className="text-xs text-muted-foreground">
                Choose a date range to package all attached receipts into a
                downloadable zip.
              </p>
            </div>
          </div>
          <Button onClick={() => setOpen(true)}>Open export wizard</Button>
        </div>
      </div>

      <ReceiptExportModal open={open} onOpenChange={setOpen} />
    </>
  );
}
