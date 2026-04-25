import Link from 'next/link';
import Image from 'next/image';
import { MarketingNav } from '@/components/marketing-nav';
import { MarketingFooter } from '@/components/marketing-footer';
import { MarketingThemeEnforcer } from '@/components/marketing-theme-enforcer';
import { RequestDemoButton } from '@/components/request-demo-button';
import { DashboardCarousel } from './(marketing)/dashboard-carousel';
import { HowItWorksCarousel } from './(marketing)/how-it-works-carousel';
import { ArrowRight, CheckCircle2, Globe, Lock, Shield, Zap } from 'lucide-react';

const STATS = [
  { value: '12,000+', label: 'Banks supported via Plaid', sub: 'Canada & United States' },
  { value: '14',      label: 'Day free trial',            sub: 'No credit card · Starter & Pro' },
  { value: '100%',    label: 'Tax-ready documentation',   sub: 'Every transaction balanced' },
  { value: '6 years', label: 'CRA receipt retention',     sub: 'Pro & Accountant plans' },
];

const TRUST_SIGNALS = [
  { icon: Lock,         text: 'Bank-level encryption at rest' },
  { icon: Shield,       text: 'Read-only Plaid bank access' },
  { icon: Globe,        text: 'Canadian data residency' },
  { icon: CheckCircle2, text: 'Data never sold or shared' },
];

export default function HomePage() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <MarketingThemeEnforcer />
      <MarketingNav />

      <main className="flex-1">

        {/* ── Hero ────────────────────────────────────────────────────── */}
        <section className="relative overflow-hidden">
          <Image
            src="https://images.unsplash.com/photo-1716703373229-b0e43de7dd5c?q=80&w=1920&auto=format&fit=crop"
            alt=""
            fill
            className="object-cover object-center"
            priority
            aria-hidden="true"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/65 via-black/55 to-background pointer-events-none" />

          <div className="relative max-w-6xl mx-auto px-6 pt-20 pb-16 text-center">

            <div className="inline-flex items-center gap-2 bg-white/15 border border-white/30 text-white text-xs font-medium px-4 py-1.5 rounded-full mb-3">
              🇨🇦 Built for Canadian businesses &mdash; native HST/GST, CRA-ready
            </div>

            <div className="inline-flex items-center gap-2 bg-[#0F6E56] text-white text-xs font-semibold px-4 py-1.5 rounded-full mb-6 ml-2">
              <Zap className="w-3 h-3" /> Launch offer: 50% off Starter &amp; Pro
            </div>

            <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold text-white leading-tight tracking-tight mb-6 max-w-4xl mx-auto">
              <span className="block">Clean books. Every month.</span>
              <span className="block text-[#5ECBA1]">Not just at tax time.</span>
            </h1>

            <p className="text-lg text-white/80 max-w-2xl mx-auto mb-8 leading-relaxed">
              Tempo Books handles double-entry accounting, bank sync, AI transaction classification,
              and HST/GST tracking &mdash; whether you run a business, freelance, manage personal
              finances, or handle client books.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-6">
              <Link
                href="/sign-up"
                className="inline-flex items-center gap-2 bg-[#0F6E56] text-white px-6 py-3 rounded-xl font-semibold text-sm hover:bg-[#085041] transition-colors shadow-sm"
              >
                Start your free trial <ArrowRight className="w-4 h-4" />
              </Link>
              <RequestDemoButton />
            </div>

            <p className="text-xs text-white/60 mb-12">
              Free trial on Starter &amp; Pro &middot; No credit card required &middot; See full plan terms
            </p>

            <DashboardCarousel />
          </div>
        </section>

        {/* ── Security trust bar ──────────────────────────────────────── */}
        <section className="border-b border-border bg-card">
          <div className="max-w-6xl mx-auto px-6 py-5">
            <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-3">
              {TRUST_SIGNALS.map((signal) => {
                const Icon = signal.icon;
                return (
                  <div key={signal.text} className="flex items-center gap-2">
                    <Icon className="w-3.5 h-3.5 text-[#0F6E56] flex-shrink-0" />
                    <span className="text-xs text-muted-foreground">{signal.text}</span>
                  </div>
                );
              })}
              <div className="flex items-center gap-2 border-l border-border pl-8">
                <span className="text-xs text-muted-foreground">Bank connectivity by</span>
                <span className="text-xs font-semibold text-foreground">Plaid</span>
              </div>
            </div>
          </div>
        </section>

        {/* ── How It Works (carousel from B-4) ────────────────────────── */}
        <section className="max-w-5xl mx-auto px-6 py-16">
          <div className="text-center mb-12">
            <p className="text-xs font-semibold text-[#0F6E56] uppercase tracking-wider mb-3">How It Works</p>
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              Up and running in your first session.
            </h2>
            <p className="text-muted-foreground max-w-xl mx-auto">
              No accountant required. No manual setup. Connect your bank and your books start themselves.
            </p>
          </div>
          <HowItWorksCarousel />
        </section>

        {/* ── Stats ──────────────────────────────────────────────────── */}
        <section className="border-y border-border bg-card">
          <div className="max-w-6xl mx-auto px-6 py-14">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
              {STATS.map((stat) => (
                <div key={stat.value}>
                  <p className="text-4xl font-bold text-foreground mb-1">{stat.value}</p>
                  <p className="text-sm font-medium text-foreground mb-0.5">{stat.label}</p>
                  <p className="text-xs text-muted-foreground">{stat.sub}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── CTA Banner ─────────────────────────────────────────────── */}
        <section className="bg-[#0F6E56] dark:bg-[#085041]">
          <div className="max-w-4xl mx-auto px-6 py-16 text-center">
            <h2 className="text-3xl font-bold text-white mb-4">
              Your books should be ready before you need them.
            </h2>
            <p className="text-[#C3E8D8] mb-8 max-w-xl mx-auto">
              Not the night before filing. Not after a frantic call to your accountant.
              Every month, automatically &mdash; starting now.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link
                href="/sign-up"
                className="inline-flex items-center gap-2 bg-white text-[#0F6E56] px-6 py-3 rounded-xl font-semibold text-sm hover:bg-[#EDF7F2] transition-colors"
              >
                Start your free trial <ArrowRight className="w-4 h-4" />
              </Link>
              <RequestDemoButton />
              <Link
                href="/pricing"
                className="inline-flex items-center gap-2 border border-white/40 text-white px-6 py-3 rounded-xl font-semibold text-sm hover:border-white transition-colors"
              >
                View pricing
              </Link>
            </div>
          </div>
        </section>

      </main>

      <MarketingFooter />
    </div>
  );
}
