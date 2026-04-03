import Link from 'next/link';
import { MarketingNav } from '@/components/marketing-nav';
import { MarketingFooter } from '@/components/marketing-footer';
import { FaqAccordion } from './(marketing)/faq-accordion';
import {
  BarChart3, FileText, Shield, Zap, Users, Globe,
  CheckCircle2, ArrowRight,
} from 'lucide-react';

/* ── Stats ───────────────────────────────────────────────────────────────── */
const STATS = [
  { value: '12,000+', label: 'Banks connected via Plaid', sub: 'Canada & United States' },
  { value: '60',      label: 'Day free trial',            sub: 'No credit card required' },
  { value: '100%',    label: 'Double-entry accounting',   sub: 'Every transaction balanced' },
  { value: '4',       label: 'Financial reports',         sub: 'IS, BS, TB, General Ledger' },
];

/* ── Features ─────────────────────────────────────────────────────────────── */
const FEATURES = [
  {
    category: 'Accounting',
    icon: BarChart3,
    title: 'Real double-entry accounting',
    description:
      'Every transaction creates balanced journal entries automatically. Your books are always accurate — no spreadsheet hacks, no single-entry workarounds.',
    points: ['Automated journal entries', 'Debit/credit validation', 'Owner contributions & draws', 'Fiscal year locking'],
  },
  {
    category: 'Banking',
    icon: Zap,
    title: 'Connect your bank in seconds',
    description:
      'Link your business bank account via Plaid for automatic transaction import. Transactions are classified, deduplicated, and posted to your ledger — with zero manual entry.',
    points: ['12,000+ institutions', 'Real-time sync', 'Duplicate detection', 'Secure read-only access'],
  },
  {
    category: 'Reporting',
    icon: FileText,
    title: 'Tax-ready financial reports',
    description:
      'Generate an Income Statement, Balance Sheet, Trial Balance, and General Ledger with one click. Filter by date range, export as PDF or CSV — ready for your accountant or tax return.',
    points: ['Income Statement', 'Balance Sheet', 'CRA & IRS compatible', 'PDF & CSV export'],
  },
  {
    category: 'Tax',
    icon: Shield,
    title: 'HST, GST, and sales tax built in',
    description:
      'Set up your tax codes once. When you classify a transaction, Tempo automatically splits the net and tax amounts into the right accounts — no manual journal entry required.',
    points: ['HST & GST support', 'US sales tax', 'Automatic tax splitting', 'Tax liability tracking'],
  },
  {
    category: 'Multi-user',
    icon: Users,
    title: 'Invite your accountant',
    description:
      'Give your accountant, bookkeeper, or business partner their own access with the right permissions. Owner, Accountant, and Viewer roles keep everyone in their lane.',
    points: ['Role-based access', 'Owner / Accountant / Viewer', 'Multi-business support', 'Audit trail'],
  },
  {
    category: 'Coverage',
    icon: Globe,
    title: 'Built for Canada and the US',
    description:
      'Tempo is purpose-built for North American small businesses. CAD and USD currencies, CRA and IRS reporting, and bank connectivity across both countries from day one.',
    points: ['CAD & USD', 'CRA & IRS ready', 'Canadian & US banks', 'HST, GST, sales tax'],
  },
];

/* ── Pricing preview ─────────────────────────────────────────────────────── */
const PLANS = [
  {
    name: 'Starter',
    price: '$19',
    period: '/mo',
    description: 'For freelancers and solo founders',
    features: ['Up to 500 transactions/mo', '4 financial reports', 'Bank connectivity', 'CSV & PDF import', 'Email support'],
    cta: 'Start free trial',
    highlight: false,
  },
  {
    name: 'Pro',
    price: '$49',
    period: '/mo',
    description: 'For growing small businesses',
    features: ['Up to 2,500 transactions/mo', 'Everything in Starter', 'Multi-user access', 'Owner contributions & draws', 'Priority support'],
    cta: 'Start free trial',
    highlight: true,
  },
  {
    name: 'Accountant',
    price: '$99',
    period: '/mo',
    description: 'For accounting firms & multi-client',
    features: ['Unlimited transactions', 'Everything in Pro', 'Multiple businesses', 'Accountant role access', 'Dedicated support'],
    cta: 'Start free trial',
    highlight: false,
  },
];

