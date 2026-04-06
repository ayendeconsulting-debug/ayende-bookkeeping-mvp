import Link from 'next/link';
import { MarketingNav } from '@/components/marketing-nav';
import { MarketingFooter } from '@/components/marketing-footer';
import { FaqAccordion } from './(marketing)/faq-accordion';
import { DashboardCarousel } from './(marketing)/dashboard-carousel';
import {
  BarChart3, FileText, Shield, Zap, Users, Globe, Sparkles,
  CheckCircle2, ArrowRight, BookOpen, Building2,
} from 'lucide-react';

// ── Stats ─────────────────────────────────────────────────────────────────
const STATS = [
  { value: '12,000+', label: 'Banks connected via Plaid',   sub: 'Canada & United States' },
  { value: '60',      label: 'Day free trial',              sub: 'No charge · Cancel anytime' },
  { value: '100%',    label: 'Tax-ready documentation',     sub: 'Every transaction balanced' },
  { value: '5',       label: 'AI-powered features',         sub: 'Included on every plan' },
];

// ── Features ──────────────────────────────────────────────────────────────
const FEATURES = [
  {
    category: 'AI',
    icon: Sparkles,
    title: 'AI that works on your actual numbers',
    description:
      'Classify transactions, detect anomalies, explain charges in plain language, and generate a year-end summary — all powered by Claude AI on your real financial data.',
    points: [
      'Transaction Explainer — plain-language breakdowns',
      'Anomaly detection (amount, frequency, category)',
      'Year-End Assistant with PDF export',
      'Classification learning from your overrides',
    ],
    highlight: true,
  },
  {
    category: 'Tax Ready',
    icon: Shield,
    title: 'Tax-ready books, all year round',
    description:
      'Every transaction is posted to the correct account with HST/GST split automatically. Your Income Statement, Balance Sheet, and CRA remittance report are always current — no scramble at filing time.',
    points: [
      'Automatic HST/GST splitting per transaction',
      'CRA remittance report (GST34 lines 101–113)',
      'Locked fiscal years prevent retroactive edits',
      'Year-End AI assistant for filing prep',
    ],
    highlight: false,
  },
  {
    category: 'Accounting',
    icon: BarChart3,
    title: 'Real double-entry accounting',
    description:
      'Every transaction creates balanced journal entries automatically. Your books are always accurate — no spreadsheet hacks, no single-entry workarounds.',
    points: [
      'Automated journal entries',
      'Debit/credit validation',
      'Owner contributions & draws',
      'Fiscal year locking',
    ],
    highlight: false,
  },
  {
    category: 'Banking',
    icon: Zap,
    title: 'Connect your bank in seconds',
    description:
      'Link your business bank account via Plaid for automatic transaction import. Transactions are classified, deduplicated, and posted to your ledger — zero manual entry.',
    points: [
      '12,000+ institutions',
      'Real-time sync',
      'Duplicate detection',
      'Secure read-only access',
    ],
    highlight: false,
  },
  {
    category: 'Reporting',
    icon: FileText,
    title: 'Tax-ready financial reports',
    description:
      'Generate an Income Statement, Balance Sheet, Trial Balance, and General Ledger with one click. Filter by date range, export as PDF or CSV.',
    points: [
      'Income Statement & Balance Sheet',
      'Trial Balance & General Ledger',
      'CRA & IRS compatible',
      'PDF & CSV export',
    ],
    highlight: false,
  },
  {
    category: 'Firms',
    icon: Building2,
    title: 'A dedicated portal for accounting firms',
    description:
      'Manage multiple clients from one dashboard. White-label with your firm\'s brand, onboard clients in minutes, and request edit access with a full audit trail of every change made.',
    points: [
      'Multi-client dashboard with KPI cards',
      'White-label subdomain (yourfirm.gettempo.ca)',
      'Client edit access + dual audit log',
      'AI anomaly detection across all clients',
    ],
    highlight: false,
  },
];

