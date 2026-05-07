import { Check, Shield, Building2, Clock, ChevronRight } from 'lucide-react';

// ── Update this to the Accountant plan checkout destination ──────────────────
const CHECKOUT_URL = '/sign-up?plan=accountant';

const PLAN_FEATURES = [
  'Unlimited client organizations',
  'Per-client metered billing — pay for what you use',
  'Multi-seat team access with role controls',
  'AI-powered transaction classification',
  'Bulk receipt export (CRA-ready ZIP)',
  'Canadian tax codes — HST, GST, PST, QST',
  'Client bank connection via Plaid (12,000+ institutions)',
  'Double-entry General Ledger engine',
  'Income Statement, Balance Sheet, Trial Balance',
  'White-label subdomain portal for your firm',
  'Full audit trail on every transaction',
  'Priority email support',
];

const STEPS = [
  {
    number: '01',
    title: 'Invite your clients',
    description:
      'Send a portal link. Clients join in minutes — no accounting knowledge required.',
  },
  {
    number: '02',
    title: 'Clients connect and upload',
    description:
      'Bank feeds connect via Plaid. Receipts upload on mobile. Data flows to you automatically.',
  },
  {
    number: '03',
    title: 'You review, classify, export',
    description:
      'AI pre-classifies transactions. You review, post to the ledger, and export tax-ready reports.',
  },
];

const PAIN_POINTS = [
  'Client data scattered across emails, spreadsheets, and shared drives',
  'Chasing receipts and bank statements every quarter',
  'Year-end surprises because nothing was reconciled in real time',
];

const TRUST_SIGNALS = [
  {
    Icon: Shield,
    label: 'Bank-grade encryption',
    sub: 'Plaid-connected. All data encrypted at rest and in transit.',
  },
  {
    Icon: Building2,
    label: 'Built for Canada',
    sub: 'HST, GST, PST, QST, and CRA compliance built in from day one.',
  },
  {
    Icon: Clock,
    label: '30-day guarantee',
    sub: 'Full refund if it is not the right fit for your firm.',
  },
];

