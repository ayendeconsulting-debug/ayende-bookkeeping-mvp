import Link from 'next/link';
import { MarketingNav } from '@/components/marketing-nav';
import { MarketingFooter } from '@/components/marketing-footer';
import { FaqAccordion } from './(marketing)/faq-accordion';
import { DashboardCarousel } from './(marketing)/dashboard-carousel';
import {
  BarChart3, FileText, Shield, Zap, Users, Globe, Sparkles,
  CheckCircle2, ArrowRight,
} from 'lucide-react';

/* ── Stats ───────────────────────────────────────────────────────────────── */
const STATS = [
  { value: '12,000+', label: 'Banks connected via Plaid', sub: 'Canada & United States' },
  { value: '60',      label: 'Day free trial',            sub: 'Card required · No charge' },
  { value: '100%',    label: 'Double-entry accounting',   sub: 'Every transaction balanced' },
  { value: '4',       label: 'Financial reports',         sub: 'IS, BS, TB, General Ledger' },
];

/* ── Features ─────────────────────────────────────────────────────────────── */
const FEATURES = [
  {
    category: 'AI',
    icon: Sparkles,
    title: 'AI bookkeeping assistant',
    description:
      'Ask your books anything in plain English. Get instant answers about margins, expenses, revenue trends, and tax — powered by Claude AI on your actual financial data.',
    points: ['Ad hoc financial questions', 'Trend analysis', 'Expense breakdowns', 'Included on every plan'],
    highlight: true,
  },
  {
    category: 'Accounting',
    icon: BarChart3,
    title: 'Real double-entry accounting',
    description:
      'Every transaction creates balanced journal entries automatically. Your books are always accurate — no spreadsheet hacks, no single-entry workarounds.',
    points: ['Automated journal entries', 'Debit/credit validation', 'Owner contributions & draws', 'Fiscal year locking'],
    highlight: false,
  },
  {
    category: 'Banking',
    icon: Zap,
    title: 'Connect your bank in seconds',
    description:
      'Link your business bank account via Plaid for automatic transaction import. Transactions are classified, deduplicated, and posted to your ledger — zero manual entry.',
    points: ['12,000+ institutions', 'Real-time sync', 'Duplicate detection', 'Secure read-only access'],
    highlight: false,
  },
  {
    category: 'Reporting',
    icon: FileText,
    title: 'Tax-ready financial reports',
    description:
      'Generate an Income Statement, Balance Sheet, Trial Balance, and General Ledger with one click. Filter by date range, export as PDF or CSV.',
    points: ['Income Statement', 'Balance Sheet', 'CRA & IRS compatible', 'PDF & CSV export'],
    highlight: false,
  },
  {
    category: 'Tax',
    icon: Shield,
    title: 'HST, GST, and sales tax built in',
    description:
      'Set up your tax codes once. Tempo automatically splits the net and tax amounts into the right accounts when you classify a transaction.',
    points: ['HST & GST support', 'US sales tax', 'Automatic tax splitting', 'Tax liability tracking'],
    highlight: false,
  },
  {
    category: 'Coverage',
    icon: Globe,
    title: 'Built for Canada and the US',
    description:
      'Purpose-built for North American small businesses. CAD and USD currencies, CRA and IRS reporting, and bank connectivity across both countries.',
    points: ['CAD & USD', 'CRA & IRS ready', 'Canadian & US banks', 'HST, GST, sales tax'],
    highlight: false,
  },
];

