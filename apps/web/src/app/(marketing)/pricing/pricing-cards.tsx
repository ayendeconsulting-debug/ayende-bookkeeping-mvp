'use client';

import { useState, useRef, Fragment, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@clerk/nextjs';
import { CheckCircle2, ArrowRight, Zap, Sparkles, Loader2, Calculator, ShieldCheck, ShieldAlert, ChevronDown } from 'lucide-react';
import { createCheckoutSession } from './checkout-actions';

type CardPlan = {
  name: string;
  key: 'starter' | 'pro';
  description: string;
  monthly: number;
  annual: number;
  annualPerMonth: number;
  regularMonthly: number;
  limit?: string;
  highlight: boolean;
  inheritsFrom: string | null;
  features: string[];
};

const PERSONAL_AND_PRO: CardPlan[] = [
  {
    name: 'Personal',
    key: 'starter',
    description: 'For individuals managing personal finances',
    monthly: 10,
    annual: 100,
    annualPerMonth: 8.33,
    regularMonthly: 19,
    highlight: false,
    inheritsFrom: null,
    features: [
      'Budget tracking',
      'Savings goal tracking',
      'Net worth visibility',
      'Lifestyle insights',
      'Bank connectivity (Plaid)',
      'CSV import',
      'Mobile app access',
      'Email support',
    ],
  },
  {
    name: 'Pro',
    key: 'pro',
    description: 'Built for Uber drivers, freelancers & small businesses',
    monthly: 25,
    annual: 250,
    annualPerMonth: 20.83,
    regularMonthly: 49,
    limit: 'Up to 2,500 transactions/mo',
    highlight: true,
    inheritsFrom: 'Personal',
    features: [
      'Double-entry engine',
      'HST/GST tax engine',
      'Mileage tracking',
      'AI bookkeeping assistant',
      'Owner contributions & draws',
      'Invoicing & AP/AR',
      'Multi-user access',
    ],
  },
];

type CompCell = '\u2713' | '\u2014' | string;
type CompRow = { label: string; starter: CompCell; pro: CompCell; accountant: CompCell };
type CompSection = { title: string; rows: CompRow[] };

const COMPARISON_SECTIONS: CompSection[] = [
  {
    title: 'Personal Finance',
    rows: [
      { label: 'Budget tracking',               starter: '\u2713', pro: '\u2713', accountant: '\u2014' },
      { label: 'Savings goal tracking',         starter: '\u2713', pro: '\u2713', accountant: '\u2014' },
      { label: 'Net worth visibility',          starter: '\u2713', pro: '\u2713', accountant: '\u2014' },
      { label: 'Lifestyle adjustment insights', starter: '\u2713', pro: '\u2713', accountant: '\u2014' },
    ],
  },
  {
    title: 'Bank & Document Import',
    rows: [
      { label: 'Bank connectivity (Plaid)', starter: '\u2713', pro: '\u2713', accountant: '\u2713' },
      { label: 'CSV import',               starter: '\u2713', pro: '\u2713', accountant: '\u2713' },
      { label: 'PDF statement import',     starter: '\u2014', pro: '\u2713', accountant: '\u2713' },
    ],
  },
  {
    title: 'Bookkeeping Core',
    rows: [
      { label: 'Financial reports (IS, BS, TB, GL)', starter: '\u2014', pro: '\u2713', accountant: '\u2713' },
      { label: 'Double-entry accounting engine',     starter: '\u2014', pro: '\u2713', accountant: '\u2713' },
      { label: 'Chart of accounts',                  starter: '\u2014', pro: '\u2713', accountant: '\u2713' },
      { label: 'Tax engine (HST / GST / US)',        starter: '\u2014', pro: '\u2713', accountant: '\u2713' },
      { label: 'AI bookkeeping assistant',           starter: '\u2014', pro: '\u2713', accountant: '\u2713' },
    ],
  },
  {
    title: 'Business Workflow',
    rows: [
      { label: 'Multi-user access',               starter: '\u2014', pro: '\u2713', accountant: '\u2713' },
      { label: 'Owner draws & contributions',     starter: '\u2014', pro: '\u2713', accountant: '\u2713' },
      { label: 'Invoicing & AP / AR',             starter: '\u2014', pro: '\u2713', accountant: '\u2713' },
      { label: 'Recurring transaction detection', starter: '\u2014', pro: '\u2713', accountant: '\u2713' },
    ],
  },
  {
    title: 'Firm Features',
    rows: [
      { label: 'Multiple client businesses', starter: '\u2014', pro: '\u2014', accountant: '\u2713' },
      { label: 'Accountant firm portal',     starter: '\u2014', pro: '\u2014', accountant: '\u2713' },
      { label: 'White-label subdomain',      starter: '\u2014', pro: '\u2014', accountant: '\u2713' },
      { label: 'Staff seat management',      starter: '\u2014', pro: '\u2014', accountant: '\u2713' },
      { label: 'Dedicated support',          starter: '\u2014', pro: '\u2014', accountant: '\u2713' },
    ],
  },
];

const ACCOUNTANT_LEAD_FEATURE = 'Tax-ready bookkeeping for every client';
const ACCOUNTANT_FEATURES = [
  'Accountant firm portal',
  'White-label subdomain (firmname.gettempo.ca)',
  'Staff seat management',
  'Metered billing \u2014 pay for what you use',
  'Dedicated support',
];

function AccountantCalculator({ onAiAddonChange, onAnnualChange, initialAnnual, onCheckout, isLoading, onTotalChange }: { onAiAddonChange?: (v: boolean) => void; onAnnualChange?: (v: boolean) => void; initialAnnual?: boolean; onCheckout?: () => void; isLoading?: boolean; onTotalChange?: (monthly: number, annual: number) => void }) {
  const [clients, setClients] = useState(5);
  const [seats, setSeats]     = useState(1);
  const [aiAddon, setAiAddon] = useState(false);
  const [annual, setAnnual]   = useState(initialAnnual ?? false);

  const BASE       = 149;
  const PER_CLIENT = 15;
  const PER_SEAT   = 25;
  const AI_ADDON   = 20;

  const billableClients = Math.max(0, clients - 5);
  const billableSeats   = Math.max(0, seats - 3);

  const monthlyTotal = BASE + billableClients * PER_CLIENT + billableSeats * PER_SEAT + (aiAddon ? AI_ADDON : 0);
  const annualTotal  = Math.round(monthlyTotal * 10);
  useEffect(() => { onTotalChange?.(monthlyTotal, annualTotal); }, [monthlyTotal, annualTotal, onTotalChange]);

  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <label className="text-xs font-medium text-foreground">Active clients</label>
          <span className="text-xs font-bold text-[#0F6E56]">{clients}</span>
        </div>
        <input type="range" min={1} max={40} value={clients}
          onChange={(e) => setClients(Number(e.target.value))}
          className="w-full accent-[#0F6E56]" />
        <p className="text-xs text-muted-foreground">
          First 5 included &#x00b7; {billableClients > 0 ? billableClients + ' \u00d7 $' + PER_CLIENT + ' = $' + (billableClients * PER_CLIENT) : 'No extra charge'}
        </p>
      </div>
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <label className="text-xs font-medium text-foreground">Staff seats</label>
          <span className="text-xs font-bold text-[#0F6E56]">{seats}</span>
        </div>
        <input type="range" min={1} max={15} value={seats}
          onChange={(e) => setSeats(Number(e.target.value))}
          className="w-full accent-[#0F6E56]" />
        <p className="text-xs text-muted-foreground">
          First 3 included &#x00b7; {billableSeats > 0 ? billableSeats + ' \u00d7 $' + PER_SEAT + ' = $' + (billableSeats * PER_SEAT) : 'No extra charge'}
        </p>
      </div>
      <div className="flex items-center justify-between py-2 border-t border-[#0F6E56]/20">
        <div>
          <p className="text-xs font-medium text-foreground">AI add-on &#x2014; unlimited AI calls</p>
          <p className="text-xs text-muted-foreground">Without add-on: 500 AI calls/month firm-wide</p>
        </div>
        <button type="button" onClick={() => { setAiAddon(!aiAddon); onAiAddonChange?.(!aiAddon); }}
          className={'relative inline-flex h-5 w-9 items-center rounded-full transition-colors ' + (aiAddon ? 'bg-[#0F6E56]' : 'bg-gray-300 dark:bg-gray-600')}>
          <span className={'inline-block h-3.5 w-3.5 rounded-full bg-white shadow transition-transform ' + (aiAddon ? 'translate-x-4' : 'translate-x-0.5')} />
        </button>
      </div>
      <div className="flex items-center justify-between py-2 border-t border-[#0F6E56]/20">
        <p className="text-xs font-medium text-foreground">Annual billing (2 months free)</p>
        <button type="button" onClick={() => { setAnnual(!annual); onAnnualChange?.(!annual); }}
          className={'relative inline-flex h-5 w-9 items-center rounded-full transition-colors ' + (annual ? 'bg-[#0F6E56]' : 'bg-gray-300 dark:bg-gray-600')}>
          <span className={'inline-block h-3.5 w-3.5 rounded-full bg-white shadow transition-transform ' + (annual ? 'translate-x-4' : 'translate-x-0.5')} />
        </button>
      </div>
      <div className="rounded-lg bg-white dark:bg-card border border-[#0F6E56]/20 px-4 py-3 flex items-center justify-between">
        <span className="text-sm font-semibold text-foreground">
          {annual ? 'Annual total' : 'Monthly total'}
        </span>
        <div className="text-right">
          <span className="text-2xl font-bold text-[#0F6E56]">
            ${annual ? annualTotal.toLocaleString() : monthlyTotal.toLocaleString()}
          </span>
          <span className="text-xs text-muted-foreground ml-1">CAD/{annual ? 'yr' : 'mo'}</span>
          {annual && (
            <p className="text-xs text-[#0F6E56] font-medium mt-0.5">
              You save ${(monthlyTotal * 2).toLocaleString()} vs monthly
            </p>
          )}
        </div>
      </div>
      <button type="button" onClick={onCheckout} disabled={isLoading}
        className="inline-flex items-center justify-center gap-2 w-full text-sm font-semibold px-4 py-3 rounded-xl bg-[#0F6E56] text-white hover:bg-[#085041] transition-colors disabled:opacity-60 disabled:cursor-not-allowed mt-2">
        {isLoading
          ? <><Loader2 className="w-4 h-4 animate-spin" />Setting up...</>
          : <>Subscribe {annual ? annualTotal.toLocaleString() + ' CAD/yr' : monthlyTotal.toLocaleString() + ' CAD/mo'} <ArrowRight className="w-4 h-4" /></>}
      </button>
    </div>
  );
}

