'use client';

import { useState, useTransition } from 'react';
import { ShieldCheck, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toastSuccess, toastError } from '@/lib/toast';
import { respondToAccessRequest, AccessRequest } from '@/app/(app)/settings/actions';

interface AccessRequestBannerProps { request: AccessRequest; }

export function AccessRequestBanner({ request }: AccessRequestBannerProps) {
  const [dismissed, setDismissed] = useState(false);
  const [responded, setResponded] = useState(false);
  const [responding, startResponding] = useTransition();

  if (dismissed || responded) return null;

  const firmName = request.firm?.name ?? 'An accountant firm';

  function handleRespond(decision: 'approved' | 'denied') {
    startResponding(async () => {
      const result = await respondToAccessRequest(request.id, decision);
      if (result.success) {
        toastSuccess(
          decision === 'approved' ? 'Access approved' : 'Access denied',
          decision === 'approved' ? `${firmName} now has edit access for 90 days.` : `${firmName}'s request has been denied.`,
        );
        setResponded(true);
      } else {
        toastError('Could not respond', result.error ?? 'Please try again.');
      }
    });
  }

  return (
    <div className="mb-5 flex items-start gap-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-xl px-4 py-3">
      <ShieldCheck className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-amber-700 dark:text-amber-400">
          {firmName} has requested edit access to your books
        </p>
        {request.access_note && (
          <p className="text-xs text-amber-600 dark:text-amber-500 mt-0.5">Reason: {request.access_note}</p>
        )}
        <div className="flex gap-2 mt-2">
          <Button size="sm" className="h-7 text-xs" disabled={responding} onClick={() => handleRespond('approved')}>
            Approve (90 days)
          </Button>
          <Button size="sm" variant="outline" className="text-destructive border-destructive/30 h-7 text-xs" disabled={responding} onClick={() => handleRespond('denied')}>
            Deny
          </Button>
          <a href="/settings" className="text-xs text-amber-600 dark:text-amber-400 underline self-center ml-1">View in settings</a>
        </div>
      </div>
      <button onClick={() => setDismissed(true)} className="text-amber-500 hover:text-amber-700 flex-shrink-0">
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}
