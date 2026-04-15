import Link from 'next/link';

export function MarketingFooter() {
  return (
    <footer className="border-t border-border bg-card mt-20">
      <div className="max-w-6xl mx-auto px-6 py-12">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-8 mb-10">
          <div className="md:col-span-1">
            <Link href="/" className="flex items-center gap-2 mb-3">
              <div className="w-7 h-7 rounded-md bg-primary flex items-center justify-center">
                <svg viewBox="0 0 16 16" className="w-4 h-4">
                  <rect x="1"   y="10" width="3" height="5"  rx="0.5" fill="white" opacity="0.5"/>
                  <rect x="6.5" y="7"  width="3" height="8"  rx="0.5" fill="white" opacity="0.75"/>
                  <rect x="12"  y="3"  width="3" height="12" rx="0.5" fill="white"/>
                </svg>
              </div>
              <span className="text-sm font-semibold text-foreground">Tempo Bookkeeping</span>
            </Link>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Bookkeeping that&apos;s always ready — for businesses, freelancers, personal accounts, and the accountants who manage them.
            </p>
          </div>

          <div>
            <p className="text-xs font-semibold text-foreground uppercase tracking-wider mb-3">Product</p>
            <ul className="space-y-2">
              {[{ label: 'Features', href: '/#features' }, { label: 'Pricing', href: '/pricing' }, { label: 'Sign up', href: '/sign-up' }, { label: 'Sign in', href: '/sign-in' }].map((l) => (
                <li key={l.href}><Link href={l.href} className="text-sm text-muted-foreground hover:text-foreground transition-colors">{l.label}</Link></li>
              ))}
            </ul>
          </div>

          <div>
            <p className="text-xs font-semibold text-foreground uppercase tracking-wider mb-3">For Accountants</p>
            <ul className="space-y-2">
              {[{ label: 'Accountant Portal', href: '/#accountants' }, { label: 'Portal Pricing', href: '/pricing' }, { label: 'Contact us', href: 'mailto:hello@gettempo.ca' }].map((l) => (
                <li key={l.href}><Link href={l.href} className="text-sm text-muted-foreground hover:text-foreground transition-colors">{l.label}</Link></li>
              ))}
            </ul>
          </div>

          <div>
            <p className="text-xs font-semibold text-foreground uppercase tracking-wider mb-3">Company</p>
            <ul className="space-y-2">
              {[{ label: 'FAQ', href: '/#faq' }, { label: 'Contact', href: 'mailto:hello@gettempo.ca' }].map((l) => (
                <li key={l.href}><Link href={l.href} className="text-sm text-muted-foreground hover:text-foreground transition-colors">{l.label}</Link></li>
              ))}
            </ul>
          </div>

          <div>
            <p className="text-xs font-semibold text-foreground uppercase tracking-wider mb-3">Legal</p>
            <ul className="space-y-2">
              {[{ label: 'Terms of Service', href: '/terms' }, { label: 'Terms of Use', href: '/terms-of-use' }, { label: 'Privacy Policy', href: '/privacy' }, { label: 'Cookie Policy', href: '/cookies' }].map((l) => (
                <li key={l.href}><Link href={l.href} className="text-sm text-muted-foreground hover:text-foreground transition-colors">{l.label}</Link></li>
              ))}
            </ul>
          </div>
        </div>

        <div className="border-t border-border pt-6 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-xs text-muted-foreground">© {new Date().getFullYear()} Tempo Bookkeeping Inc. All rights reserved.</p>
          <p className="text-xs text-muted-foreground">Built for Canadian &amp; US small businesses 🇨🇦 🇺🇸</p>
        </div>
      </div>
    </footer>
  );
}