function CompCellRender({ value, isPro }: { value: CompCell; isPro?: boolean }) {
  if (value === '\u2713') return <CheckCircle2 className="w-4 h-4 text-[#0F6E56] mx-auto" />;
  if (value === '\u2014') return <span className="text-border">&#x2014;</span>;
  return isPro ? <span className="font-medium text-foreground">{value}</span> : <>{value}</>;
}

export function PricingCards() {
  const [annual, setAnnual]                       = useState(false);
  const [loading, setLoading]                     = useState<string | null>(null);
  const [errorMsg, setErrorMsg]                   = useState<string | null>(null);
  const [showAnnualConfirm, setShowAnnualConfirm] = useState(false);
  const [calcOpen, setCalcOpen]                   = useState(false);
  const [calcAiAddon, setCalcAiAddon]               = useState(false);
  const [calcAnnual, setCalcAnnual]                 = useState(false);
  const [calcMonthlyTotal, setCalcMonthlyTotal]     = useState(149);
  const [calcAnnualTotal, setCalcAnnualTotal]       = useState(1490);
  const calcDetailsRef                            = useRef<HTMLDetailsElement>(null);
  const { isSignedIn }                            = useAuth();
  const router                                    = useRouter();

  async function proceedToCheckout(planKey: string) {
    setLoading(planKey);
    try {
      const result = await createCheckoutSession(planKey, annual ? 'annual' : 'monthly', planKey === 'accountant' ? calcAiAddon : undefined);
      if (result.error) { setErrorMsg(result.error); return; }
      if (result.url)   { window.location.href = result.url; }
    } finally {
      setLoading(null);
    }
  }

  async function handleCalcCheckout() {
    if (!isSignedIn) {
      router.push('/sign-up');
      return;
    }
    if (calcAnnual) { setShowAnnualConfirm(true); return; }
    setLoading('accountant');
    try {
      const result = await createCheckoutSession('accountant', 'monthly', calcAiAddon);
      if (result.error) { setErrorMsg(result.error); return; }
      if (result.url)   { window.location.href = result.url; }
    } finally {
      setLoading(null);
    }
  }

  function handleCta(planKey: string) {
    setErrorMsg(null);
    if (!isSignedIn) {
      // Persist plan selection into sign-up and onboarding wizard.
      // httpOnly=false is intentional -- the wizard reads this client-side.
      // Cookie expires in 1 hour, sufficient to complete sign-up and onboarding.
      router.push('/sign-up');
      return;
    }
    if (planKey === 'accountant' && annual) {
      setShowAnnualConfirm(true);
      return;
    }
    void proceedToCheckout(planKey);
  }

  function openCalculator() {
    setCalcOpen(true);
    setTimeout(() => {
      calcDetailsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 50);
  }

  return (
    <div>

      <div className="flex items-center justify-center gap-2 bg-red-600 text-white text-sm font-medium px-5 py-3 rounded-xl mb-8">
        <Zap className="w-4 h-4 flex-shrink-0" />
        <span>Launch sale: <strong>50% off Personal &amp; Pro</strong> &#x2014; limited time only.</span>
      </div>

      <div className="flex items-center justify-center mb-10">
        <div className="inline-flex items-center bg-muted rounded-xl p-1 gap-1">
          <button onClick={() => { setAnnual(false); setCalcAnnual(false); }}
            className={'px-5 py-2 rounded-lg text-sm font-semibold transition-all ' + (!annual ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground')}>
            Monthly
          </button>
          <button onClick={() => { setAnnual(true); setCalcAnnual(true); }}
            className={'px-5 py-2 rounded-lg text-sm font-semibold transition-all flex items-center gap-2 ' + (annual ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground')}>
            Annual
            <span className="bg-[#EDF7F2] text-[#0F6E56] text-xs font-semibold px-2 py-0.5 rounded-full">2 months free</span>
          </button>
        </div>
      </div>

      {errorMsg && (
        <div className="mb-6 text-center text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-xl px-4 py-3">{errorMsg}</div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">

        {PERSONAL_AND_PRO.map((plan) => {
          const regularAnnual = plan.regularMonthly * 12;
          const isLoading     = loading === plan.key;
          return (
            <div key={plan.key}
              className={'rounded-2xl p-7 flex flex-col border-2 relative transition-all ' + (plan.highlight ? 'border-[#0F6E56] bg-[#EDF7F2] dark:bg-primary/10 shadow-xl' : 'border-border bg-card hover:border-[#0F6E56]/40 hover:shadow-md')}>
              {plan.highlight && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                  <span className="bg-[#0F6E56] text-white text-xs font-semibold px-4 py-1.5 rounded-full shadow-sm">Most Popular</span>
                </div>
              )}
              <div className="mb-5">
                <p className="text-base font-bold text-foreground mb-1">{plan.name}</p>
                <p className="text-xs text-muted-foreground mb-4">{plan.description}</p>
                {annual ? (
                  <>
                    <div className="flex items-baseline gap-1 mb-1">
                      <span className="text-4xl font-bold text-foreground">${plan.annual}</span>
                      <span className="text-sm text-muted-foreground"> CAD/yr</span>
                    </div>
                    <p className="text-sm text-[#0F6E56] font-medium">${plan.annualPerMonth.toFixed(2)}/mo &#x00b7; 2 months free</p>
                    <p className="text-xs text-muted-foreground mt-1 line-through">Normally ${regularAnnual} CAD/yr</p>
                    <p className="text-xs font-medium text-red-600 mt-0.5">You save ${(regularAnnual - plan.annual).toFixed(0)} CAD/yr</p>
                  </>
                ) : (
                  <>
                    <div className="flex items-baseline gap-1 mb-1">
                      <span className="text-4xl font-bold text-foreground">${plan.monthly}</span>
                      <span className="text-sm text-muted-foreground"> CAD/mo</span>
                    </div>
                    <p className="text-xs text-muted-foreground line-through">Normally ${plan.regularMonthly} CAD/mo</p>
                    <p className="text-xs font-medium text-red-600 mt-0.5">50% launch discount applied</p>
                  </>
                )}
                {plan.limit && (
                  <p className="text-xs text-muted-foreground mt-2 pt-2 border-t border-border/50">{plan.limit}</p>
                )}
              </div>
              <ul className="space-y-2.5 mb-7 flex-1">
                {plan.inheritsFrom && (
                  <li className="flex items-start gap-2.5 text-sm text-foreground">
                    <CheckCircle2 className="w-4 h-4 text-[#0F6E56] flex-shrink-0 mt-0.5" />
                    <strong>Everything in {plan.inheritsFrom}</strong>
                  </li>
                )}
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2.5 text-sm text-foreground">
                    <CheckCircle2 className="w-4 h-4 text-[#0F6E56] flex-shrink-0 mt-0.5" />
                    {f}
                  </li>
                ))}
              </ul>
              <button onClick={() => handleCta(plan.key)} disabled={loading !== null}
                className={'inline-flex items-center justify-center gap-2 text-sm font-semibold px-4 py-3 rounded-xl transition-colors disabled:opacity-60 disabled:cursor-not-allowed ' + (plan.highlight ? 'bg-[#0F6E56] text-white hover:bg-[#085041]' : 'border-2 border-[#0F6E56] text-[#0F6E56] hover:bg-[#EDF7F2] dark:hover:bg-primary/10')}>
                {isLoading ? <><Loader2 className="w-4 h-4 animate-spin" />Setting up...</> : <>Start free trial &#x2014; no credit card <ArrowRight className="w-4 h-4" /></>}
              </button>
            </div>
          );
        })}

        <div className="rounded-2xl p-7 flex flex-col border-2 border-border bg-card hover:border-[#0F6E56]/40 hover:shadow-md transition-all">
          <div className="mb-5">
            <p className="text-base font-bold text-foreground mb-1">Accountant</p>
            <p className="text-xs text-muted-foreground mb-4">For accounting firms managing multiple clients</p>
            {annual ? (
              <div className="inline-flex self-start items-center gap-1.5 bg-amber-50 dark:bg-amber-500/10 border border-amber-300/60 dark:border-amber-500/30 text-amber-800 dark:text-amber-300 text-xs font-medium px-3 py-1 rounded-full mb-3">
                <ShieldAlert className="w-3.5 h-3.5" />
                12-month commitment &#x00b7; non-refundable
              </div>
            ) : (
              <div className="inline-flex self-start items-center gap-1.5 bg-[#EDF7F2] dark:bg-primary/10 border border-[#C3E8D8] dark:border-primary/30 text-[#0F6E56] text-xs font-medium px-3 py-1 rounded-full mb-3">
                <ShieldCheck className="w-3.5 h-3.5" />
                30-day money-back guarantee
              </div>
            )}
            <div className="flex items-baseline gap-1 mb-1">
              <span className="text-4xl font-bold text-foreground">${calcAnnual ? calcAnnualTotal.toLocaleString() : calcMonthlyTotal.toLocaleString()}</span>
              <span className="text-sm text-muted-foreground"> CAD/{annual ? 'yr' : 'mo'} base</span>
            </div>
            <p className="text-xs text-muted-foreground mt-2 pt-2 border-t border-border/50">5 clients + 3 seats included &#x00b7; scale up from there</p>
          </div>
          <ul className="space-y-2.5 mb-6 flex-1">
            <li className="flex items-start gap-2.5 text-sm text-foreground">
              <CheckCircle2 className="w-4 h-4 text-[#0F6E56] flex-shrink-0 mt-0.5" />
              <strong>{ACCOUNTANT_LEAD_FEATURE}</strong>
            </li>
            {ACCOUNTANT_FEATURES.map((f) => (
              <li key={f} className="flex items-start gap-2.5 text-sm text-foreground">
                <CheckCircle2 className="w-4 h-4 text-[#0F6E56] flex-shrink-0 mt-0.5" />
                {f}
              </li>
            ))}
          </ul>
          <button type="button" onClick={openCalculator}
            className="inline-flex items-center justify-center gap-2 text-sm font-semibold px-4 py-2.5 rounded-xl border-2 border-dashed border-[#0F6E56]/60 text-[#0F6E56] hover:bg-[#EDF7F2] dark:hover:bg-primary/10 transition-colors mb-2">
            Customize <ChevronDown className="w-4 h-4" />
          </button>
          <button onClick={() => handleCta('accountant')} disabled={loading !== null}
            className="inline-flex items-center justify-center gap-2 text-sm font-semibold px-4 py-3 rounded-xl border-2 border-[#0F6E56] text-[#0F6E56] hover:bg-[#EDF7F2] dark:hover:bg-primary/10 transition-colors disabled:opacity-60 disabled:cursor-not-allowed">
            {loading === 'accountant' ? <><Loader2 className="w-4 h-4 animate-spin" />Setting up...</> : <>{annual ? 'Subscribe \u2014 12-month commitment' : 'Subscribe \u2014 30-day money-back guarantee'} <ArrowRight className="w-4 h-4" /></>}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-8">
        <div className="rounded-xl border border-[#C3E8D8] dark:border-primary/30 bg-[#EDF7F2] dark:bg-primary/10 p-4">
          <div className="flex items-center gap-2 mb-1">
            <ShieldCheck className="w-4 h-4 text-[#0F6E56] flex-shrink-0" />
            <span className="text-sm font-semibold text-foreground">Personal &amp; Pro</span>
          </div>
          <p className="text-xs text-muted-foreground">14-day free trial &#x00b7; no credit card</p>
        </div>
        <div className="rounded-xl border border-[#C3E8D8] dark:border-primary/30 bg-[#EDF7F2] dark:bg-primary/10 p-4">
          <div className="flex items-center gap-2 mb-1">
            <ShieldCheck className="w-4 h-4 text-[#0F6E56] flex-shrink-0" />
            <span className="text-sm font-semibold text-foreground">Accountant Monthly</span>
          </div>
          <p className="text-xs text-muted-foreground">30-day money-back &#x00b7; billed at signup</p>
        </div>
        <div className="rounded-xl border border-amber-300/60 dark:border-amber-500/30 bg-amber-50 dark:bg-amber-500/10 p-4">
          <div className="flex items-center gap-2 mb-1">
            <ShieldAlert className="w-4 h-4 text-amber-700 dark:text-amber-300 flex-shrink-0" />
            <span className="text-sm font-semibold text-foreground">Accountant Annual</span>
          </div>
          <p className="text-xs text-muted-foreground">12-month commitment &#x00b7; non-refundable</p>
        </div>
      </div>

      <p className="text-center text-xs text-muted-foreground mb-10">Stop renewal anytime in Billing settings. Refund eligibility follows the plan terms above.</p>

      <details ref={calcDetailsRef} open={calcOpen}
        onToggle={(e) => setCalcOpen((e.currentTarget as HTMLDetailsElement).open)}
        id="accountant-calculator"
        className="group rounded-2xl border-2 border-[#0F6E56]/30 bg-[#EDF7F2] dark:bg-primary/10 mb-10 scroll-mt-24">
        <summary className="cursor-pointer list-none p-5 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Calculator className="w-5 h-5 text-[#0F6E56] flex-shrink-0" />
            <div>
              <p className="text-sm font-semibold text-foreground">Estimate your firm&#x2019;s monthly cost</p>
              <p className="text-xs text-muted-foreground">Slide to model client count, staff seats, and AI add-on</p>
            </div>
          </div>
          <ChevronDown className={'w-5 h-5 text-muted-foreground flex-shrink-0 transition-transform ' + (calcOpen ? 'rotate-180' : '')} />
        </summary>
        <div className="px-5 pb-5 pt-2 border-t border-[#0F6E56]/20">
          <AccountantCalculator onAiAddonChange={setCalcAiAddon} onAnnualChange={setCalcAnnual} initialAnnual={calcAnnual} onCheckout={() => handleCalcCheckout()} isLoading={loading === 'accountant'} onTotalChange={(m, a) => { setCalcMonthlyTotal(m); setCalcAnnualTotal(a); }} />
        </div>
      </details>

      <div className="rounded-2xl border-2 border-[#0F6E56]/30 bg-[#EDF7F2] dark:bg-primary/10 p-6 mb-16">
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-xl bg-[#0F6E56] flex items-center justify-center flex-shrink-0">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="text-sm font-bold text-foreground mb-1">AI bookkeeping assistant &#x2014; included on Pro and Accountant plans</p>
            <p className="text-sm text-muted-foreground leading-relaxed">Ask anything about your books in plain English. Instant answers from your actual data, powered by Claude AI.</p>
          </div>
        </div>
      </div>

      <div>
        <h2 className="text-xl font-bold text-foreground text-center mb-8">Full feature comparison</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-3 pr-4 font-medium text-muted-foreground w-1/2">Feature</th>
                <th className="text-center py-3 px-4 font-semibold text-foreground">Personal</th>
                <th className="text-center py-3 px-4 font-semibold text-[#0F6E56]">Pro</th>
                <th className="text-center py-3 px-4 font-semibold text-foreground">Accountant</th>
              </tr>
            </thead>
            <tbody>
              {COMPARISON_SECTIONS.map((section, sIdx) => (
                <Fragment key={'section-' + sIdx}>
                  <tr className="bg-muted/40">
                    <td colSpan={4} className="py-2.5 pl-4 pr-4 text-xs font-bold uppercase tracking-wider text-[#0F6E56]">
                      {section.title}
                    </td>
                  </tr>
                  {section.rows.map((row, rIdx) => (
                    <tr key={'s-' + sIdx + '-r-' + rIdx} className={'border-b border-border/50 ' + (rIdx % 2 === 0 ? 'bg-card/50' : '')}>
                      <td className="py-3 pr-4 pl-4 text-muted-foreground">{row.label}</td>
                      <td className="py-3 px-4 text-center"><CompCellRender value={row.starter} /></td>
                      <td className="py-3 px-4 text-center"><CompCellRender value={row.pro} isPro /></td>
                      <td className="py-3 px-4 text-center"><CompCellRender value={row.accountant} /></td>
                    </tr>
                  ))}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showAnnualConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="bg-card rounded-2xl border border-border max-w-md w-full p-6 shadow-2xl">
            <div className="flex items-start gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-500/20 flex items-center justify-center flex-shrink-0">
                <ShieldAlert className="w-5 h-5 text-amber-700 dark:text-amber-300" />
              </div>
              <div>
                <h3 className="text-base font-bold text-foreground">Confirm annual commitment</h3>
                <p className="text-xs text-muted-foreground mt-0.5">Please review before continuing</p>
              </div>
            </div>
            <div className="space-y-3 text-sm text-muted-foreground mb-6">
              <p>The annual Accountant plan is a <strong className="text-foreground">12-month commitment</strong> and is <strong className="text-foreground">non-refundable</strong>.</p>
              <p>The 30-day money-back guarantee applies to the monthly plan only.</p>
              <p>You will be charged <strong className="text-foreground">${calcAnnualTotal.toLocaleString()} CAD</strong> today and will not be billed again for 12 months.</p>
            </div>
            <div className="flex gap-3 justify-end">
              <button type="button" onClick={() => setShowAnnualConfirm(false)}
                className="px-4 py-2 rounded-xl text-sm font-semibold text-muted-foreground hover:bg-muted transition-colors">
                Cancel
              </button>
              <button type="button" onClick={() => { setShowAnnualConfirm(false); void proceedToCheckout('accountant'); }}
                className="px-4 py-2 rounded-xl text-sm font-semibold bg-[#0F6E56] text-white hover:bg-[#085041] transition-colors">
                Yes, subscribe for 12 months
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}