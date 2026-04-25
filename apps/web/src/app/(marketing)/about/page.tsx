import { Metadata } from 'next';
import Link from 'next/link';
import { CheckCircle2, ArrowRight, Target, Shield, Zap, Users } from 'lucide-react';

export const metadata: Metadata = {
  title: 'About — Tempo Bookkeeping',
  description: 'Learn about Tempo Bookkeeping — built for Canadian and US small businesses who deserve real accounting without the complexity.',
};

const VALUES = [
  {
    icon: Target,
    title: 'Built for small business',
    description: 'Every feature in Tempo exists to solve a real problem faced by North American small business owners — not enterprise firms with dedicated finance teams.',
  },
  {
    icon: Shield,
    title: 'Accounting correctness first',
    description: 'Tempo is built on proper double-entry accounting. Every transaction creates balanced journal entries. Your books are always correct — no shortcuts.',
  },
  {
    icon: Zap,
    title: 'Automation without complexity',
    description: 'Bank sync, auto-classification, and AI reporting should just work. We handle the technical complexity so you can focus on running your business.',
  },
  {
    icon: Users,
    title: 'Built for Canada and the US',
    description: 'HST, GST, and sales tax. CRA and IRS reporting. CAD and USD. We are purpose-built for the North American market from day one.',
  },
];

const COMMITMENTS = [
  {
    timeline: 'Day 1',
    title: 'Your first bank connection',
    desc: 'Connect your bank, import your transaction history, and see your first classified entries &mdash; all within your first session. No setup fees, no consultant required.',
  },
  {
    timeline: 'Week 1',
    title: 'Your books are running',
    desc: 'Chart of accounts configured, HST/GST tracked on every transaction, first batch posted. Your Income Statement is live. Your accountant will notice the difference.',
  },
  {
    timeline: 'Month 1',
    title: 'Never manually reconcile again',
    desc: 'Auto-classification rules are learning your patterns. Every subsequent month closes in minutes. Tax season stops being a crisis.',
  },
];

