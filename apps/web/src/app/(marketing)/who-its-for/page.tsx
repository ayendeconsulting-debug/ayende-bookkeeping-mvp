import { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight, CheckCircle2 } from 'lucide-react';
import { PersonaRail } from './persona-rail';
import { ComparisonTable } from './comparison-table';

export const metadata: Metadata = {
  title: "Who it's for \u2014 Tempo Bookkeeping",
  description:
    'One product. Built for how you actually work \u2014 whether you run a business, freelance, manage personal finances, or handle client books.',
};

const SEGMENT_DETAILS = [
  {
    id: 'business',
    emoji: '\uD83C\uDFE2',
    title: 'For Business Owners',
    tagline: 'Tax-ready books. Every single month.',
    pain: 'Most small business owners spend the last two weeks of March in a panic &mdash; hunting receipts, untangling transactions, and paying their accountant to fix what should have been right all year.',
    bullets: [
      'Bank sync imports and classifies transactions automatically &mdash; no manual entry',
      'HST/GST is split and posted to the correct liability account on every transaction',
      'CRA remittance report (GST34 lines 101&ndash;113) is always one click away',
      'Income Statement and Balance Sheet update in real time as you post',
      'AI anomaly detection flags unusual charges before they become problems',
      'Fiscal year locking prevents retroactive changes once you file',
    ],
    cta: 'Start your free trial',
    ctaHref: '/sign-up',
  },
  {
    id: 'freelancer',
    emoji: '\uD83D\uDCBC',
    title: 'For Freelancers, Uber Drivers & Sole Proprietors',
    tagline: 'Bookkeeping that takes 10 minutes a month.',
    pain: "You didn't start driving (or freelancing) to spend your weekends categorizing expenses. Tempo Books handles the accounting so you can focus on the work that actually pays.",
    bullets: [
      'Connect your bank and let Tempo classify every transaction automatically',
      'Split personal and business expenses on the same account &mdash; no separate bank required',
      'Mileage tracking &mdash; log every km automatically when you connect your bank',
      'HST/GST tracked per transaction, remittance report ready when you need it',
      'Income Statement shows exactly what you earned and what it cost you',
      'AI Transaction Explainer breaks down any charge in plain English',
      '$25/mo on Pro &mdash; less than two billable hours',
    ],
    cta: 'Start your free trial',
    ctaHref: '/sign-up',
  },
  {
    id: 'personal',
    emoji: '\uD83C\uDFE0',
    title: 'For Personal Finance',
    tagline: 'Finally know where every dollar went.',
    pain: 'Budgeting apps give you charts. Tempo gives you the full picture &mdash; every dollar in, every dollar out, your real net worth, and where you can adjust. Built for people who want to actually understand their money.',
    bullets: [
      'Connect your personal accounts and import all transactions automatically',
      'Budget tracking &mdash; see where your hard-earned income goes each month',
      'Savings goal tracking to keep you on plan',
      'Net worth visibility across your assets and accounts',
      'Lifestyle adjustment insights &mdash; spot what is worth keeping and what is worth cutting',
      'Mobile app access so you can check in anywhere',
      'Included on the Personal plan &mdash; $10/mo',
    ],
    cta: 'Start free &mdash; see your full financial picture in minutes',
    ctaHref: '/sign-up',
  },
  {
    id: 'accountants',
    emoji: '\uD83D\uDCCA',
    title: 'For Accountants & Bookkeeping Firms',
    tagline: 'Your client portal. Your brand. Your workflow.',
    pain: "Switching between client logins, chasing down bank statements, and explaining the same transaction twice &mdash; that's time your firm can't bill for. Tempo Books' Accountant Portal was built to eliminate all of it.",
    bullets: [
      'Single dashboard for all client businesses &mdash; KPI cards, status, balance at a glance',
      'White-label subdomain: yourfirm.gettempo.ca &mdash; client-facing with your branding',
      'Request edit access with one click &mdash; full dual audit log of every change',
      'AI anomaly detection runs across all client books simultaneously',
      'Onboard a new client in under 5 minutes &mdash; invite by email, they connect their bank',
      'Metered billing: $149/mo base includes 5 clients, +$15/mo per additional',
    ],
    cta: 'See Accountant pricing',
    ctaHref: '/pricing',
  },
];

const SEGMENT_IMAGES: Record<string, string> = {
  business:    'https://images.unsplash.com/photo-1758874384232-cfa79a5babf1?q=80&w=1332&auto=format&fit=crop',
  freelancer:  'https://images.unsplash.com/photo-1755156137044-5d33290a94ca?q=80&w=688&auto=format&fit=crop',
  personal:    'https://images.unsplash.com/photo-1758876202040-cae084bafdb6?q=80&w=1332&auto=format&fit=crop',
  accountants: 'https://images.unsplash.com/photo-1606836576983-8b458e75221d?q=80&w=1170&auto=format&fit=crop',
};

