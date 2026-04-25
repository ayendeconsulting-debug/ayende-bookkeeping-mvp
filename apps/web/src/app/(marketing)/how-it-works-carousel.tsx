'use client';

import { useState, useEffect } from 'react';
import { Zap, Sparkles, FileText, type LucideIcon } from 'lucide-react';

interface Step {
  step: string;
  title: string;
  desc: string;
  icon: LucideIcon;
}

const STEPS: Step[] = [
  {
    step: '01',
    title: 'Connect your bank',
    desc: 'Link your account via Plaid in under 2 minutes. Tempo imports your full transaction history automatically &mdash; no CSV uploads, no manual entry ever.',
    icon: Zap,
  },
  {
    step: '02',
    title: 'Transactions classify themselves',
    desc: 'AI classifies every transaction against your chart of accounts. HST/GST is split automatically. You review, adjust, and post &mdash; most months take under 10 minutes.',
    icon: Sparkles,
  },
  {
    step: '03',
    title: 'Reports are always ready',
    desc: 'Income Statement, Balance Sheet, and CRA remittance report update in real time as you post. Export PDF or CSV at any time &mdash; no scramble at filing.',
    icon: FileText,
  },
];

const CYCLE_MS = 5000;

export function HowItWorksCarousel() {
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (paused) return;
    const id = setTimeout(() => {
      setActive((prev) => (prev + 1) % STEPS.length);
    }, CYCLE_MS);
    return () => clearTimeout(id);
  }, [paused, active]);

  const current = STEPS[active];
  const Icon = current.icon;

  return (
    <div
      role="region"
      aria-roledescription="carousel"
      aria-label="How Tempo works"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
      className="rounded-2xl border border-border bg-card overflow-hidden"
    >
      {/* Tab strip */}
      <div className="grid grid-cols-3 border-b border-border">
        {STEPS.map((s, idx) => {
          const isActive = active === idx;
          return (
            <button
              key={s.step}
              role="tab"
              aria-selected={isActive}
              aria-label={`Step ${s.step}: ${s.title}`}
              onClick={() => setActive(idx)}
              className={[
                'flex items-center justify-center gap-2 px-3 py-3 text-xs sm:text-sm font-medium border-r border-border last:border-r-0 transition-colors',
                isActive
                  ? 'bg-[#EDF7F2] text-[#04342C]'
                  : 'bg-card text-muted-foreground hover:text-foreground',
              ].join(' ')}
            >
              <span
                className={[
                  'text-xs font-bold tabular-nums',
                  isActive ? 'text-[#0F6E56]' : 'text-muted-foreground/60',
                ].join(' ')}
              >
                {s.step}
              </span>
              <span className="truncate">{s.title}</span>
            </button>
          );
        })}
      </div>

      {/* Active panel */}
      <div
        role="tabpanel"
        className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-10 p-8 md:p-10 items-center min-h-[300px]"
      >
        <div>
          <div className="text-6xl md:text-7xl font-bold leading-none mb-5 text-[#9FE1CB] tabular-nums">
            {current.step}
          </div>
          <div className="inline-flex items-center gap-2 mb-3">
            <div className="w-9 h-9 rounded-xl bg-[#EDF7F2] flex items-center justify-center">
              <Icon className="w-5 h-5 text-[#0F6E56]" />
            </div>
            <span className="text-xs font-semibold text-[#0F6E56] uppercase tracking-wider">
              Step {current.step}
            </span>
          </div>
          <h3 className="text-xl md:text-2xl font-bold text-foreground mb-3 leading-tight">
            {current.title}
          </h3>
          <p
            className="text-sm md:text-base text-muted-foreground leading-relaxed"
            dangerouslySetInnerHTML={{ __html: current.desc }}
          />
        </div>
        <div>
          {active === 0 && <BankSyncVisual />}
          {active === 1 && <ClassifyVisual />}
          {active === 2 && <ReportVisual />}
        </div>
      </div>

      {/* Footer: dots + autoplay hint */}
      <div className="flex items-center justify-between gap-3 px-5 py-4 border-t border-border bg-muted/30">
        <div className="flex items-center gap-2" role="tablist" aria-label="Step indicators">
          {STEPS.map((s, idx) => {
            const isActive = active === idx;
            return (
              <button
                key={s.step}
                role="tab"
                aria-selected={isActive}
                aria-label={`Go to step ${s.step}`}
                onClick={() => setActive(idx)}
                className={[
                  'rounded-full transition-all',
                  isActive ? 'w-5 h-1.5 bg-[#0F6E56]' : 'w-1.5 h-1.5 bg-border hover:bg-muted-foreground',
                ].join(' ')}
              />
            );
          })}
        </div>
        <p className="text-xs text-muted-foreground">
          Auto-plays every 5s · pause on hover
        </p>
      </div>
    </div>
  );
}

// ── Step illustrations ────────────────────────────────────────────────────