// ── Pricing ───────────────────────────────────────────────────────────────
const PLANS = [
  {
    name: 'Starter',
    regular: '$19',
    price: '$10',
    period: ' CAD/mo',
    annualNote: '2 months free on annual',
    description: 'For freelancers and solo founders',
    features: [
      'Up to 500 transactions/mo',
      '4 financial reports',
      'Bank connectivity via Plaid',
      'AI assistant (50 calls/mo)',
      'HST/GST tracking',
      'Email support',
    ],
    highlight: false,
    cta: 'Start free trial',
  },
  {
    name: 'Pro',
    regular: '$49',
    price: '$25',
    period: ' CAD/mo',
    annualNote: '2 months free on annual',
    description: 'For growing small businesses',
    features: [
      'Up to 2,500 transactions/mo',
      'Everything in Starter',
      'Multi-user access',
      'Invoicing & AP/AR',
      'AI assistant (200 calls/mo)',
      'Priority support',
    ],
    highlight: true,
    cta: 'Start free trial',
  },
  {
    name: 'Accountant',
    regular: null,
    price: '$149',
    period: ' CAD/mo base',
    annualNote: '$1,490/yr · see full pricing',
    description: 'For bookkeeping firms & multi-client',
    features: [
      '5 client businesses included',
      '3 staff seats included',
      'White-label subdomain',
      'Full firm portal + audit log',
      'AI (500 calls/mo · unlimited add-on)',
      '+$15/mo per additional client',
    ],
    highlight: false,
    cta: 'See Accountant pricing',
    ctaHref: '/pricing',
  },
];

