import Link from 'next/link';
import { auth } from '@clerk/nextjs/server';

export async function MarketingNav() {
  const { userId } = await auth();

  return (
    <header className="border-b border-border bg-card/80 backdrop-blur-sm sticky top-0 z-40">
      <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">

        {/* Logo */}
        <Link href="/" className="flex items-center gap-2.5 flex-shrink-0">
          <div className="w-8 h-8 rounded-lg bg-[#0F6E56] flex items-center justify-center">
            <svg viewBox="0 0 16 16" className="w-5 h-5">
              <rect x="1"   y="10" width="3" height="5"  rx="0.5" fill="white" opacity="0.5"/>
              <rect x="6.5" y="7"  width="3" height="8"  rx="0.5" fill="white" opacity="0.75"/>
              <rect x="12"  y="3"  width="3" height="12" rx="0.5" fill="white"/>
            </svg>
          </div>
          <span className="text-base font-semibold text-foreground">Tempo</span>
        </Link>

        {/* Nav links */}
        <nav className="hidden md:flex items-center gap-6">
          <Link href="/pricing" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
            Pricing
          </Link>
          <Link href="/#features" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
            Features
          </Link>
          <Link href="/#faq" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
            FAQ
          </Link>
        </nav>

        {/* CTAs */}
        <div className="flex items-center gap-3">
          {userId ? (
            <Link
              href="/dashboard"
              className="text-sm font-medium bg-[#0F6E56] text-white px-4 py-2 rounded-lg hover:bg-[#085041] transition-colors"
            >
              Go to Dashboard
            </Link>
          ) : (
            <>
              <Link
                href="/sign-in"
                className="text-sm text-muted-foreground hover:text-foreground transition-colors hidden sm:block"
              >
                Sign in
              </Link>
              <Link
                href="/sign-up"
                className="text-sm font-medium bg-[#0F6E56] text-white px-4 py-2 rounded-lg hover:bg-[#085041] transition-colors"
              >
                Get started
              </Link>
            </>
          )}
        </div>

      </div>
    </header>
  );
}
