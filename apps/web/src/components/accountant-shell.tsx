'use client';

import { useState } from 'react';
import { AccountantSidebar } from '@/components/accountant-sidebar';
import { Menu, X } from 'lucide-react';

interface Firm {
  id: string;
  name: string;
  subdomain: string;
  logo_url: string | null;
  brand_colour: string | null;
}

interface AccountantShellProps {
  firm: Firm;
  children: React.ReactNode;
}

export function AccountantShell({ firm, children }: AccountantShellProps) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex md:w-64 md:flex-col border-r border-border">
        <AccountantSidebar firm={firm} />
      </aside>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Mobile sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 flex flex-col border-r border-border bg-background
          transform transition-transform duration-200 ease-in-out md:hidden
          ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}`}
      >
        <div className="flex items-center justify-end p-3 border-b border-border">
          <button
            onClick={() => setMobileOpen(false)}
            className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent"
          >
            <X size={18} />
          </button>
        </div>
        <AccountantSidebar firm={firm} onClose={() => setMobileOpen(false)} />
      </aside>

      {/* Main content */}
      <div className="flex flex-col flex-1 overflow-hidden">
        {/* Mobile top bar */}
        <header className="md:hidden flex items-center gap-3 px-4 py-3 border-b border-border bg-background">
          <button
            onClick={() => setMobileOpen(true)}
            className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent"
          >
            <Menu size={20} />
          </button>
          <span className="font-semibold text-sm text-foreground">{firm.name}</span>
        </header>

        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