export default function AboutPage() {
  return (
    <div className="max-w-4xl mx-auto px-6 py-16">

      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className="text-center mb-16">
        <div className="inline-flex items-center gap-2 bg-[#EDF7F2] dark:bg-primary/10 border border-[#C3E8D8] dark:border-primary/30 text-[#0F6E56] text-xs font-medium px-4 py-1.5 rounded-full mb-5">
          Our story
        </div>
        <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-6 leading-tight">
          Bookkeeping built for the way{' '}
          <span className="text-[#0F6E56]">you actually work</span>
        </h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
          Tempo was built out of frustration. Small business owners in Canada and the US deserve proper bookkeeping software — not watered-down tools, not enterprise platforms built for Fortune 500 companies.
        </p>
      </div>

      {/* ── Mission ─────────────────────────────────────────────────────── */}
      <div className="bg-card border border-border rounded-2xl p-8 mb-16">
        <p className="text-xs font-semibold text-[#0F6E56] uppercase tracking-wider mb-3">Our mission</p>
        <p className="text-2xl font-bold text-foreground leading-snug">
          Make tax-ready, double-entry bookkeeping accessible to every small business in North America.
        </p>
      </div>

      {/* ── Story ───────────────────────────────────────────────────────── */}
      <div className="prose prose-sm max-w-none mb-16 space-y-5">
        <h2 className="text-2xl font-bold text-foreground">Why we built Tempo</h2>
        <p className="text-muted-foreground leading-relaxed">
          Most bookkeeping software falls into one of two traps: it is either too simple to produce accurate financial reports, or too complex to use without a dedicated accounting team. Small business owners end up stuck in spreadsheets, or paying for enterprise software they barely use.
        </p>
        <p className="text-muted-foreground leading-relaxed">
          Tempo is different. We built it on proper double-entry accounting principles — the same foundation used by every credible accounting system in the world. Every transaction you import creates a balanced journal entry. Every report is generated from those journal entries. Your Income Statement, Balance Sheet, and Trial Balance are always correct and always in sync.
        </p>
        <p className="text-muted-foreground leading-relaxed">
          We also knew that manual data entry was the biggest reason people abandoned bookkeeping tools. So we built Plaid bank connectivity from day one — connect your bank, and your transactions appear automatically. Our AI assistant means you can get ad hoc financial insights without waiting for your accountant.
        </p>
        <p className="text-muted-foreground leading-relaxed">
          Tempo is built specifically for Canadian and US small businesses. HST, GST, and sales tax are first-class features. CRA and IRS reporting requirements are baked in. We support CAD and USD from the start, with connections to over 12,000 financial institutions across both countries.
        </p>
      </div>

      {/* ── Values ──────────────────────────────────────────────────────── */}
      <div className="mb-16">
        <h2 className="text-2xl font-bold text-foreground mb-8">What we stand for</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {VALUES.map((value) => {
            const Icon = value.icon;
            return (
              <div key={value.title} className="bg-card border border-border rounded-2xl p-6">
                <div className="w-9 h-9 rounded-lg bg-[#EDF7F2] dark:bg-primary/10 flex items-center justify-center mb-4">
                  <Icon className="w-4 h-4 text-[#0F6E56]" />
                </div>
                <h3 className="text-base font-semibold text-foreground mb-2">{value.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{value.description}</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── What's included ─────────────────────────────────────────────── */}
      <div className="bg-[#EDF7F2] dark:bg-primary/10 border border-[#C3E8D8] dark:border-primary/30 rounded-2xl p-8 mb-16">
        <h2 className="text-xl font-bold text-foreground mb-6">What you get with Tempo</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {[
            'Double-entry accounting engine',
            'Automatic bank transaction sync',
            'AI bookkeeping assistant (Claude AI)',
            'Income Statement, Balance Sheet, Trial Balance, General Ledger',
            'HST, GST & US sales tax support',
            'Owner contributions & draws tracking',
            'Invoicing & AP/AR management',
            'Multi-user access with role-based permissions',
            'CSV & PDF bank statement import',
            'Fiscal year locking & audit trail',
            'CRA & IRS compatible reports',
            'PDF & CSV export on all reports',
          ].map((item) => (
            <div key={item} className="flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-[#0F6E56] flex-shrink-0 mt-0.5" />
              <span className="text-sm text-foreground">{item}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Early Access (relocated from landing per FR-B20) ────────────── */}
      <div className="mb-16">
        <div className="text-center mb-12">
          <p className="text-xs font-semibold text-[#0F6E56] uppercase tracking-wider mb-3">
            Early Access
          </p>
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            No fake reviews. Just an honest trial to see for yourself.
          </h2>
          <p className="text-muted-foreground max-w-xl mx-auto">
            Tempo Books is in early access. We&apos;re not going to show you testimonials we wrote
            ourselves. Instead, here&apos;s exactly what you can expect in your first weeks.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {COMMITMENTS.map((c, idx) => (
            <div
              key={idx}
              className="rounded-2xl border border-border bg-card p-7 flex flex-col"
            >
              <div className="inline-flex items-center gap-2 bg-[#EDF7F2] text-[#0F6E56] text-xs font-semibold px-3 py-1 rounded-full mb-4 self-start border border-[#C3E8D8]">
                {c.timeline}
              </div>
              <h3 className="text-base font-semibold text-foreground mb-2">{c.title}</h3>
              <p
                className="text-sm text-muted-foreground leading-relaxed flex-1"
                dangerouslySetInnerHTML={{ __html: c.desc }}
              />
            </div>
          ))}
        </div>

        <div className="mt-10 rounded-2xl bg-[#EDF7F2] border border-[#C3E8D8] p-7 flex flex-col md:flex-row items-center gap-6">
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-foreground mb-2">
              Be among our first users &mdash; your feedback shapes the product.
            </h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Early access members get direct access to the founding team, priority feature
              requests, and launch pricing locked in permanently.
            </p>
          </div>
          <Link
            href="/sign-up"
            className="inline-flex items-center gap-2 bg-[#0F6E56] text-white px-6 py-3 rounded-xl font-semibold text-sm hover:bg-[#085041] transition-colors flex-shrink-0"
          >
            Join early access <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>

      {/* ── CTA ─────────────────────────────────────────────────────────── */}
      <div className="text-center bg-[#0F6E56] rounded-2xl p-10">
        <h2 className="text-2xl font-bold text-white mb-3">
          Ready to get your books in order?
        </h2>
        <p className="text-[#C3E8D8] mb-7 max-w-md mx-auto">
          Start your free trial today. 14 days free on Starter and Pro — no credit card required.
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

    </div>
  );
}
