import Link from 'next/link';

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background flex flex-col">

      {/* ── Nav ─────────────────────────────────────────────────────────── */}
      <header className="border-b border-border bg-card/80 backdrop-blur-sm sticky top-0 z-40">
        <div className="max-w-4xl mx-auto px-6 h-14 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-md bg-[#0F6E56] flex items-center justify-center flex-shrink-0">
              <svg viewBox="0 0 16 16" className="w-4 h-4">
                <rect x="1"   y="10" width="3" height="5"  rx="0.5" fill="white" opacity="0.5"/>
                <rect x="6.5" y="7"  width="3" height="8"  rx="0.5" fill="white" opacity="0.75"/>
                <rect x="12"  y="3"  width="3" height="12" rx="0.5" fill="white"/>
              </svg>
            </div>
            <span className="text-sm font-semibold text-foreground">Tempo Bookkeeping</span>
          </Link>
          <div className="flex items-center gap-4">
            <Link href="/sign-in"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              Sign in
            </Link>
            <Link href="/sign-up"
              className="text-sm font-medium bg-[#0F6E56] text-white px-4 py-1.5 rounded-lg hover:bg-[#085041] transition-colors">
              Get started
            </Link>
          </div>
        </div>
      </header>

      {/* ── Page content ────────────────────────────────────────────────── */}
      <main className="flex-1">
        {children}
      </main>

      {/* ── Footer ──────────────────────────────────────────────────────── */}
      <footer className="border-t border-border bg-card mt-16">
        <div className="max-w-4xl mx-auto px-6 py-8">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded bg-[#0F6E56] flex items-center justify-center">
                <svg viewBox="0 0 16 16" className="w-3.5 h-3.5">
                  <rect x="1"   y="10" width="3" height="5"  rx="0.5" fill="white" opacity="0.5"/>
                  <rect x="6.5" y="7"  width="3" height="8"  rx="0.5" fill="white" opacity="0.75"/>
                  <rect x="12"  y="3"  width="3" height="12" rx="0.5" fill="white"/>
                </svg>
              </div>
              <span className="text-xs text-muted-foreground">
                © {new Date().getFullYear()} Tempo Bookkeeping. All rights reserved.
              </span>
            </div>
            <nav className="flex flex-wrap gap-x-5 gap-y-1">
              {[
                { label: 'Terms of Service',  href: '/terms'          },
                { label: 'Terms of Use',       href: '/terms-of-use'   },
                { label: 'Privacy Policy',     href: '/privacy'        },
                { label: 'Cookie Policy',      href: '/cookies'        },
              ].map((l) => (
                <Link key={l.href} href={l.href}
                  className="text-xs text-muted-foreground hover:text-foreground transition-colors">
                  {l.label}
                </Link>
              ))}
            </nav>
          </div>
        </div>
      </footer>

    </div>
  );
}
