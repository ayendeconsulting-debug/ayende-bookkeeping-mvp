'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@clerk/nextjs';
import { Menu, X } from 'lucide-react';

const NAV_LINKS = [
  { label: 'Pricing',         href: '/pricing'      },
  { label: 'Features',        href: '/#features'    },
  { label: 'For Accountants', href: '/#accountants' },
  { label: 'About',           href: '/about'        },
  { label: 'FAQ',             href: '/#faq'         },
];

export function MarketingNav() {
  const { isSignedIn } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header className="border-b border-border bg-card/80 backdrop-blur-sm sticky top-0 z-40">
      <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2.5 flex-shrink-0" onClick={() => setMobileOpen(false)}>
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
            <svg viewBox="0 0 16 16" className="w-5 h-5">
              <rect x="1"   y="10" width="3" height="5"  rx="0.5" fill="white" opacity="0.5"/>
              <rect x="6.5" y="7"  width="3" height="8"  rx="0.5" fill="white" opacity="0.75"/>
              <rect x="12"  y="3"  width="3" height="12" rx="0.5" fill="white"/>
            </svg>
          </div>
          <span className="text-base font-semibold text-foreground">Tempo</span>
        </Link>

        <nav className="hidden md:flex items-center gap-6">
          {NAV_LINKS.map((l) => (
            <Link key={l.href} href={l.href} className="text-sm text-muted-foreground hover:text-foreground transition-colors">{l.label}</Link>
          ))}
        </nav>

        <div className="hidden md:flex items-center gap-3">
          {isSignedIn ? (
            <Link href="/dashboard" className="text-sm font-medium bg-primary text-primary-foreground px-4 py-2 rounded-lg hover:bg-primary/90 transition-colors">Go to Dashboard</Link>
          ) : (
            <>
              <Link href="/sign-in" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Sign in</Link>
              <Link href="/sign-up" className="text-sm font-medium bg-primary text-primary-foreground px-4 py-2 rounded-lg hover:bg-primary/90 transition-colors">Start free — 60 days</Link>
            </>
          )}
        </div>

        <div className="flex md:hidden items-center gap-2">
          {isSignedIn ? (
            <Link href="/dashboard" className="text-xs font-medium bg-primary text-primary-foreground px-3 py-1.5 rounded-lg hover:bg-primary/90 transition-colors">Dashboard</Link>
          ) : (
            <Link href="/sign-up" className="text-xs font-medium bg-primary text-primary-foreground px-3 py-1.5 rounded-lg hover:bg-primary/90 transition-colors">Start free</Link>
          )}
          <button onClick={() => setMobileOpen(!mobileOpen)}
            className="w-11 h-11 flex items-center justify-center rounded-xl hover:bg-accent transition-colors"
            aria-label={mobileOpen ? 'Close menu' : 'Open menu'}>
            {mobileOpen ? <X className="w-5 h-5 text-foreground" /> : <Menu className="w-5 h-5 text-foreground" />}
          </button>
        </div>
      </div>

      {mobileOpen && (
        <div className="md:hidden border-t border-border bg-card">
          <nav className="max-w-6xl mx-auto px-6 py-4 flex flex-col gap-1">
            {NAV_LINKS.map((l) => (
              <Link key={l.href} href={l.href} onClick={() => setMobileOpen(false)}
                className="flex items-center py-3 px-3 rounded-xl text-sm font-medium text-foreground hover:bg-accent hover:text-primary transition-colors">
                {l.label}
              </Link>
            ))}
            {!isSignedIn && (
              <Link href="/sign-in" onClick={() => setMobileOpen(false)}
                className="flex items-center py-3 px-3 rounded-xl text-sm font-medium text-muted-foreground hover:bg-accent hover:text-foreground transition-colors mt-1 border-t border-border pt-4">
                Sign in
              </Link>
            )}
          </nav>
        </div>
      )}
    </header>
  );
}
