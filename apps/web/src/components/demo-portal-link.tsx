'use client';

import { useDemoAccess } from '@/hooks/use-demo-access';

/**
 * DemoPortalLink
 *
 * Renders a "Demo Mode" indicator in the sidebar for users with
 * platform_role: 'demo'. Invisible to regular users and admins.
 *
 * Purpose: gives marketing agencies a clear visual signal that they
 * are operating in a demo environment, without exposing any admin surfaces.
 */
export function DemoPortalLink() {
  const { hasDemoAccess, isAdmin, loading } = useDemoAccess();

  // Hidden while loading, hidden for regular users, hidden for admins
  // (admins see the full admin panel link instead)
  if (loading || !hasDemoAccess || isAdmin) return null;

  return (
    <div className="px-3 py-3 border-t border-border">
      <div className="flex items-center gap-2.5 px-2.5 py-2 rounded-md">
        {/* Pulsing dot indicator */}
        <span className="relative flex h-2.5 w-2.5 flex-shrink-0">
          <span
            className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75"
            style={{ backgroundColor: 'var(--accent-teal)' }}
          />
          <span
            className="relative inline-flex rounded-full h-2.5 w-2.5"
            style={{ backgroundColor: 'var(--accent-teal)' }}
          />
        </span>
        <span className="text-xs font-semibold tracking-wide" style={{ color: 'var(--accent-teal)' }}>
          Demo Mode
        </span>
      </div>
    </div>
  );
}
