import Link from 'next/link';
import Image from 'next/image';
import { MarketingNav } from '@/components/marketing-nav';
import { MarketingFooter } from '@/components/marketing-footer';
import { MarketingThemeEnforcer } from '@/components/marketing-theme-enforcer';
import { FaqAccordion } from './(marketing)/faq-accordion';
import { DashboardCarousel } from './(marketing)/dashboard-carousel';
import {
  BarChart3, FileText, Shield, Zap, Sparkles,
  CheckCircle2, ArrowRight, BookOpen, Building2, Receipt,
} from 'lucide-react';

// ── Stats ─────────────────────────────────────────────────────────────────
const STATS = [
  { value: '12,000+', label: 'Banks connected via Plaid',   sub: 'Canada & United States' },
  { value: '60',      label: 'Day free trial',              sub: 'No charge · Cancel anytime' },
  { value: '100%',    label: 'Tax-ready documentation',     sub: 'Every transaction balanced' },
  { value: '5',       label: 'AI-powered features',         sub: 'Included on every plan' },
];

// ── Segments ──────────────────────────────────────────────────────────────
const SEGMENTS = [
  { emoji: '🏢', title: 'Business',   tagline: 'Tax-ready books for SMBs',      href: '#business'   },
  { emoji: '💼', title: 'Freelancer', tagline: 'Bookkeeping in 10 min/mo',      href: '#freelancer' },
  { emoji: '🏠', title: 'Personal',   tagline: 'See where your money goes',     href: '#personal'   },
  { emoji: '📊', title: 'Accountant', tagline: 'Manage all your clients',       href: '#accountants'},
];

// ── Segment deep-dives ────────────────────────────────────────────────────
const SEGMENT_DETAILS = [
  {
    id: 'business',
    emoji: '🏢',
    title: 'For Business Owners',
    tagline: 'Tax-ready books. Every single month.',
    pain: 'Most small business owners spend the last two weeks of March in a panic — hunting receipts, untangling transactions, and paying their accountant to fix what should have been right all year.',
    bullets: [
      'Bank sync imports and classifies transactions automatically — no manual entry',
      'HST/GST is split and posted to the correct liability account on every transaction',
      'CRA remittance report (GST34 lines 101–113) is always one click away',
      'Income Statement and Balance Sheet update in real time as you post',
      'AI anomaly detection flags unusual charges before they become problems',
      'Fiscal year locking prevents retroactive changes once you file',
    ],
    cta: 'Start your free 60-day trial',
    ctaHref: '/sign-up',
  },
  {
    id: 'freelancer',
    emoji: '💼',
    title: 'For Freelancers & Sole Proprietors',
    tagline: 'Bookkeeping that takes 10 minutes a month.',
    pain: "You didn't start freelancing to spend your weekends categorizing expenses. Tempo Books handles the accounting so you can focus on the work that actually pays.",
    bullets: [
      'Connect your bank and let Tempo classify every transaction automatically',
      'Split personal and business expenses on the same account — no separate bank required',
      'HST/GST tracked per transaction, remittance report ready when you need it',
      'Income Statement shows exactly what you earned and what it cost you',
      'AI Transaction Explainer breaks down any charge in plain English',
      '$10/mo on Starter — less than one billable hour',
    ],
    cta: 'Start free — 60 days',
    ctaHref: '/sign-up',
  },
  {
    id: 'personal',
    emoji: '🏠',
    title: 'For Personal Finance',
    tagline: 'Finally know where every dollar went.',
    pain: 'Budgeting apps give you charts. Tempo gives you a real ledger — the same system accountants use, built for people who want to actually understand their money.',
    bullets: [
      'Connect your personal accounts and import all transactions automatically',
      'Categorize spending by account type — housing, food, transport, subscriptions',
      'See a real Income vs Expense view by month, quarter, or year',
      'Track net worth with a live Balance Sheet of your assets and liabilities',
      'AI assistant answers plain-language questions about your spending',
      'Included on the Starter plan — $10/mo',
    ],
    cta: 'Start free — see your full financial picture in minutes',
    ctaHref: '/sign-up',
  },
  {
    id: 'accountants',
    emoji: '📊',
    title: 'For Accountants & Bookkeeping Firms',
    tagline: 'Your client portal. Your brand. Your workflow.',
    pain: "Switching between client logins, chasing down bank statements, and explaining the same transaction twice — that's time your firm can't bill for. Tempo Books' Accountant Portal was built to eliminate all of it.",
    bullets: [
      'Single dashboard for all client businesses — KPI cards, status, balance at a glance',
      'White-label subdomain: yourfirm.gettempo.ca — client-facing with your branding',
      'Request edit access with one click — full dual audit log of every change',
      'AI anomaly detection runs across all client books simultaneously',
      'Onboard a new client in under 5 minutes — invite by email, they connect their bank',
      'Metered billing: $149/mo base includes 5 clients, +$15/mo per additional',
    ],
    cta: 'See Accountant Portal pricing',
    ctaHref: '/pricing',
  },
];

