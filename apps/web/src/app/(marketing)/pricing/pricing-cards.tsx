'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@clerk/nextjs';
import { CheckCircle2, ArrowRight, Zap, Sparkles, Loader2 } from 'lucide-react';
import { createCheckoutSession } from './checkout-actions';

const REGULAR_PRICES = { starter: 19, pro: 49, accountant: 99 };

const PLANS = [
  {
    name: 'Starter',
    key: 'starter' as const,
    description: 'For freelancers and solo founders',
    monthly: 10,
    annual: 100,
    annualPerMonth: 8.33,
    limit: 'Up to 500 transactions/mo',
    highlight: false,
    features: [
      'Up to 500 transactions/month',
      '4 financial reports (IS, BS, TB, GL)',
      'Bank connectivity via Plaid',
      'CSV & PDF statement import',
      'HST, GST & sales tax support',
      'AI bookkeeping assistant',
      'Chart of accounts',
      'Email support',
    ],
  },
  {
    name: 'Pro',
    key: 'pro' as const,
    description: 'For growing small businesses',
    monthly: 25,
    annual: 250,
    annualPerMonth: 20.83,
    limit: 'Up to 2,500 transactions/mo',
    highlight: true,
    features: [
      'Up to 2,500 transactions/month',
      'Everything in Starter',
      'Multi-user access',
      'Owner contributions & draws',
      'Invoicing & AP/AR tracking',
      'AI bookkeeping assistant',
      'Recurring transaction detection',
      'Priority support',
    ],
  },
  {
    name: 'Accountant',
    key: 'accountant' as const,
    description: 'For accounting firms & multi-client',
    monthly: 50,
    annual: 500,
    annualPerMonth: 41.67,
    limit: 'Unlimited transactions',
    highlight: false,
    features: [
      'Unlimited transactions',
      'Everything in Pro',
      'Multiple businesses',
      'Accountant role access',
      'Mileage tracker',
      'Document storage',
      'AI bookkeeping assistant',
      'Dedicated support',
    ],
  },
];

const COMPARISON_ROWS = [
  { label: 'Transactions/month',           starter: '500',   pro: '2,500',   accountant: 'Unlimited' },
  { label: 'Financial reports',            starter: '✓',     pro: '✓',       accountant: '✓'         },
  { label: 'Bank connectivity (Plaid)',     starter: '✓',     pro: '✓',       accountant: '✓'         },
  { label: 'CSV & PDF import',             starter: '✓',     pro: '✓',       accountant: '✓'         },
  { label: 'Tax code engine (HST/GST/US)', starter: '✓',     pro: '✓',       accountant: '✓'         },
  { label: 'AI bookkeeping assistant',     starter: '✓',     pro: '✓',       accountant: '✓'         },
  { label: 'Multi-user access',            starter: '—',     pro: '✓',       accountant: '✓'         },
  { label: 'Owner draws & contributions',  starter: '—',     pro: '✓',       accountant: '✓'         },
  { label: 'Invoicing & AP/AR',            starter: '—',     pro: '✓',       accountant: '✓'         },
  { label: 'Multiple businesses',          starter: '—',     pro: '—',       accountant: '✓'         },
  { label: 'Accountant role',              starter: '—',     pro: '—',       accountant: '✓'         },
  { label: 'Dedicated support',            starter: '—',     pro: '—',       accountant: '✓'         },
];

