'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { bulkConfirmSmartMatch } from '@/app/(app)/transactions/smart-match-actions';
import { toastSuccess, toastError } from '@/lib/toast';

interface SmartMatchConfirmBarProps {
  suggestedCount: number;
  onDone: () => void;
}

export function SmartMatchConfirmBar({ suggestedCount, onDone }: SmartMatchConfirmBarProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  if (suggestedCount === 0) return null;

  function handleConfirmAll() {
    startTransition(async () => {
      const result = await bulkConfirmSmartMatch();
      if (result.success && result.data) {
        const { confirmed, skipped } = result.data;
        toastSuccess(
          `${confirmed} classified${skipped > 0 ? `, ${skipped} skipped` : ''}.`,
        );
        onDone();
        router.refresh();
      } else {
        toastError(result.error ?? 'Bulk confirm failed.');
      }
    });
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 z-30 border-t border-border bg-background/95 backdrop-blur-sm px-6 py-3 flex items-center justify-between gap-4 shadow-lg">
      <div className="flex items-center gap-2">
        <Sparkles className="w-4 h-4 text-accent-teal flex-shrink-0" />
        <span className="text-sm font-medium text-foreground">
          {suggestedCount} transaction{suggestedCount !== 1 ? 's' : ''} ready to confirm
        </span>
        <span className="text-xs text-muted-foreground hidden sm:inline">
          {'\u00b7'} Review each row or accept all suggestions at once
        </span>
      </div>
      <Button
        size="sm"
        onClick={handleConfirmAll}
        disabled={isPending}
        className="bg-accent-teal hover:bg-accent-teal/90 text-white flex-shrink-0"
      >
        <Sparkles className="w-3.5 h-3.5 mr-1.5" />
        {isPending ? 'Confirming...' : `Confirm all ${suggestedCount}`}
      </Button>
    </div>
  );
}