/* ── Pricing preview ─────────────────────────────────────────────────────── */
const PLANS = [
  {
    name: 'Starter',
    regular: '$19',
    price: '$10',
    period: ' CAD/mo',
    description: 'For freelancers and solo founders',
    features: ['Up to 500 transactions/mo', '4 financial reports', 'Bank connectivity', 'AI assistant', 'Email support'],
    highlight: false,
  },
  {
    name: 'Pro',
    regular: '$49',
    price: '$25',
    period: ' CAD/mo',
    description: 'For growing small businesses',
    features: ['Up to 2,500 transactions/mo', 'Everything in Starter', 'Multi-user access', 'Invoicing & AP/AR', 'Priority support'],
    highlight: true,
  },
  {
    name: 'Accountant',
    regular: '$99',
    price: '$50',
    period: ' CAD/mo',
    description: 'For accounting firms & multi-client',
    features: ['Unlimited transactions', 'Everything in Pro', 'Multiple businesses', 'Accountant role access', 'Dedicated support'],
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
          <div className="absolute inset-0 bg-gradient-to-b from-[#EDF7F2] via-background to-background pointer-events-none" />
          <div className="relative max-w-6xl mx-auto px-6 pt-20 pb-16 text-center">

            {/* Launch offer badge */}
            <div className="inline-flex items-center gap-2 bg-[#0F6E56] text-white text-xs font-semibold px-4 py-1.5 rounded-full mb-4">
              <Zap className="w-3 h-3" /> Launch offer: 50% off all plans
            </div>

            <div className="inline-flex items-center gap-2 bg-[#EDF7F2] dark:bg-primary/10 border border-[#C3E8D8] dark:border-primary/30 text-[#0F6E56] text-xs font-medium px-4 py-1.5 rounded-full mb-6 ml-2">
              <span className="w-1.5 h-1.5 rounded-full bg-[#0F6E56] animate-pulse" />
              Built for Canadian &amp; US small businesses
            </div>

            <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold text-foreground leading-tight tracking-tight mb-6 max-w-4xl mx-auto">
              Bookkeeping that{' '}
              <span className="text-[#0F6E56]">works as hard</span>
              {' '}as you do
            </h1>

            <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-8 leading-relaxed">
              Double-entry accounting, automatic bank sync, AI-powered ad hoc reporting, and tax-ready financial reports — all in one platform for North American small businesses.
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
              60-day free trial · Card required · No charge during trial · Auto-continues on Starter after trial
            </p>

            {/* Dashboard carousel */}
            <DashboardCarousel />
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

        {/* ── AI Feature highlight ───────────────────────────────────────── */}
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
                  Get instant ad hoc answers from your actual financial data. No more waiting for your accountant to run a custom report — just ask.
                </p>
                <ul className="space-y-2 mb-6">
                  {[
                    '"What was my net profit margin in Q1?"',
                    '"Show me my top 5 expense categories"',
                    '"Am I on track for my annual revenue target?"',
                    '"Which clients owe me money right now?"',
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
                      Your Q1 net profit margin was <strong>34.1%</strong> — net income of $16,480 on revenue of $48,320. This is up from 29.8% in Q4 2025, driven by lower software costs. 📈
                    </div>
                  </div>
                  <div className="flex justify-end">
                    <div className="bg-[#0F6E56] text-white text-xs px-3 py-2 rounded-xl rounded-tr-sm max-w-[80%]">
                      Which clients still owe me money?
                    </div>
                  </div>
                  <div className="flex justify-start">
                    <div className="bg-muted text-foreground text-xs px-3 py-2 rounded-xl rounded-tl-sm max-w-[85%] leading-relaxed">
                      3 outstanding invoices: <strong>Northern Labs</strong> $5,400 (15 days overdue), <strong>Acme Corp</strong> $3,200 (due Apr 15), <strong>Peak Solutions</strong> $2,100 (due Apr 20).
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── Features ──────────────────────────────────────────────────── */}
        <section id="features" className="max-w-6xl mx-auto px-6 py-10 pb-20">
          <div className="text-center mb-14">
            <p className="text-xs font-semibold text-[#0F6E56] uppercase tracking-wider mb-3">Features</p>
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              Everything you need to run your books
            </h2>
            <p className="text-muted-foreground max-w-xl mx-auto">
              From bank import to AI reporting — Tempo handles the full bookkeeping workflow.
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

        {/* ── Pricing preview ───────────────────────────────────────────── */}
        <section id="pricing" className="bg-card border-y border-border">
          <div className="max-w-6xl mx-auto px-6 py-20">
            <div className="text-center mb-6">
              <p className="text-xs font-semibold text-[#0F6E56] uppercase tracking-wider mb-3">Pricing</p>
              <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
                Simple, transparent pricing
              </h2>
              <p className="text-muted-foreground max-w-xl mx-auto">
                50% off all plans at launch. 60-day free trial. Card required — no charge during trial.
              </p>
            </div>

            {/* Launch discount callout */}
            <div className="flex items-center justify-center gap-2 bg-[#0F6E56] text-white text-sm font-medium px-5 py-2.5 rounded-xl mb-10 max-w-lg mx-auto">
              <Zap className="w-4 h-4 flex-shrink-0" />
              Launch offer: 50% off — prices shown already discounted
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
                    <p className="text-xs text-muted-foreground line-through">was {plan.regular} CAD/mo</p>
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
                    href="/sign-up"
                    className={[
                      'text-center text-sm font-semibold px-4 py-2.5 rounded-xl transition-colors',
                      plan.highlight
                        ? 'bg-[#0F6E56] text-white hover:bg-[#085041]'
                        : 'border border-border hover:border-[#0F6E56] hover:text-[#0F6E56]',
                    ].join(' ')}
                  >
                    Start free trial
                  </Link>
                </div>
              ))}
            </div>

            <p className="text-center text-xs text-muted-foreground mt-6">
              Annual plans get 2 months free.{' '}
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
              Can't find the answer?{' '}
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
              60 days free, card required, no charge during trial. Auto-continues on Starter — cancel anytime.
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