function BankSyncVisual() {
  const accounts = [
    { initial: 'TD', name: 'TD Canada Trust', detail: 'Business Chequing · ···4821', balance: '$24,150', syncing: false },
    { initial: 'RB', name: 'RBC Royal Bank',  detail: 'Business Savings · ···3302',  balance: '$18,400', syncing: false },
    { initial: 'V',  name: 'Visa Business',   detail: 'Credit Card · ···7719',       balance: '-$3,280', syncing: true  },
  ];
  return (
    <div className="bg-background border border-border rounded-xl overflow-hidden">
      <div className="bg-muted/40 border-b border-border px-3 py-2.5 flex items-center gap-2">
        <span className="w-1.5 h-1.5 rounded-full bg-[#0F6E56]" />
        <p className="text-xs font-semibold text-foreground">Connected accounts</p>
      </div>
      <div className="divide-y divide-border">
        {accounts.map((acc) => (
          <div key={acc.name} className="flex items-center gap-3 p-3">
            <div className="w-8 h-8 rounded-md bg-muted flex items-center justify-center text-xs font-bold text-foreground flex-shrink-0">
              {acc.initial}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-foreground truncate">{acc.name}</p>
              <p className="text-xs text-muted-foreground truncate">{acc.detail}</p>
            </div>
            <div className="text-right flex-shrink-0">
              <p className="text-xs font-semibold text-foreground">{acc.balance}</p>
              <p className="text-xs flex items-center gap-1 justify-end">
                {acc.syncing ? (
                  <>
                    <span className="w-1.5 h-1.5 rounded-full bg-[#92400E] animate-pulse" />
                    <span className="text-[#92400E]">Syncing…</span>
                  </>
                ) : (
                  <>
                    <span className="w-1.5 h-1.5 rounded-full bg-[#0F6E56]" />
                    <span className="text-[#0F6E56]">Synced</span>
                  </>
                )}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ClassifyVisual() {
  const rows = [
    { date: 'Apr 6', desc: 'STRIPE PAYOUT',       cat: 'Revenue',  amt: '+$3,200', positive: true,  pending: false },
    { date: 'Apr 5', desc: 'AMAZON WEB SERVICES', cat: 'Software', amt: '-$184',   positive: false, pending: false },
    { date: 'Apr 5', desc: 'SHELL CANADA',        cat: 'Vehicle',  amt: '-$67',    positive: false, pending: false },
    { date: 'Apr 4', desc: 'UNCLEAR · review',    cat: 'Pending',  amt: '-$240',   positive: false, pending: true  },
  ];
  return (
    <div className="bg-background border border-border rounded-xl overflow-hidden">
      <div className="bg-muted/40 border-b border-border px-3 py-2.5 flex items-center gap-2">
        <span className="w-1.5 h-1.5 rounded-full bg-[#0F6E56]" />
        <p className="text-xs font-semibold text-foreground">Transactions · auto-classified</p>
      </div>
      <div>
        {rows.map((tx, i) => (
          <div
            key={i}
            className="flex items-center gap-2.5 px-3 py-2.5 border-b border-border last:border-b-0 text-xs"
          >
            <span className="w-10 flex-shrink-0 text-muted-foreground">{tx.date}</span>
            <span className="flex-1 truncate text-foreground">{tx.desc}</span>
            <span
              className={[
                'px-2 py-0.5 rounded-full text-xs font-medium flex-shrink-0',
                tx.pending
                  ? 'bg-[#FAEEDA] text-[#854F0B] animate-pulse'
                  : 'bg-[#E1F5EE] text-[#04342C]',
              ].join(' ')}
            >
              {tx.cat}
            </span>
            <span
              className={[
                'w-14 text-right font-semibold flex-shrink-0',
                tx.positive ? 'text-[#0F6E56]' : 'text-foreground',
              ].join(' ')}
            >
              {tx.amt}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function ReportVisual() {
  return (
    <div className="bg-background border border-border rounded-xl overflow-hidden">
      <div className="bg-muted/40 border-b border-border px-3 py-2.5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-[#0F6E56]" />
          <p className="text-xs font-semibold text-foreground">Income Statement · Q1 2026</p>
        </div>
        <div className="flex gap-1.5">
          <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">PDF</span>
          <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">CSV</span>
        </div>
      </div>
      <div className="p-4 space-y-1">
        <div className="flex justify-between py-1.5 border-b border-border">
          <span className="text-xs font-semibold text-foreground">REVENUE</span>
          <span className="text-xs font-semibold text-foreground">$48,320</span>
        </div>
        {[['  Consulting Revenue', '$38,000'], ['  Product Sales', '$7,200'], ['  Other Income', '$3,120']].map(
          ([k, v]) => (
            <div key={k} className="flex justify-between py-1">
              <span className="text-xs text-muted-foreground">{k}</span>
              <span className="text-xs text-foreground">{v}</span>
            </div>
          ),
        )}
        <div className="flex justify-between py-1.5 border-t border-b border-border mt-1">
          <span className="text-xs font-semibold text-foreground">EXPENSES</span>
          <span className="text-xs font-semibold text-foreground">($31,840)</span>
        </div>
        {[['  Salaries', '($18,000)'], ['  Software & Tools', '($4,200)'], ['  Office & Admin', '($9,640)']].map(
          ([k, v]) => (
            <div key={k} className="flex justify-between py-1">
              <span className="text-xs text-muted-foreground">{k}</span>
              <span className="text-xs text-foreground">{v}</span>
            </div>
          ),
        )}
        <div className="flex justify-between py-2 border-t-2 border-[#0F6E56] mt-1">
          <span className="text-xs font-bold text-foreground">NET INCOME</span>
          <span className="text-xs font-bold text-[#0F6E56]">$16,480</span>
        </div>
      </div>
    </div>
  );
}
