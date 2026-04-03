'use client';

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { UserButton } from '@clerk/nextjs';
import { Menu } from 'lucide-react';
import { Sidebar } from '@/components/sidebar';
import { AiChatWidget } from '@/components/ai-chat-widget';
import { BusinessMode } from '@/types';

interface AppShellProps {
  mode: BusinessMode;
  children: React.ReactNode;
}

export function AppShell({ mode, children }: AppShellProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  return (
    <div className="flex h-screen overflow-hidden bg-background">

      <Sidebar
        mode={mode}
        isMobileOpen={mobileOpen}
        onClose={() => setMobileOpen(false)}
      />

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="h-14 border-b border-border bg-card flex items-center justify-between px-4 md:justify-end md:px-6 flex-shrink-0">
          <button
            onClick={() => setMobileOpen(true)}
            className="md:hidden flex items-center justify-center w-9 h-9 min-h-[44px] min-w-[44px] rounded-md hover:bg-accent transition-colors"
            aria-label="Open navigation menu"
          >
            <Menu className="w-5 h-5 text-muted-foreground" />
          </button>

          {/* App name — mobile only */}
          <span className="md:hidden text-sm font-semibold text-foreground">Tempo</span>

          <UserButton appearance={{ elements: { avatarBox: 'w-8 h-8' } }} />
        </header>

        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>

      <AiChatWidget />
    </div>
  );
}
