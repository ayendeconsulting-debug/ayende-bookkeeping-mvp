'use client';

import Link from 'next/link';
import { useCurrentFirm } from '@/hooks/use-current-firm';
import { Building2, Plus } from 'lucide-react';

export function FirmPortalLink({ onClose }: { onClose?: () => void }) {
  const { hasFirm, loading } = useCurrentFirm();

  if (loading) return null;

  if (!hasFirm) {
    return (
      <div className="px-2 py-3 border-t border-[#e5e1d8] dark:border-[#3a3730]">
        <Link
          href="/accountant-setup"
          onClick={onClose}
          className="flex items-center gap-2.5 px-2.5 py-2 min-h-[44px] rounded-md text-sm transition-colors text-[#0F6E56] dark:text-[#4abe94] hover:bg-[#EDF7F2] dark:hover:bg-[#0F6E56]/20"
        >
          <Plus className="w-4 h-4 flex-shrink-0" />
          <span className="truncate font-medium">Set Up Firm Portal</span>
        </Link>
      </div>
    );
  }

  return (
    <div className="px-2 py-3 border-t border-[#e5e1d8] dark:border-[#3a3730]">
      <Link
        href="/accountant/clients"
        onClick={onClose}
        className="flex items-center gap-2.5 px-2.5 py-2 min-h-[44px] rounded-md text-sm transition-colors text-[#4A4438] dark:text-[#c8c0b0] hover:bg-[#f0ede8] dark:hover:bg-[#2e2c28] hover:text-[#1a1814] dark:hover:text-[#f0ede8]"
      >
        <Building2 className="w-4 h-4 flex-shrink-0" />
        <span className="truncate">Switch to Firm Portal</span>
      </Link>
    </div>
  );
}
