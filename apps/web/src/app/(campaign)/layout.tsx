import Link from 'next/link';
import { MarketingThemeEnforcer } from '@/components/marketing-theme-enforcer';

// ── Update this to the Accountant plan checkout destination ──────────────────
const CHECKOUT_URL = '/sign-up?plan=accountant';

export default function CampaignLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <script
        dangerouslySetInnerHTML={{
          __html: `try{document.documentElement.dataset.forceLight='true';document.documentElement.classList.remove('dark');}catch(e){}`,
        }}
      />
      <MarketingThemeEnforcer />
      <div className="min-h-screen bg-[#f5f3ef] flex flex-col">
        {/* Minimal sticky header — logo + single CTA only */}
        <header className="sticky top-0 z-50 bg-[#f5f3ef]/95 backdrop-blur-sm border-b border-gray-200">
          <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
            <Link href="https://gettempo.ca" className="flex items-center gap-2.5">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <rect x="2" y="14" width="5" height="8" rx="1" fill="#0F6E56" />
                <rect x="9.5" y="9" width="5" height="13" rx="1" fill="#0F6E56" />
                <rect x="17" y="4" width="5" height="18" rx="1" fill="#0F6E56" />
              </svg>
              <span className="font-bold text-gray-900 text-base tracking-tight">Tempo Books</span>
            </Link>
            <a
              href={CHECKOUT_URL}
              className="inline-flex items-center gap-1.5 bg-[#0F6E56] text-white text-sm font-semibold px-4 py-2 rounded-lg hover:bg-[#1B6B4A] transition-colors"
            >
              Get Started →
            </a>
          </div>
        </header>

        <main className="flex-1">{children}</main>

        {/* Minimal footer — legal only */}
        <footer className="border-t border-gray-200 py-6 bg-[#f5f3ef]">
          <div className="max-w-6xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-3">
            <p className="text-xs text-gray-400">© 2026 Ayende CX Inc. All rights reserved.</p>
            <div className="flex items-center gap-5 text-xs text-gray-400">
              <Link href="/privacy" className="hover:text-[#0F6E56] transition-colors">Privacy Policy</Link>
              <Link href="/terms" className="hover:text-[#0F6E56] transition-colors">Terms of Service</Link>
            </div>
          </div>
        </footer>
      </div>
    </>
  );
}