type ComparisonValue = boolean | string;
const COMPARISON_ROWS: { feature: string; tempo: ComparisonValue; qbo: ComparisonValue; wave: ComparisonValue }[] = [
  { feature: 'Starting price',          tempo: 'From $10 CAD/mo',   qbo: 'From $35 CAD/mo',   wave: 'Free (fees apply)' },
  { feature: 'Built for Canadian tax',  tempo: 'Native HST/GST',    qbo: 'Requires setup',     wave: 'Basic only' },
  { feature: 'CRA remittance report',   tempo: true,                qbo: false,                wave: false },
  { feature: 'AI classification',       tempo: 'Every plan',        qbo: 'Paid add-on',        wave: false },
  { feature: 'Accountant portal',       tempo: true,                qbo: 'Limited',            wave: false },
  { feature: '6-year receipt storage',  tempo: 'Pro & Accountant',  qbo: 'Premium only',       wave: false },
  { feature: 'Double-entry accounting', tempo: true,                qbo: true,                 wave: true },
];

export default function WhoItsForPage() {
  return (
    <div>
      {/* Hero */}
      <section className="max-w-4xl mx-auto px-6 pt-20 pb-12 text-center">
        <p className="text-xs font-semibold text-[#0F6E56] uppercase tracking-wider mb-4">Who it&apos;s for</p>
        <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-5 leading-tight">
          One product. <span className="text-[#0F6E56]">Built for how you actually work.</span>
        </h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
          Pick your role and we&apos;ll show you Tempo through your eyes.
        </p>
      </section>

      {/* Sticky persona rail */}
      <PersonaRail />

      {/* Persona deep-dive sections */}
      <div className="max-w-6xl mx-auto px-6 pt-8 space-y-8 pb-16">
        {SEGMENT_DETAILS.map((seg) => (
          <section
            id={seg.id}
            key={seg.id}
            className="relative rounded-2xl border border-border overflow-hidden scroll-mt-32"
          >
            {SEGMENT_IMAGES[seg.id] && (
              <Image
                src={SEGMENT_IMAGES[seg.id]}
                alt=""
                fill
                className="object-cover object-center"
                aria-hidden="true"
              />
            )}
            <div className="absolute inset-0 bg-gradient-to-r from-background/95 via-background/88 to-background/60 pointer-events-none" />

            <div className="relative p-8 md:p-10">
              <div className="flex items-center gap-3 mb-2">
                <span className="text-3xl">{seg.emoji}</span>
                <h2 className="text-2xl md:text-3xl font-bold text-foreground">{seg.title}</h2>
              </div>
              <p
                className="text-[#0F6E56] font-semibold text-lg mb-4"
                dangerouslySetInnerHTML={{ __html: seg.tagline }}
              />
              <p
                className="text-muted-foreground leading-relaxed mb-6 max-w-2xl italic"
                dangerouslySetInnerHTML={{ __html: seg.pain }}
              />
              <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-8">
                {seg.bullets.map((b, idx) => (
                  <li key={idx} className="flex items-start gap-2 text-sm">
                    <CheckCircle2 className="w-4 h-4 text-[#0F6E56] flex-shrink-0 mt-0.5" />
                    <span
                      className="text-muted-foreground"
                      dangerouslySetInnerHTML={{ __html: b }}
                    />
                  </li>
                ))}
              </ul>
              <Link
                href={seg.ctaHref}
                className="inline-flex items-center gap-2 bg-[#0F6E56] text-white px-5 py-2.5 rounded-xl font-semibold text-sm hover:bg-[#085041] transition-colors"
              >
                <span dangerouslySetInnerHTML={{ __html: seg.cta }} /> <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </section>
        ))}
      </div>

      {/* Bridge */}
      <section className="bg-card border-y border-border">
        <div className="max-w-4xl mx-auto px-6 py-12 text-center">
          <h2 className="text-2xl md:text-3xl font-bold text-foreground">
            Whoever you are, here&apos;s how we compare.
          </h2>
        </div>
      </section>

      {/* Comparison */}
      <section className="max-w-6xl mx-auto px-6 py-16">
        <ComparisonTable rows={COMPARISON_ROWS} />
        <p className="text-center text-xs text-muted-foreground mt-6">
          Pricing and features current as of April 2026. Competitor details sourced from public pricing pages.
        </p>
      </section>

      {/* Closing CTA */}
      <section className="bg-[#0F6E56]">
        <div className="max-w-4xl mx-auto px-6 py-16 text-center">
          <h2 className="text-3xl font-bold text-white mb-4">
            Whichever describes you &mdash; start free.
          </h2>
          <p className="text-[#C3E8D8] mb-7 max-w-md mx-auto">
            14 days free on Personal and Pro. 30-day money-back guarantee on Accountant Monthly.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              href="/sign-up"
              className="inline-flex items-center gap-2 bg-white text-[#0F6E56] px-6 py-3 rounded-xl font-semibold text-sm hover:bg-[#EDF7F2] transition-colors"
            >
              Start your free trial <ArrowRight className="w-4 h-4" />
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
    </div>
  );
}