/* ── Page ─────────────────────────────────────────────────────────────────── */
export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <MarketingNav />

      <main className="flex-1">

        {/* ── Hero ──────────────────────────────────────────────────────── */}
        <section className="relative overflow-hidden">
          {/* Warm gradient background */}
          <div className="absolute inset-0 bg-gradient-to-b from-[#EDF7F2] via-background to-background pointer-events-none" />

          <div className="relative max-w-6xl mx-auto px-6 pt-20 pb-16 text-center">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 bg-[#EDF7F2] dark:bg-primary/10 border border-[#C3E8D8] dark:border-primary/30 text-[#0F6E56] text-xs font-medium px-4 py-1.5 rounded-full mb-6">
              <span className="w-1.5 h-1.5 rounded-full bg-[#0F6E56] animate-pulse" />
              Built for Canadian &amp; US small businesses
            </div>

            {/* Headline */}
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold text-foreground leading-tight tracking-tight mb-6 max-w-4xl mx-auto">
              Bookkeeping that{' '}
              <span className="text-[#0F6E56]">works as hard</span>
              {' '}as you do
            </h1>

            <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-8 leading-relaxed">
              Double-entry accounting, automatic bank sync, and tax-ready financial reports — all in one platform built for North American small businesses.
            </p>

            {/* CTAs */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-12">
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
              60-day free trial · No credit card required · Cancel anytime
            </p>

            {/* Dashboard mockup */}
            <div className="mx-auto max-w-4xl rounded-2xl border border-border shadow-2xl overflow-hidden bg-card">
              {/* Browser chrome */}
              <div className="bg-[#f0ede8] dark:bg-[#2a2720] border-b border-border px-4 py-3 flex items-center gap-2">
                <div className="flex gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-[#ffbd2e]" />
                  <div className="w-3 h-3 rounded-full bg-[#27c93f]" />
                  <div className="w-3 h-3 rounded-full bg-[#ff5f57]" />
                </div>
                <div className="flex-1 mx-4">
                  <div className="bg-background rounded-md px-3 py-1 text-xs text-muted-foreground max-w-xs mx-auto text-center">
                    gettempo.ca/dashboard
                  </div>
                </div>
              </div>

              {/* Mockup content */}
              <div className="p-6 bg-[#f5f3ef] dark:bg-[#1a1714]">
                {/* KPI row */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                  {[
                    { label: 'Total Revenue',  value: '$48,320',  color: 'border-[#0F6E56]', change: '+12.4%' },
                    { label: 'Total Expenses', value: '$31,840',  color: 'border-[#185FA5]', change: '+8.1%'  },
                    { label: 'Net Income',     value: '$16,480',  color: 'border-[#92620A]', change: '+18.2%' },
                    { label: 'Cash Balance',   value: '$24,150',  color: 'border-[#0F6E56]', change: '+5.3%'  },
                  ].map((kpi) => (
                    <div key={kpi.label} className={`bg-card rounded-xl p-3 border-t-2 ${kpi.color}`}>
                      <p className="text-xs text-muted-foreground mb-1">{kpi.label}</p>
                      <p className="text-lg font-bold text-foreground">{kpi.value}</p>
                      <p className="text-xs text-[#0F6E56]">{kpi.change}</p>
                    </div>
                  ))}
                </div>

                {/* Chart placeholder + recent transactions */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {/* Chart */}
                  <div className="md:col-span-2 bg-card rounded-xl p-4">
                    <p className="text-xs font-medium text-foreground mb-3">Revenue vs Expenses</p>
                    <div className="flex items-end gap-2 h-24">
                      {[65, 45, 72, 58, 80, 62, 75, 55, 85, 68, 90, 78].map((h, i) => (
                        <div key={i} className="flex-1 flex flex-col items-center gap-0.5">
                          <div className="w-full rounded-t" style={{ height: `${h * 0.6}%`, background: i % 2 === 0 ? '#0F6E56' : '#E5E1D8' }} />
                        </div>
                      ))}
                    </div>
                    <div className="flex items-center gap-3 mt-2">
                      <span className="flex items-center gap-1 text-xs text-muted-foreground"><span className="w-2 h-2 rounded-sm bg-[#0F6E56]"/>Revenue</span>
                      <span className="flex items-center gap-1 text-xs text-muted-foreground"><span className="w-2 h-2 rounded-sm bg-[#E5E1D8]"/>Expenses</span>
                    </div>
                  </div>

                  {/* Recent transactions */}
                  <div className="bg-card rounded-xl p-4">
                    <p className="text-xs font-medium text-foreground mb-3">Recent Transactions</p>
                    <div className="space-y-2">
                      {[
                        { name: 'Client Invoice #42', amt: '+$3,200', color: 'text-[#0F6E56]' },
                        { name: 'AWS Services',       amt: '-$184',   color: 'text-destructive' },
                        { name: 'Office Supplies',    amt: '-$67',    color: 'text-destructive' },
                        { name: 'Client Invoice #43', amt: '+$1,850', color: 'text-[#0F6E56]' },
                      ].map((tx) => (
                        <div key={tx.name} className="flex items-center justify-between">
                          <span className="text-xs text-muted-foreground truncate max-w-[110px]">{tx.name}</span>
                          <span className={`text-xs font-medium ${tx.color}`}>{tx.amt}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── Stats ─────────────────────────────────────────────────────── */}
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

        {/* ── Features ──────────────────────────────────────────────────── */}
        <section id="features" className="max-w-6xl mx-auto px-6 py-20">
          <div className="text-center mb-14">
            <p className="text-xs font-semibold text-[#0F6E56] uppercase tracking-wider mb-3">Features</p>
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              Everything you need to run your books
            </h2>
            <p className="text-muted-foreground max-w-xl mx-auto">
              From bank import to tax reports — Tempo handles the full bookkeeping workflow so you can focus on running your business.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {FEATURES.map((feature) => {
              const Icon = feature.icon;
              return (
                <div
                  key={feature.title}
                  className="bg-card border border-border rounded-2xl p-6 hover:border-[#0F6E56]/40 hover:shadow-sm transition-all"
                >
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-8 h-8 rounded-lg bg-[#EDF7F2] dark:bg-primary/10 flex items-center justify-center">
                      <Icon className="w-4 h-4 text-[#0F6E56]" />
                    </div>
                    <span className="text-xs font-semibold text-[#0F6E56] uppercase tracking-wider">
                      {feature.category}
                    </span>
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

        {/* ── Pricing preview ───────────────────────────────────────────── */}
        <section id="pricing" className="bg-card border-y border-border">
          <div className="max-w-6xl mx-auto px-6 py-20">
            <div className="text-center mb-14">
              <p className="text-xs font-semibold text-[#0F6E56] uppercase tracking-wider mb-3">Pricing</p>
              <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
                Simple, transparent pricing
              </h2>
              <p className="text-muted-foreground max-w-xl mx-auto">
                Start with a 60-day free trial. No credit card required. Upgrade when you're ready.
              </p>
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
                    <div className="flex items-baseline gap-0.5 mb-1">
                      <span className="text-3xl font-bold text-foreground">{plan.price}</span>
                      <span className="text-sm text-muted-foreground">{plan.period}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">{plan.description}</p>
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
                    href="/sign-up"
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
              Annual plans save up to 20%. {' '}
              <Link href="/pricing" className="text-[#0F6E56] hover:underline underline-offset-2">
                See full pricing details →
              </Link>
            </p>
          </div>
        </section>

        {/* ── FAQ ───────────────────────────────────────────────────────── */}
        <section id="faq" className="max-w-3xl mx-auto px-6 py-20">
          <div className="text-center mb-12">
            <p className="text-xs font-semibold text-[#0F6E56] uppercase tracking-wider mb-3">FAQ</p>
            <h2 className="text-3xl font-bold text-foreground mb-4">Common questions</h2>
            <p className="text-muted-foreground">
              Everything you need to know about Tempo. Can't find the answer?{' '}
              <a href="mailto:hello@gettempo.ca" className="text-[#0F6E56] hover:underline underline-offset-2">
                Email us.
              </a>
            </p>
          </div>
          <FaqAccordion />
        </section>

        {/* ── CTA Banner ────────────────────────────────────────────────── */}
        <section className="bg-[#0F6E56] dark:bg-[#085041]">
          <div className="max-w-4xl mx-auto px-6 py-16 text-center">
            <h2 className="text-3xl font-bold text-white mb-4">
              Start your free trial today
            </h2>
            <p className="text-[#C3E8D8] mb-8 max-w-xl mx-auto">
              60 days free, no credit card required. Join small businesses across Canada and the US already using Tempo.
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
