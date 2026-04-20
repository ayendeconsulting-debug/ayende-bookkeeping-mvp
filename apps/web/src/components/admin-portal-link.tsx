'use client';

import Link from 'next/link';
import { Shield } from 'lucide-react';
import { usePlatformAdmin } from '@/hooks/use-platform-admin';

export function AdminPortalLink({ onClose }: { onClose?: () => void }) {
  const { isAdmin, loading } = usePlatformAdmin();

  if (loading || !isAdmin) return null;

  return (
    <div className="px-2 py-3 border-t border-border">
      <Link
        href="/admin"
        onClick={onClose}
        className="flex items-center gap-2.5 px-2.5 py-2 min-h-[44px] rounded-md text-sm transition-colors text-muted-foreground hover:bg-muted hover:text-foreground"
      >
        <Shield className="w-4 h-4 flex-shrink-0" />
        <span className="truncate">Platform Admin</span>
      </Link>
    </div>
  );
}