export default function CampaignPage() {
  return (
    <div className="overflow-x-hidden">
      {/* ── Hero ────────────────────────────────────────────────────────────── */}
      <section className="max-w-5xl mx-auto px-6 pt-20 pb-16 text-center">
        <div className="inline-flex items-center gap-2 bg-[#E1F5EE] text-[#0F6E56] text-xs font-semibold px-3 py-1.5 rounded-full mb-6">
          <span className="w-1.5 h-1.5 bg-[#0F6E56] rounded-full" />
          Built exclusively for accounting firms
        </div>
        <h1 className="text-4xl md:text-6xl font-bold text-gray-900 leading-[1.08] tracking-tight mb-6">
          One portal.<br />Every client.<br />
          <span className="text-[#0F6E56]">Tax season, handled.</span>
        </h1>
        <p className="text-lg md:text-xl text-gray-600 max-w-2xl mx-auto mb-10 leading-relaxed">
          Tempo Books gives your firm a single workspace to manage every client&apos;s
          bookkeeping — bank feeds, receipts, ledger, and tax-ready reports. No
          spreadsheets. No chasing.
        </p>
        <div className="flex flex-col items-center gap-3">
          <a
            href={CHECKOUT_URL}
            className="inline-flex items-center gap-2 bg-[#0F6E56] text-white text-base font-semibold px-8 py-4 rounded-xl hover:bg-[#1B6B4A] transition-colors shadow-lg shadow-[#0F6E56]/20"
          >
            Start with Tempo
            <ChevronRight className="w-4 h-4" />
          </a>
          <p className="text-xs text-gray-500">
            30-day money-back guarantee &middot; No trial limitations &middot; Cancel anytime
          </p>
        </div>
      </section>

      {/* ── Problem band ────────────────────────────────────────────────────── */}
      <section className="bg-[#0F6E56] py-14">
        <div className="max-w-5xl mx-auto px-6">
          <p className="text-[#E1F5EE] text-xs font-semibold uppercase tracking-widest text-center mb-10">
            Sound familiar?
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {PAIN_POINTS.map((pain, i) => (
              <div key={i} className="border border-white/20 rounded-xl p-6">
                <p className="text-white font-semibold text-base leading-snug">{pain}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How it works ────────────────────────────────────────────────────── */}
      <section className="max-w-5xl mx-auto px-6 py-20">
        <p className="text-xs font-semibold text-[#0F6E56] uppercase tracking-widest text-center mb-3">
          How it works
        </p>
        <h2 className="text-3xl md:text-4xl font-bold text-gray-900 text-center mb-14">
          From signup to tax-ready in days.
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
          {STEPS.map((step) => (
            <div key={step.number}>
              <p className="text-6xl font-black text-[#0F6E56]/10 mb-3 leading-none select-none">
                {step.number}
              </p>
              <h3 className="text-lg font-bold text-gray-900 mb-2">{step.title}</h3>
              <p className="text-sm text-gray-600 leading-relaxed">{step.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Accountant plan card ─────────────────────────────────────────────── */}
      <section className="bg-gray-50 border-y border-gray-100 py-20">
        <div className="max-w-xl mx-auto px-6">
          <p className="text-xs font-semibold text-[#0F6E56] uppercase tracking-widest text-center mb-3">
            The plan
          </p>
          <h2 className="text-3xl font-bold text-gray-900 text-center mb-10">
            Accountant Portal
          </h2>
          <div className="bg-white rounded-2xl border-2 border-[#0F6E56] shadow-xl shadow-[#0F6E56]/10 overflow-hidden">
            {/* Pricing header */}
            <div className="bg-[#0F6E56] px-8 py-8 text-white">
              <div className="flex items-end gap-1 mb-1">
                <span className="text-5xl font-black">$99</span>
                <span className="text-lg font-medium mb-2 opacity-80">/mo CAD</span>
              </div>
              <p className="text-sm text-white/70">
                Base &middot; + per client &middot; + per seat &middot; + AI add-on
              </p>
              <p className="text-xs text-white/55 mt-1">
                Scale pricing — only pay for what your firm uses
              </p>
            </div>
            {/* Features list */}
            <div className="px-8 py-7">
              <ul className="space-y-3 mb-8">
                {PLAN_FEATURES.map((f, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <Check className="w-4 h-4 text-[#0F6E56] mt-0.5 shrink-0" />
                    <span className="text-sm text-gray-700">{f}</span>
                  </li>
                ))}
              </ul>
              {/* Guarantee badge */}
              <div className="bg-[#E1F5EE] rounded-xl px-5 py-4 mb-6 flex items-center gap-3">
                <Shield className="w-5 h-5 text-[#0F6E56] shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-[#0F6E56]">
                    30-day money-back guarantee
                  </p>
                  <p className="text-xs text-gray-600">
                    Not the right fit? Full refund, no questions asked.
                  </p>
                </div>
              </div>
              <a
                href={CHECKOUT_URL}
                className="block w-full text-center bg-[#0F6E56] text-white font-semibold py-3.5 rounded-xl hover:bg-[#1B6B4A] transition-colors"
              >
                Get Started →
              </a>
              <p className="text-xs text-gray-400 text-center mt-3">
                No trial limitations. Full access from day one.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Trust signals ────────────────────────────────────────────────────── */}
      <section className="max-w-5xl mx-auto px-6 py-16">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {TRUST_SIGNALS.map(({ Icon, label, sub }) => (
            <div
              key={label}
              className="flex items-start gap-4 p-6 bg-white border border-gray-100 rounded-xl"
            >
              <div className="w-10 h-10 bg-[#E1F5EE] rounded-lg flex items-center justify-center shrink-0">
                <Icon className="w-5 h-5 text-[#0F6E56]" />
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-900 mb-0.5">{label}</p>
                <p className="text-xs text-gray-500 leading-relaxed">{sub}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Objection crusher ────────────────────────────────────────────────── */}
      <section className="bg-gray-50 border-y border-gray-100 py-16">
        <div className="max-w-4xl mx-auto px-6 grid grid-cols-1 md:grid-cols-2 gap-10">
          <div>
            <p className="text-sm font-bold text-gray-900 mb-3">
              &ldquo;What if it doesn&apos;t work for my firm?&rdquo;
            </p>
            <p className="text-sm text-gray-600 leading-relaxed">
              We back every Accountant subscription with a 30-day full refund — no
              questions, no conditions. If Tempo does not fit your workflow within the
              first month, we return every dollar. Reach us directly at{' '}
              <a
                href="mailto:hello@gettempo.ca"
                className="text-[#0F6E56] hover:underline underline-offset-2"
              >
                hello@gettempo.ca
              </a>
              .
            </p>
          </div>
          <div>
            <p className="text-sm font-bold text-gray-900 mb-3">
              &ldquo;Is my clients&apos; data safe?&rdquo;
            </p>
            <p className="text-sm text-gray-600 leading-relaxed">
              Bank connections run through Plaid — the same infrastructure used by
              major Canadian financial apps. All data is encrypted at rest and in
              transit. Client organizations are fully isolated. Tempo is built and
              operated in Canada, under Canadian privacy law.
            </p>
          </div>
        </div>
      </section>

      {/* ── Closing CTA ──────────────────────────────────────────────────────── */}
      <section className="bg-[#0F6E56] py-20">
        <div className="max-w-3xl mx-auto px-6 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4 leading-tight">
            Your clients are already losing money to bad bookkeeping.
          </h2>
          <p className="text-[#E1F5EE]/80 text-base mb-10">
            Every month without a clean ledger is a month of missed deductions, delayed
            filings, and avoidable penalties.
          </p>
          <a
            href={CHECKOUT_URL}
            className="inline-flex items-center gap-2 bg-white text-[#0F6E56] font-bold text-base px-8 py-4 rounded-xl hover:bg-[#f5f3ef] transition-colors shadow-lg"
          >
            Get Started →
          </a>
          <p className="text-white/50 text-xs mt-4">
            30-day money-back guarantee &middot; Canadian firm, Canadian compliance
          </p>
        </div>
      </section>
    </div>
  );
}