export function PricingCards() {
  const [annual, setAnnual]         = useState(false);
  const [loading, setLoading]       = useState<string | null>(null);
  const [errorMsg, setErrorMsg]     = useState<string | null>(null);
  const { isSignedIn }              = useAuth();
  const router                      = useRouter();

  async function handleCta(planKey: string) {
    setErrorMsg(null);

    // Not signed in → go to sign-up
    if (!isSignedIn) {
      router.push('/sign-up');
      return;
    }

    setLoading(planKey);
    try {
      const result = await createCheckoutSession(planKey, annual ? 'annual' : 'monthly');
      if (result.error) {
        setErrorMsg(result.error);
        return;
      }
      if (result.url) {
        window.location.href = result.url;
      }
    } finally {
      setLoading(null);
    }
  }

  return (
    <div>

      {/* ── Launch discount banner ─────────────────────────────────── */}
      <div className="flex items-center justify-center gap-2 bg-red-600 text-white text-sm font-medium px-5 py-3 rounded-xl mb-8">
        <Zap className="w-4 h-4 flex-shrink-0" />
        <span>Launch sale: <strong>50% off all plans</strong> — limited time only. Original prices shown struck through.</span>
      </div>

      {/* ── Billing period selector ───────────────────────────────── */}
      <div className="flex items-center justify-center mb-10">
        <div className="inline-flex items-center bg-muted rounded-xl p-1 gap-1">
          <button
            onClick={() => setAnnual(false)}
            className={[
              'px-5 py-2 rounded-lg text-sm font-semibold transition-all',
              !annual ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground',
            ].join(' ')}
          >
            Monthly
          </button>
          <button
            onClick={() => setAnnual(true)}
            className={[
              'px-5 py-2 rounded-lg text-sm font-semibold transition-all flex items-center gap-2',
              annual ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground',
            ].join(' ')}
          >
            Annual
            <span className="bg-[#EDF7F2] text-[#0F6E56] text-xs font-semibold px-2 py-0.5 rounded-full">
              2 months free
            </span>
          </button>
        </div>
      </div>

      {/* Error message */}
      {errorMsg && (
        <div className="mb-6 text-center text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-xl px-4 py-3">
          {errorMsg}
        </div>
      )}

      {/* ── Plan cards ───────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        {PLANS.map((plan) => {
          const regularMonthly = REGULAR_PRICES[plan.key];
          const regularAnnual  = regularMonthly * 12;
          const isLoading      = loading === plan.key;

          return (
            <div
              key={plan.key}
              className={[
                'rounded-2xl p-7 flex flex-col border-2 relative transition-all',
                plan.highlight
                  ? 'border-[#0F6E56] bg-[#EDF7F2] dark:bg-primary/10 shadow-xl'
                  : 'border-border bg-card hover:border-[#0F6E56]/40 hover:shadow-md',
              ].join(' ')}
            >
              {plan.highlight && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                  <span className="bg-[#0F6E56] text-white text-xs font-semibold px-4 py-1.5 rounded-full shadow-sm">
                    Most Popular
                  </span>
                </div>
              )}

              {/* Plan header */}
              <div className="mb-5">
                <p className="text-base font-bold text-foreground mb-1">{plan.name}</p>
                <p className="text-xs text-muted-foreground mb-4">{plan.description}</p>

                {annual ? (
                  <>
                    <div className="flex items-baseline gap-1 mb-1">
                      <span className="text-4xl font-bold text-foreground">${plan.annual}</span>
                      <span className="text-sm text-muted-foreground"> CAD/yr</span>
                    </div>
                    <p className="text-sm text-[#0F6E56] font-medium">
                      ${plan.annualPerMonth.toFixed(2)}/mo · 2 months free
                    </p>
                    <p className="text-xs text-muted-foreground mt-1 line-through">
                      Normally ${regularAnnual} CAD/yr
                    </p>
                    <p className="text-xs font-medium text-red-600 mt-0.5">
                      You save ${(regularAnnual - plan.annual).toFixed(0)} CAD/yr
                    </p>
                  </>
                ) : (
                  <>
                    <div className="flex items-baseline gap-1 mb-1">
                      <span className="text-4xl font-bold text-foreground">${plan.monthly}</span>
                      <span className="text-sm text-muted-foreground"> CAD/mo</span>
                    </div>
                    <p className="text-xs text-muted-foreground line-through">
                      Normally ${regularMonthly} CAD/mo
                    </p>
                    <p className="text-xs font-medium text-red-600 mt-0.5">
                      50% launch discount applied
                    </p>
                  </>
                )}

                <p className="text-xs text-muted-foreground mt-2 pt-2 border-t border-border/50">
                  {plan.limit}
                </p>
              </div>

              {/* Features */}
              <ul className="space-y-2.5 mb-7 flex-1">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2.5 text-sm text-foreground">
                    <CheckCircle2 className="w-4 h-4 text-[#0F6E56] flex-shrink-0 mt-0.5" />
                    {f}
                  </li>
                ))}
              </ul>

              {/* CTA */}
              <button
                onClick={() => handleCta(plan.key)}
                disabled={loading !== null}
                className={[
                  'inline-flex items-center justify-center gap-2 text-sm font-semibold px-4 py-3 rounded-xl transition-colors disabled:opacity-60 disabled:cursor-not-allowed',
                  plan.highlight
                    ? 'bg-[#0F6E56] text-white hover:bg-[#085041]'
                    : 'border-2 border-[#0F6E56] text-[#0F6E56] hover:bg-[#EDF7F2] dark:hover:bg-primary/10',
                ].join(' ')}
              >
                {isLoading
                  ? <><Loader2 className="w-4 h-4 animate-spin" />Setting up...</>
                  : <>Start free trial <ArrowRight className="w-4 h-4" /></>
                }
              </button>
            </div>
          );
        })}
      </div>

      {/* Trial note */}
      <div className="text-center space-y-1">
        <p className="text-sm text-muted-foreground">
          All plans include a <strong className="text-foreground">60-day free trial</strong>. Card required — no charge during trial.
        </p>
        <p className="text-xs text-muted-foreground">
          No action needed after trial — you will automatically continue on Starter. Cancel anytime.
        </p>
      </div>

      {/* ── AI value prop ─────────────────────────────────────────── */}
      <div className="mt-10 rounded-2xl border-2 border-[#0F6E56]/30 bg-[#EDF7F2] dark:bg-primary/10 p-6">
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-xl bg-[#0F6E56] flex items-center justify-center flex-shrink-0">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="text-sm font-bold text-foreground mb-1">
              AI bookkeeping assistant — included on every plan
            </p>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Ask anything about your books in plain English. Instant answers from your actual data, powered by Claude AI.
            </p>
          </div>
        </div>
      </div>

      {/* ── Comparison table ──────────────────────────────────────── */}
      <div className="mt-16">
        <h2 className="text-xl font-bold text-foreground text-center mb-8">Full feature comparison</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-3 pr-4 font-medium text-muted-foreground w-1/2">Feature</th>
                <th className="text-center py-3 px-4 font-semibold text-foreground">Starter</th>
                <th className="text-center py-3 px-4 font-semibold text-[#0F6E56]">Pro</th>
                <th className="text-center py-3 px-4 font-semibold text-foreground">Accountant</th>
              </tr>
            </thead>
            <tbody>
              {COMPARISON_ROWS.map((row, i) => (
                <tr key={row.label} className={`border-b border-border/50 ${i % 2 === 0 ? 'bg-card/50' : ''}`}>
                  <td className="py-3 pr-4 text-muted-foreground">{row.label}</td>
                  <td className="py-3 px-4 text-center">
                    {row.starter === '✓' ? <CheckCircle2 className="w-4 h-4 text-[#0F6E56] mx-auto" /> : row.starter === '—' ? <span className="text-border">—</span> : row.starter}
                  </td>
                  <td className="py-3 px-4 text-center">
                    {row.pro === '✓' ? <CheckCircle2 className="w-4 h-4 text-[#0F6E56] mx-auto" /> : row.pro === '—' ? <span className="text-border">—</span> : <span className="font-medium text-foreground">{row.pro}</span>}
                  </td>
                  <td className="py-3 px-4 text-center">
                    {row.accountant === '✓' ? <CheckCircle2 className="w-4 h-4 text-[#0F6E56] mx-auto" /> : row.accountant === '—' ? <span className="text-border">—</span> : row.accountant}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
