'use client';
import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { UserButton } from '@clerk/nextjs';
import { Menu } from 'lucide-react';
import { Sidebar } from '@/components/sidebar';
import { AiChatWidget } from '@/components/ai-chat-widget';
import { ClientContextBanner } from '@/components/client-context-banner';
import { BusinessMode } from '@/types';

interface AppShellProps {
  mode: BusinessMode;
  children: React.ReactNode;
}

function getClientContext(): { businessId: string; businessName: string } | null {
  if (typeof document === 'undefined') return null;
  const cookies = Object.fromEntries(
    document.cookie.split('; ').map((c) => {
      const [k, ...v] = c.split('=');
      return [k, v.join('=')];
    }),
  );
  const id   = cookies['client-business-id'];
  const name = cookies['client-business-name'];
  if (!id || !name) return null;
  return { businessId: id, businessName: decodeURIComponent(name) };
}

export function AppShell({ mode, children }: AppShellProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [clientCtx, setClientCtx]   = useState<{ businessId: string; businessName: string } | null>(null);
  const pathname = usePathname();

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  // Re-read cookies whenever the pathname changes so the banner
  // appears/disappears correctly as the accountant navigates
  useEffect(() => {
    setClientCtx(getClientContext());
  }, [pathname]);

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar
        mode={mode}
        isMobileOpen={mobileOpen}
        onClose={() => setMobileOpen(false)}
      />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="h-14 md:h-14 border-b border-border bg-card flex items-center justify-between px-3 md:justify-end md:px-6 flex-shrink-0">
          {/* Hamburger — mobile only */}
          <button
            onClick={() => setMobileOpen(true)}
            className="md:hidden flex items-center justify-center w-12 h-12 rounded-xl hover:bg-accent active:bg-accent/80 transition-colors touch-manipulation"
            aria-label="Open navigation menu"
          >
            <Menu className="w-6 h-6 text-foreground" />
          </button>
          {/* App name — mobile only */}
          <span className="md:hidden text-sm font-semibold text-foreground">Tempo</span>
          <UserButton appearance={{ elements: { avatarBox: 'w-9 h-9' } }} />
        </header>

        {/* Client context banner — shown when accountant is viewing client books */}
        {clientCtx && (
          <div className="px-4 pt-3 flex-shrink-0">
            <ClientContextBanner
              clientName={clientCtx.businessName}
              businessId={clientCtx.businessId}
            />
          </div>
        )}

        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
      <AiChatWidget />
    </div>
  );
}