// ── Segment background images (Unsplash — all confirmed free) ─────────────
const SEGMENT_IMAGES: Record<string, string> = {
  business:    'https://images.unsplash.com/photo-1758874384232-cfa79a5babf1?q=80&w=1332&auto=format&fit=crop',
  freelancer:  'https://images.unsplash.com/photo-1755156137044-5d33290a94ca?q=80&w=688&auto=format&fit=crop',
  personal:    'https://images.unsplash.com/photo-1758876202040-cae084bafdb6?q=80&w=1332&auto=format&fit=crop',
  accountants: 'https://images.unsplash.com/photo-1606836576983-8b458e75221d?q=80&w=1170&auto=format&fit=crop',
};

// ── Features ──────────────────────────────────────────────────────────────
const FEATURES = [
  {
    category: 'AI',
    icon: Sparkles,
    title: 'Not a chatbot. A bookkeeper that reads your ledger.',
    description:
      "Tempo's AI runs on your actual financial data — real journal entries, real accounts, real amounts. Classify transactions, detect anomalies, explain charges in plain language, and generate a year-end summary. Ask it anything. It already knows the answer.",
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
    title: 'HST, GST, CRA — handled automatically.',
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
    title: 'Real double-entry accounting. No spreadsheet hacks.',
    description:
      'Every transaction creates balanced journal entries automatically. Debits equal credits. Your books are always accurate — the same standard your accountant expects.',
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
    title: 'Connect your bank in seconds. Import everything.',
    description:
      'Link your bank account via Plaid for automatic transaction import. Transactions are classified, deduplicated, and posted to your ledger — zero manual entry, ever.',
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
    title: 'Every report you need. Always up to date.',
    description:
      'Income Statement, Balance Sheet, Trial Balance, and General Ledger — generated from your actual journal entries. Filter by any date range, export PDF or CSV in one click.',
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
    title: 'A dedicated portal for accounting firms.',
    description:
      "Manage every client from one dashboard. White-label with your firm's brand, onboard clients in minutes, and request edit access with a full audit trail of every change made.",
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
    description: 'For freelancers — real books for $10/mo',
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
    description: 'For businesses that are scaling fast',
    features: [
      'Up to 2,500 transactions/mo',
      'Everything in Starter',
      'Multi-user access',
      'Invoicing & AP/AR',
      'AI assistant (200 calls/mo)',
      '6-year CRA receipt repository',
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
    description: 'For firms managing client books at scale',
    features: [
      '5 client businesses included',
      '3 staff seats included',
      'White-label subdomain',
      'Full firm portal + audit log',
      'AI (500 calls/mo · unlimited add-on)',
      '6-year CRA receipt repository',
      '+$15/mo per additional client',
    ],
    highlight: false,
    cta: 'See Accountant pricing',
    ctaHref: '/pricing',
  },
];

// ── Testimonials ──────────────────────────────────────────────────────────
const TESTIMONIALS = [
  {
    quote: "Before Tempo Books, I was reconciling in spreadsheets every Sunday night. Now my books are current by Tuesday and I actually understand where my money went.",
    name: "Marcus T.",
    role: "Business Owner, Toronto",
  },
  {
    quote: "Filing my HST used to take me half a day of digging through bank statements. Tempo Books has everything categorized and the HST report is ready in minutes.",
    name: "Priya N.",
    role: "Freelancer, Vancouver",
  },
  {
    quote: "I manage 12 clients through the Accountant Portal. Being able to see their transactions and post journal entries in one place has cut my monthly close time in half.",
    name: "Sandra O.",
    role: "Bookkeeper, Calgary",
  },
  {
    quote: "I finally know where my paycheque actually goes. The budget categories and savings goals keep me on track without me having to think about it.",
    name: "James K.",
    role: "Personal, Toronto",
  },
];

// ── Page ──────────────────────────────────────────────────────────────────
export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <script
        dangerouslySetInnerHTML={{
          __html: `
            try {
              document.documentElement.dataset.forceLight = 'true';
              document.documentElement.classList.remove('dark');
            } catch(e) {}
          `,
        }}
      />
      <MarketingThemeEnforcer />
      <MarketingNav />

      <main className="flex-1">

        {/* ── Hero ───────────────────────────────────────────────────── */}
        <section className="relative overflow-hidden">

          {/* Hero background photo — confirmed free Unsplash license */}
          <Image
            src="https://images.unsplash.com/photo-1716703373229-b0e43de7dd5c?q=80&w=1920&auto=format&fit=crop"
            alt=""
            fill
            className="object-cover object-center"
            priority
            aria-hidden="true"
          />
          {/* Dark overlay — heavy at top for text, fades to background so stats row blends */}
          <div className="absolute inset-0 bg-gradient-to-b from-black/65 via-black/55 to-background pointer-events-none" />

          {/* Hero content */}
          <div className="relative max-w-6xl mx-auto px-6 pt-20 pb-16 text-center">

            <div className="inline-flex items-center gap-2 bg-[#0F6E56] text-white text-xs font-semibold px-4 py-1.5 rounded-full mb-4">
              <Zap className="w-3 h-3" /> Launch offer: 50% off Starter & Pro
            </div>

            <div className="inline-flex items-center gap-2 bg-white/15 border border-white/30 text-white text-xs font-medium px-4 py-1.5 rounded-full mb-6 ml-2">
              <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
              Built for businesses, freelancers, personal accounts &amp; accountants
            </div>

            <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold text-white leading-tight tracking-tight mb-6 max-w-4xl mx-auto">
              Clean books. Every month.{' '}
              <span className="text-[#5ECBA1]">Not just at tax time.</span>
            </h1>

            <p className="text-lg text-white/80 max-w-2xl mx-auto mb-8 leading-relaxed">
              Tempo Books handles double-entry accounting, bank sync, AI transaction classification, and HST/GST tracking — whether you run a business, freelance, manage personal finances, or handle client books.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-8">
              <Link
                href="/sign-up"
                className="inline-flex items-center gap-2 bg-[#0F6E56] text-white px-6 py-3 rounded-xl font-semibold text-sm hover:bg-[#085041] transition-colors shadow-sm"
              >
                Start free — 60 days <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                href="#features"
                className="inline-flex items-center gap-2 border border-white/30 bg-white/10 text-white px-6 py-3 rounded-xl font-semibold text-sm hover:bg-white/20 hover:border-white/50 transition-colors"
              >
                See how it works →
              </Link>
            </div>

            <p className="text-xs text-white/60 mb-12">
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

        {/* ── Segment Selector ───────────────────────────────────────── */}
        <section className="max-w-6xl mx-auto px-6 py-16">
          <div className="text-center mb-10">
            <p className="text-xs font-semibold text-[#0F6E56] uppercase tracking-wider mb-3">Who It&apos;s For</p>
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              One product. Built for how you actually work.
            </h2>
            <p className="text-muted-foreground max-w-xl mx-auto">
              Whether you run a business, freelance, manage your own money, or handle books for clients — Tempo Books is built for exactly that.
            </p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {SEGMENTS.map((seg) => (
              <a
                key={seg.href}
                href={seg.href}
                className="group rounded-2xl border border-border bg-card hover:border-[#0F6E56] hover:shadow-sm transition-all p-6 flex flex-col items-center text-center"
              >
                <span className="text-4xl mb-3">{seg.emoji}</span>
                <p className="text-sm font-semibold text-foreground mb-1 group-hover:text-[#0F6E56] transition-colors">{seg.title}</p>
                <p className="text-xs text-muted-foreground mb-3">{seg.tagline}</p>
                <span className="text-xs font-semibold text-[#0F6E56]">Learn more →</span>
              </a>
            ))}
          </div>
        </section>

        {/* ── Segment Deep Dives ─────────────────────────────────────── */}
        <section className="max-w-6xl mx-auto px-6 pb-10 space-y-8">
          {SEGMENT_DETAILS.map((seg) => (
            <div
              key={seg.id}
              id={seg.id}
              className="relative rounded-2xl border border-border overflow-hidden scroll-mt-20"
            >
              {/* Background photo */}
              {SEGMENT_IMAGES[seg.id] && (
                <Image
                  src={SEGMENT_IMAGES[seg.id]}
                  alt=""
                  fill
                  className="object-cover object-center"
                  aria-hidden="true"
                />
              )}
              {/* Gradient overlay — heavy on left where content sits, fades to right */}
              <div className="absolute inset-0 bg-gradient-to-r from-background/95 via-background/88 to-background/60 pointer-events-none" />

              {/* Content */}
              <div className="relative p-8 md:p-10">
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-3xl">{seg.emoji}</span>
                  <h2 className="text-2xl md:text-3xl font-bold text-foreground">{seg.title}</h2>
                </div>
                <p className="text-[#0F6E56] font-semibold text-lg mb-4">{seg.tagline}</p>
                <p className="text-muted-foreground leading-relaxed mb-6 max-w-2xl italic">{seg.pain}</p>
                <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-8">
                  {seg.bullets.map((b) => (
                    <li key={b} className="flex items-start gap-2 text-sm">
                      <CheckCircle2 className="w-4 h-4 text-[#0F6E56] flex-shrink-0 mt-0.5" />
                      <span className="text-muted-foreground">{b}</span>
                    </li>
                  ))}
                </ul>
                <Link
                  href={seg.ctaHref}
                  className="inline-flex items-center gap-2 bg-[#0F6E56] text-white px-5 py-2.5 rounded-xl font-semibold text-sm hover:bg-[#085041] transition-colors"
                >
                  {seg.cta} <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
          ))}
        </section>

        {/* ── AI Feature highlight ────────────────────────────────────── */}
        <section className="max-w-6xl mx-auto px-6 py-10">
          <div className="rounded-2xl bg-gradient-to-r from-[#EDF7F2] to-[#f5f3ef] dark:from-card dark:to-card border border-[#C3E8D8] dark:border-border p-8 md:p-10">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
              <div>
                <div className="inline-flex items-center gap-2 bg-[#0F6E56] text-white text-xs font-semibold px-3 py-1 rounded-full mb-4">
                  <Sparkles className="w-3 h-3" /> Powered by Claude AI
                </div>
                <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-4">
                  Not a chatbot. A bookkeeper that reads your ledger.
                </h2>
                <p className="text-muted-foreground leading-relaxed mb-6">
                  Tempo&apos;s AI runs on your actual financial data — real journal entries, real accounts, real amounts. Ask it anything. It already knows the answer.
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
                  { label: 'Income Statement',     desc: 'Revenue, expenses, net income by period' },
                  { label: 'Balance Sheet',         desc: 'Assets, liabilities, and equity snapshot' },
                  { label: 'CRA Remittance Report', desc: 'GST34 lines pre-calculated, export ready' },
                  { label: 'General Ledger',        desc: 'Every transaction with full audit trail' },
                  { label: 'Year-End AI Summary',   desc: 'Observations, adjustments, and checklist PDF' },
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
              The full bookkeeping stack. Nothing missing.
            </h2>
            <p className="text-muted-foreground max-w-xl mx-auto">
              From bank import to year-end filing — every feature you need, none you don&apos;t.
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
                      ? 'border-[#0F6E56] bg-[#EDF7F2] dark:bg-card'
                      : 'border-border bg-card hover:border-[#0F6E56]/40 hover:shadow-sm',
                  ].join(' ')}
                >
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-8 h-8 rounded-lg bg-[#EDF7F2] dark:bg-[#0F6E56]/20 flex items-center justify-center">
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

        {/* ── Social Proof ────────────────────────────────────────────── */}
        <section className="bg-card border-y border-border">
          <div className="max-w-6xl mx-auto px-6 py-20">
            <div className="text-center mb-12">
              <p className="text-xs font-semibold text-[#0F6E56] uppercase tracking-wider mb-3">What People Say</p>
              <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
                Real businesses. Real books. Zero spreadsheets.
              </h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {TESTIMONIALS.map((t, i) => (
                <div key={i} className="rounded-2xl border border-border bg-background p-6 flex flex-col">
                  <p className="text-3xl text-[#0F6E56] mb-4 leading-none">&ldquo;</p>
                  <p className="text-sm text-muted-foreground leading-relaxed flex-1 italic mb-6">{t.quote}</p>
                  <div>
                    <p className="text-sm font-semibold text-foreground">{t.name}</p>
                    <p className="text-xs text-muted-foreground">{t.role}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Receipt Repository ──────────────────────────────────────── */}
        <section className="max-w-6xl mx-auto px-6 py-16">
          <div className="rounded-2xl border-2 border-[#0F6E56] bg-[#EDF7F2] p-8 md:p-12">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-10 items-center">
              <div>
                <div className="inline-flex items-center gap-2 bg-[#0F6E56] text-white text-xs font-semibold px-3 py-1 rounded-full mb-4">
                  <Receipt className="w-3 h-3" /> CRA Audit Protection — Pro &amp; Accountant
                </div>
                <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-4">
                  Your receipts. Stored. Searchable.<br />
                  <span className="text-[#0F6E56]">CRA-ready for 6 years.</span>
                </h2>
                <p className="text-muted-foreground leading-relaxed mb-6">
                  CRA can audit any business up to 6 years back. Most small businesses can&apos;t produce the records to defend their deductions — not because the expenses weren&apos;t real, but because the receipts are gone. Every receipt and invoice you capture in Tempo Books is stored and retained for 6 full years from the date you upload it. Start tracking today — and six years from now, every record is exactly where CRA expects it to be.
                </p>
                <ul className="space-y-3 mb-6">
                  {[
                    'Upload any format — photos of paper receipts or PDF invoices',
                    'Linked directly to the transaction and journal entry it supports',
                    'Searchable by date, vendor, amount, or expense category',
                    'Every receipt retained for 6 years from date of upload',
                    'CRA accepts digital images as valid records — Tempo keeps them compliant',
                  ].map((point) => (
                    <li key={point} className="flex items-start gap-2 text-sm">
                      <CheckCircle2 className="w-4 h-4 text-[#0F6E56] flex-shrink-0 mt-0.5" />
                      <span className="text-foreground">{point}</span>
                    </li>
                  ))}
                </ul>
                <div className="inline-flex items-center gap-2 bg-white border border-[#C3E8D8] text-[#0F6E56] text-xs font-semibold px-3 py-1.5 rounded-lg">
                  Included on Pro and Accountant plans
                </div>
              </div>

              {/* Visual mockup */}
              <div className="bg-white rounded-2xl border border-[#C3E8D8] shadow-sm overflow-hidden">
                <div className="px-4 py-3 border-b border-[#C3E8D8] flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Receipt className="w-4 h-4 text-[#0F6E56]" />
                    <p className="text-xs font-semibold text-foreground">Receipt Repository</p>
                  </div>
                  <span className="text-xs text-[#0F6E56] font-medium bg-[#EDF7F2] px-2 py-0.5 rounded-full">6-year retention</span>
                </div>
                <div className="p-4 space-y-2">
                  {[
                    { name: 'Home Depot — lumber & supplies', date: 'Apr 3, 2025', amt: '$847.20', cat: 'Materials', tag: 'PDF' },
                    { name: 'Rogers — business phone plan',   date: 'Apr 1, 2025', amt: '$95.00',  cat: 'Phone',     tag: 'Photo' },
                    { name: 'Amazon — office equipment',      date: 'Mar 28, 2025', amt: '$312.50', cat: 'Equipment', tag: 'PDF' },
                    { name: 'Shell — fuel receipt',           date: 'Mar 26, 2025', amt: '$124.80', cat: 'Vehicle',   tag: 'Photo' },
                    { name: 'Staples — office supplies',      date: 'Mar 20, 2025', amt: '$67.45',  cat: 'Office',    tag: 'PDF' },
                  ].map((r) => (
                    <div key={r.name} className="flex items-center gap-3 p-2.5 rounded-xl bg-[#F9FAFB] hover:bg-[#EDF7F2] transition-colors">
                      <div className="w-7 h-7 rounded-lg bg-[#EDF7F2] flex items-center justify-center flex-shrink-0">
                        <Receipt className="w-3.5 h-3.5 text-[#0F6E56]" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-foreground truncate">{r.name}</p>
                        <p className="text-xs text-muted-foreground">{r.date} · {r.cat}</p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-xs font-semibold text-foreground">{r.amt}</p>
                        <span className="text-xs bg-[#EDF7F2] text-[#0F6E56] px-1.5 py-0.5 rounded font-medium">{r.tag}</span>
                      </div>
                    </div>
                  ))}
                  <div className="pt-2 border-t border-[#E5E7EB] flex items-center justify-between">
                    <p className="text-xs text-muted-foreground">247 receipts stored · Retained 6 years from upload</p>
                    <p className="text-xs text-[#0F6E56] font-semibold">CRA-ready ✓</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── Pricing ─────────────────────────────────────────────────── */}
        <section id="pricing" className="bg-background border-b border-border">
          <div className="max-w-6xl mx-auto px-6 py-20">
            <div className="text-center mb-6">
              <p className="text-xs font-semibold text-[#0F6E56] uppercase tracking-wider mb-3">Pricing</p>
              <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
                Pricing that makes sense from day one.
              </h2>
              <p className="text-muted-foreground max-w-xl mx-auto">
                60 days free. Pick a plan, connect your bank, and your books are running before your trial ends.
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
              Annual plans save you 2 months — pay for 10, get 12.{' '}
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
            <h2 className="text-3xl font-bold text-foreground mb-4">
              The questions worth answering honestly.
            </h2>
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
              Your books should be ready before you need them.
            </h2>
            <p className="text-[#C3E8D8] mb-8 max-w-xl mx-auto">
              Not the night before filing. Not after a frantic call to your accountant. Every month, automatically — starting now.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link
                href="/sign-up"
                className="inline-flex items-center gap-2 bg-white text-[#0F6E56] px-6 py-3 rounded-xl font-semibold text-sm hover:bg-[#EDF7F2] transition-colors"
              >
                Start free — 60 days <ArrowRight className="w-4 h-4" />
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