// ── Page ──────────────────────────────────────────────────────────────────
export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <MarketingNav />

      <main className="flex-1">

        {/* ── Hero ───────────────────────────────────────────────────── */}
        <section className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-b from-[#EDF7F2] via-background to-background pointer-events-none" />
          <div className="relative max-w-6xl mx-auto px-6 pt-20 pb-16 text-center">

            <div className="inline-flex items-center gap-2 bg-[#0F6E56] text-white text-xs font-semibold px-4 py-1.5 rounded-full mb-4">
              <Zap className="w-3 h-3" /> Launch offer: 50% off Starter & Pro
            </div>

            <div className="inline-flex items-center gap-2 bg-[#EDF7F2] dark:bg-primary/10 border border-[#C3E8D8] dark:border-primary/30 text-[#0F6E56] text-xs font-medium px-4 py-1.5 rounded-full mb-6 ml-2">
              <span className="w-1.5 h-1.5 rounded-full bg-[#0F6E56] animate-pulse" />
              Built for Canadian &amp; US small businesses
            </div>

            <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold text-foreground leading-tight tracking-tight mb-6 max-w-4xl mx-auto">
              AI-assisted bookkeeping{' '}
              <span className="text-[#0F6E56]">built for tax time</span>
            </h1>

            <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-8 leading-relaxed">
              Tempo Books handles double-entry accounting, bank sync, AI transaction classification, and HST/GST tracking — so when tax season arrives, your books are already ready.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-8">
              <Link
                href="/sign-up"
                className="inline-flex items-center gap-2 bg-[#0F6E56] text-white px-6 py-3 rounded-xl font-semibold text-sm hover:bg-[#085041] transition-colors shadow-sm"
              >
                Start free trial <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                href="/pricing"
                className="inline-flex items-center gap-2 border border-border bg-card text-foreground px-6 py-3 rounded-xl font-semibold text-sm hover:border-[#0F6E56] hover:text-[#0F6E56] transition-colors"
              >
                See pricing
              </Link>
            </div>

            <p className="text-xs text-muted-foreground mb-12">
              60-day free trial · No charge during trial · Auto-continues on Starter after trial
            </p>

            <DashboardCarousel />
          </div>
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

        {/* ── AI Feature highlight ────────────────────────────────────── */}
        <section className="max-w-6xl mx-auto px-6 py-16">
          <div className="rounded-2xl bg-gradient-to-r from-[#EDF7F2] to-[#f5f3ef] dark:from-primary/10 dark:to-background border border-[#C3E8D8] dark:border-primary/30 p-8 md:p-10">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
              <div>
                <div className="inline-flex items-center gap-2 bg-[#0F6E56] text-white text-xs font-semibold px-3 py-1 rounded-full mb-4">
                  <Sparkles className="w-3 h-3" /> Powered by Claude AI
                </div>
                <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-4">
                  Ask your books anything
                </h2>
                <p className="text-muted-foreground leading-relaxed mb-6">
                  Get instant ad hoc answers from your actual financial data. Explain any transaction in plain language, detect anomalies before they become problems, and generate a year-end summary ready for your accountant.
                </p>
                <ul className="space-y-2 mb-6">
                  {[
                    'Explain this charge in plain language',
                    'Flag unusual transactions automatically',
                    'Generate a year-end review PDF',
                    'Learn your classification patterns over time',
                  ].map((q) => (
                    <li key={q} className="flex items-start gap-2 text-sm text-foreground">
                      <CheckCircle2 className="w-4 h-4 text-[#0F6E56] flex-shrink-0 mt-0.5" />
                      <span className="text-muted-foreground">{q}</span>
                    </li>
                  ))}
                </ul>
                <p className="text-xs text-muted-foreground">Included on every plan — Starter, Pro, and Accountant.</p>
              </div>

              {/* AI chat mockup */}
              <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
                <div className="px-4 py-3 border-b border-border flex items-center gap-2">
                  <div className="w-6 h-6 rounded-lg bg-[#0F6E56] flex items-center justify-center">
                    <svg viewBox="0 0 16 16" className="w-3.5 h-3.5"><rect x="1" y="10" width="3" height="5" rx="0.5" fill="white" opacity="0.5"/><rect x="6.5" y="7" width="3" height="8" rx="0.5" fill="white" opacity="0.75"/><rect x="12" y="3" width="3" height="12" rx="0.5" fill="white"/></svg>
                  </div>
                  <p className="text-xs font-semibold text-foreground">AI Bookkeeping Assistant</p>
                </div>
                <div className="p-4 space-y-3">
                  <div className="flex justify-end">
                    <div className="bg-[#0F6E56] text-white text-xs px-3 py-2 rounded-xl rounded-tr-sm max-w-[80%]">
                      What was my net profit margin in Q1?
                    </div>
                  </div>
                  <div className="flex justify-start">
                    <div className="bg-muted text-foreground text-xs px-3 py-2 rounded-xl rounded-tl-sm max-w-[85%] leading-relaxed">
                      Your Q1 net profit margin was <strong>34.1%</strong> — net income of $16,480 on revenue of $48,320. Up from 29.8% in Q4, driven by lower software costs. 📈
                    </div>
                  </div>
                  <div className="flex justify-end">
                    <div className="bg-[#0F6E56] text-white text-xs px-3 py-2 rounded-xl rounded-tr-sm max-w-[80%]">
                      Explain the $2,400 charge from AWS last month
                    </div>
                  </div>
                  <div className="flex justify-start">
                    <div className="bg-muted text-foreground text-xs px-3 py-2 rounded-xl rounded-tl-sm max-w-[85%] leading-relaxed">
                      This is your monthly AWS cloud hosting bill. It&apos;s classified as a <strong>Cloud Infrastructure</strong> expense and is 18% higher than your prior 3-month average — worth reviewing if usage changed.
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── Tax Filing callout ──────────────────────────────────────── */}
        <section className="max-w-6xl mx-auto px-6 pb-6">
          <div className="rounded-2xl bg-card border border-border p-8 md:p-10">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
              <div>
                <div className="inline-flex items-center gap-2 bg-[#EDF7F2] dark:bg-primary/10 text-[#0F6E56] text-xs font-semibold px-3 py-1 rounded-full mb-4 border border-[#C3E8D8] dark:border-primary/30">
                  <BookOpen className="w-3 h-3" /> Tax Filing Simplified
                </div>
                <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-4">
                  Your books are always filing-ready
                </h2>
                <p className="text-muted-foreground leading-relaxed mb-6">
                  Thorough documentation and accurate account balances aren&apos;t something you scramble for at year-end — they&apos;re built into every transaction Tempo processes. HST/GST is split automatically, every journal entry is balanced, and your CRA remittance report is always one click away.
                </p>
                <ul className="space-y-2 mb-6">
                  {[
                    'Every transaction documented with debit/credit entries',
                    'HST/GST automatically split into the correct liability accounts',
                    'CRA remittance report with GST34 lines 101–113',
                    'Fiscal year locking prevents retroactive changes',
                    'Year-End AI assistant summarises your books for your accountant',
                  ].map((point) => (
                    <li key={point} className="flex items-start gap-2 text-sm">
                      <CheckCircle2 className="w-4 h-4 text-[#0F6E56] flex-shrink-0 mt-0.5" />
                      <span className="text-muted-foreground">{point}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="bg-muted/50 rounded-xl p-6 space-y-4">
                <p className="text-xs font-semibold text-[#0F6E56] uppercase tracking-wider">At tax time you have</p>
                {[
                  { label: 'Income Statement', desc: 'Revenue, expenses, net income by period' },
                  { label: 'Balance Sheet', desc: 'Assets, liabilities, and equity snapshot' },
                  { label: 'CRA Remittance Report', desc: 'GST34 lines pre-calculated, export ready' },
                  { label: 'General Ledger', desc: 'Every transaction with full audit trail' },
                  { label: 'Year-End AI Summary', desc: 'Observations, adjustments, and checklist PDF' },
                ].map((item) => (
                  <div key={item.label} className="flex items-start gap-3">
                    <CheckCircle2 className="w-4 h-4 text-[#0F6E56] flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-foreground">{item.label}</p>
                      <p className="text-xs text-muted-foreground">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ── Features ───────────────────────────────────────────────── */}
        <section id="features" className="max-w-6xl mx-auto px-6 py-10 pb-20">
          <div className="text-center mb-14">
            <p className="text-xs font-semibold text-[#0F6E56] uppercase tracking-wider mb-3">Features</p>
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              Everything you need to run your books
            </h2>
            <p className="text-muted-foreground max-w-xl mx-auto">
              From bank import to AI-powered year-end filing — Tempo handles the full bookkeeping workflow.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {FEATURES.map((feature) => {
              const Icon = feature.icon;
              return (
                <div
                  key={feature.title}
                  className={[
                    'rounded-2xl p-6 flex flex-col border-2 transition-all',
                    feature.highlight
                      ? 'border-[#0F6E56] bg-[#EDF7F2] dark:bg-primary/10'
                      : 'border-border bg-card hover:border-[#0F6E56]/40 hover:shadow-sm',
                  ].join(' ')}
                >
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-8 h-8 rounded-lg bg-[#EDF7F2] dark:bg-primary/10 flex items-center justify-center">
                      <Icon className="w-4 h-4 text-[#0F6E56]" />
                    </div>
                    <span className="text-xs font-semibold text-[#0F6E56] uppercase tracking-wider">
                      {feature.category}
                    </span>
                    {feature.highlight && (
                      <span className="text-xs bg-[#0F6E56] text-white px-2 py-0.5 rounded-full font-medium">
                        Included free
                      </span>
                    )}
                  </div>
                  <h3 className="text-base font-semibold text-foreground mb-2">{feature.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed mb-4">{feature.description}</p>
                  <ul className="space-y-1.5">
                    {feature.points.map((point) => (
                      <li key={point} className="flex items-center gap-2 text-xs text-muted-foreground">
                        <CheckCircle2 className="w-3.5 h-3.5 text-[#0F6E56] flex-shrink-0" />
                        {point}
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        </section>

        {/* ── Pricing preview ─────────────────────────────────────────── */}
        <section id="pricing" className="bg-card border-y border-border">
          <div className="max-w-6xl mx-auto px-6 py-20">
            <div className="text-center mb-6">
              <p className="text-xs font-semibold text-[#0F6E56] uppercase tracking-wider mb-3">Pricing</p>
              <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
                Simple, transparent pricing
              </h2>
              <p className="text-muted-foreground max-w-xl mx-auto">
                60-day free trial on all plans. Starter &amp; Pro at 50% off for launch.
                The Accountant plan includes a full firm portal with white-label branding, client onboarding, and metered per-client billing.
              </p>
            </div>

            <div className="flex items-center justify-center gap-2 bg-[#0F6E56] text-white text-sm font-medium px-5 py-2.5 rounded-xl mb-10 max-w-lg mx-auto">
              <Zap className="w-4 h-4 flex-shrink-0" />
              Launch offer: Starter &amp; Pro 50% off — prices shown already discounted
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
              {PLANS.map((plan) => (
                <div
                  key={plan.name}
                  className={[
                    'rounded-2xl p-6 flex flex-col border-2 transition-all relative',
                    plan.highlight
                      ? 'border-[#0F6E56] bg-[#EDF7F2] dark:bg-primary/10 shadow-lg'
                      : 'border-border bg-background',
                  ].join(' ')}
                >
                  {plan.highlight && (
                    <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                      <span className="bg-[#0F6E56] text-white text-xs font-semibold px-3 py-1 rounded-full">
                        Most Popular
                      </span>
                    </div>
                  )}
                  <div className="mb-4">
                    <p className="text-sm font-semibold text-foreground mb-1">{plan.name}</p>
                    <div className="flex items-baseline gap-1">
                      <span className="text-3xl font-bold text-foreground">{plan.price}</span>
                      <span className="text-sm text-muted-foreground">{plan.period}</span>
                    </div>
                    {plan.regular && (
                      <p className="text-xs text-muted-foreground line-through">was {plan.regular} CAD/mo</p>
                    )}
                    <p className="text-xs text-muted-foreground mt-0.5">{plan.annualNote}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{plan.description}</p>
                  </div>
                  <ul className="space-y-2 mb-6 flex-1">
                    {plan.features.map((f) => (
                      <li key={f} className="flex items-start gap-2 text-xs text-foreground">
                        <CheckCircle2 className="w-3.5 h-3.5 text-[#0F6E56] flex-shrink-0 mt-0.5" />
                        {f}
                      </li>
                    ))}
                  </ul>
                  <Link
                    href={(plan as any).ctaHref ?? '/sign-up'}
                    className={[
                      'text-center text-sm font-semibold px-4 py-2.5 rounded-xl transition-colors',
                      plan.highlight
                        ? 'bg-[#0F6E56] text-white hover:bg-[#085041]'
                        : 'border border-border hover:border-[#0F6E56] hover:text-[#0F6E56]',
                    ].join(' ')}
                  >
                    {plan.cta}
                  </Link>
                </div>
              ))}
            </div>

            <p className="text-center text-xs text-muted-foreground mt-6">
              Starter &amp; Pro: annual plans get 2 months free.{' '}
              <Link href="/pricing" className="text-[#0F6E56] hover:underline underline-offset-2">
                See full pricing details →
              </Link>
            </p>
          </div>
        </section>

        {/* ── FAQ ─────────────────────────────────────────────────────── */}
        <section id="faq" className="max-w-3xl mx-auto px-6 py-20">
          <div className="text-center mb-12">
            <p className="text-xs font-semibold text-[#0F6E56] uppercase tracking-wider mb-3">FAQ</p>
            <h2 className="text-3xl font-bold text-foreground mb-4">Common questions</h2>
            <p className="text-muted-foreground">
              Can&apos;t find the answer?{' '}
              <a href="mailto:hello@gettempo.ca" className="text-[#0F6E56] hover:underline underline-offset-2">
                Email us.
              </a>
            </p>
          </div>
          <FaqAccordion />
        </section>

        {/* ── CTA Banner ──────────────────────────────────────────────── */}
        <section className="bg-[#0F6E56] dark:bg-[#085041]">
          <div className="max-w-4xl mx-auto px-6 py-16 text-center">
            <h2 className="text-3xl font-bold text-white mb-4">
              Start your free trial today
            </h2>
            <p className="text-[#C3E8D8] mb-8 max-w-xl mx-auto">
              60 days free, no charge during trial. Your books will be tax-ready before the trial ends — or your accountant will be very impressed.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link
                href="/sign-up"
                className="inline-flex items-center gap-2 bg-white text-[#0F6E56] px-6 py-3 rounded-xl font-semibold text-sm hover:bg-[#EDF7F2] transition-colors"
              >
                Start free trial <ArrowRight className="w-4 h-4" />
              </Link>
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
