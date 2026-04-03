export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="flex flex-col items-center gap-6 w-full">

        {/* ── Logo ──────────────────────────────────────────────────────── */}
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-[#0F6E56] flex items-center justify-center shadow-sm">
            {/* Rising bars — Tempo logo mark */}
            <svg viewBox="0 0 16 16" className="w-7 h-7">
              <rect x="1"   y="10" width="3" height="5"  rx="0.5" fill="white" opacity="0.5"/>
              <rect x="6.5" y="7"  width="3" height="8"  rx="0.5" fill="white" opacity="0.75"/>
              <rect x="12"  y="3"  width="3" height="12" rx="0.5" fill="white"/>
            </svg>
          </div>
          <div className="text-center">
            <div className="text-lg font-semibold text-foreground leading-tight">
              Tempo Bookkeeping
            </div>
            <div className="text-sm text-muted-foreground mt-0.5">
              Bookkeeping that works as hard as you do.
            </div>
          </div>
        </div>

        {/* ── Clerk component renders here ──────────────────────────────── */}
        {children}

        {/* ── Footer links ──────────────────────────────────────────────── */}
        <div className="flex flex-wrap justify-center gap-x-4 gap-y-1 pb-6">
          {[
            { label: 'Terms of Service', href: '/terms'        },
            { label: 'Terms of Use',     href: '/terms-of-use' },
            { label: 'Privacy Policy',   href: '/privacy'      },
            { label: 'Cookie Policy',    href: '/cookies'      },
          ].map((l) => (
            <a
              key={l.href}
              href={l.href}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              {l.label}
            </a>
          ))}
        </div>

      </div>
    </div>
  );
}
