'use client';

import Link from 'next/link';
import { useCurrentFirm } from '@/hooks/use-current-firm';
import { useSubscription } from '@/hooks/use-subscription';
import { Building2, Plus } from 'lucide-react';

export function FirmPortalLink({ onClose }: { onClose?: () => void }) {
  const { hasFirm, loading: firmLoading } = useCurrentFirm();
  const { plan, loading: planLoading } = useSubscription();

  // Hide while loading or if not on Accountant plan
  if (firmLoading || planLoading) return null;
  if (plan !== 'accountant') return null;

  if (!hasFirm) {
    return (
      <div className="px-2 py-3 border-t border-border">
        <Link
          href="/accountant-setup"
          onClick={onClose}
          className="flex items-center gap-2.5 px-2.5 py-2 min-h-[44px] rounded-md text-sm transition-colors text-primary hover:bg-primary-light dark:hover:bg-primary/20"
        >
          <Plus className="w-4 h-4 flex-shrink-0" />
          <span className="truncate font-medium">Set Up Firm Portal</span>
        </Link>
      </div>
    );
  }

  return (
    <div className="px-2 py-3 border-t border-border">
      <Link
        href="/accountant/clients"
        onClick={onClose}
        className="flex items-center gap-2.5 px-2.5 py-2 min-h-[44px] rounded-md text-sm transition-colors text-foreground hover:bg-muted"
      >
        <Building2 className="w-4 h-4 flex-shrink-0" />
        <span className="truncate">Switch to Firm Portal</span>
      </Link>
    </div>
  );
}
