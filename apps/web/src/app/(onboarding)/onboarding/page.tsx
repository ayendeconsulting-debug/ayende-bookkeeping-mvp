'use client';

import { useState, useTransition, useEffect } from 'react';
import {
  saveModeAndCountry,
  saveBusinessDetails,
  saveTaxSettings,
  getProvincesForOnboarding,
  seedAccounts,
  cancelOnboarding,
  finishOnboarding,
} from './actions';
import { toastSuccess, toastError } from '@/lib/toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CheckCircle2, ChevronRight, Loader2, Building2, Receipt } from 'lucide-react';
import { useClerk } from '@clerk/nextjs';

type Mode    = 'business' | 'freelancer' | 'personal';
type Country = 'CA' | 'US';
type PlanId  = 'starter' | 'pro' | 'accountant';

interface Province {
  province_code: string;
  province_name: string;
  hst_rate: number | null;
  gst_rate: number;
  is_hst_province: boolean;
}

interface TempoPlan {
  plan: PlanId;
  cycle: 'monthly' | 'annual';
}

const PLAN_DISPLAY: Record<PlanId, string> = {
  starter:    'Personal',
  pro:        'Pro',
  accountant: 'Accountant',
};

// Read the tempo_plan cookie written by pricing-cards.tsx when user clicked a CTA.
// httpOnly=false is intentional -- this must be readable client-side.
function readTempoPlanCookie(): TempoPlan | null {
  if (typeof document === 'undefined') return null;
  try {
    const match = document.cookie.split('; ').find((row) => row.startsWith('tempo_plan='));
    if (!match) return null;
    const raw    = decodeURIComponent(match.split('=')[1]);
    const parsed = JSON.parse(raw) as TempoPlan;
    if (!parsed.plan || !parsed.cycle) return null;
    return parsed;
  } catch {
    return null;
  }
}

const MODE_CARDS = [
  {
    id: 'business' as Mode,
    icon: 'ðŸ¢',
    title: 'Business',
    subtitle: 'Incorporated companies, partnerships, registered businesses',
    features: ['Full double-entry accounting', 'AP/AR tracking', 'Financial reports', 'Invoice creation', 'Multi-user access'],
  },
  {
    id: 'freelancer' as Mode,
    icon: 'ðŸ’¼',
    title: 'Freelancer / Sole Proprietor',
    subtitle: 'Independent contractors, consultants, self-employed',
    features: ['Personal & business split', 'Simplified categories', 'Quarterly tax estimates', 'Invoice creation', 'Mileage tracker'],
  },
  {
    id: 'personal' as Mode,
    icon: 'ðŸ ',
    title: 'Personal Finance',
    subtitle: 'Household budgeting, savings goals, spending tracking',
    features: ['Budget categories', 'Savings goals', 'Net worth tracker', 'Recurring payment detection', 'Upcoming reminders'],
  },
];

const INDUSTRIES = [
  { id: 'general',      label: 'General / Other',        icon: 'ðŸ“‹', description: 'Standard chart of accounts for any business' },
  { id: 'services',     label: 'Professional Services',  icon: 'ðŸ’¼', description: 'Consulting, legal, accounting, IT services' },
  { id: 'retail',       label: 'Retail',                 icon: 'ðŸ›’', description: 'Inventory, cost of goods sold, sales' },
  { id: 'construction', label: 'Construction',           icon: 'ðŸ—ï¸', description: 'WIP, contract revenue, subcontractors' },
  { id: 'restaurant',   label: 'Restaurant / Food',      icon: 'ðŸ½ï¸', description: 'Food & beverage, kitchen labor, catering' },
  { id: 'freelancer',   label: 'Freelancer',             icon: 'ðŸ§‘â€ðŸ’»', description: 'Home office, tools, mileage, consulting revenue' },
];

// ProgressBar now accepts totalSteps so it reflects mode-aware step count.
// Business/Freelancer: 4 steps. Personal: 3 steps.
function ProgressBar({ step, totalSteps }: { step: number; totalSteps: number }) {
  return (
    <div className="flex items-center gap-2 mb-8">
      {Array.from({ length: totalSteps }, (_, i) => i + 1).map((s) => (
        <div key={s} className="flex items-center gap-2">
          <div className={[
            'w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold transition-all',
            s < step   ? 'bg-primary text-primary-foreground' :
            s === step ? 'bg-primary text-primary-foreground ring-4 ring-primary/20' :
                         'bg-muted text-muted-foreground',
          ].join(' ')}>
            {s < step ? <CheckCircle2 className="w-4 h-4" /> : s}
          </div>
          {s < totalSteps && (
            <div className={'h-0.5 w-6 rounded transition-all ' + (s < step ? 'bg-primary' : 'bg-muted')} />
          )}
        </div>
      ))}
      <span className="ml-2 text-xs text-muted-foreground">Step {step} of {totalSteps}</span>
    </div>
  );
}

export default function OnboardingPage() {
  const { signOut } = useClerk();
  const [step, setStep]              = useState(1);
  const [totalSteps, setTotalSteps]  = useState(4); // refined after step 1
  const [isPending, startTransition] = useTransition();

  const [selectedMode,    setSelectedMode]    = useState<Mode | null>(null);
  const [selectedCountry, setSelectedCountry] = useState<Country | null>(null);
  const [businessName,    setBusinessName]    = useState('');
  const [currency,        setCurrency]        = useState('');
  const [fiscalYearEnd,   setFiscalYearEnd]   = useState('');
  const [industry,        setIndustry]        = useState('');
  const [error,           setError]           = useState<string | null>(null);

  const [provinces,       setProvinces]       = useState<Province[]>([]);
  const [provinceCode,    setProvinceCode]    = useState('');
  const [hstNumber,       setHstNumber]       = useState('');
  const [hstFrequency,    setHstFrequency]    = useState<'monthly' | 'quarterly' | 'annual'>('quarterly');
  const [provincesLoaded, setProvincesLoaded] = useState(false);

  // Plan sourced from cookie set on /pricing -- no plan step in wizard.
  const [planCookie, setPlanCookie] = useState<TempoPlan | null>(null);

  useEffect(() => {
    setPlanCookie(readTempoPlanCookie());
  }, []);

  useEffect(() => {
    if (step !== 2 || selectedCountry !== 'CA' || provincesLoaded) return;
    getProvincesForOnboarding().then((result) => {
      if (result.data) setProvinces(result.data);
      setProvincesLoaded(true);
    });
  }, [step, selectedCountry, provincesLoaded]);

  // â”€â”€ Step handlers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  function handleStep1() {
    if (!selectedMode || !selectedCountry) { setError('Please select a mode and country.'); return; }
    setError(null);
    startTransition(async () => {
      const result = await saveModeAndCountry(selectedMode, selectedCountry);
      if (result.error) { setError(result.error); toastError('Could not save', result.error); return; }
      if (!currency) setCurrency(selectedCountry === 'CA' ? 'CAD' : 'USD');
      // Set mode-aware step count before advancing
      setTotalSteps(selectedMode === 'personal' ? 3 : 4);
      toastSuccess('Mode selected', selectedMode + ' mode \u00b7 ' + selectedCountry);
      setStep(2);
    });
  }

  function handleStep2() {
    if (!businessName.trim()) { setError('Business name is required.'); return; }
    setError(null);
    startTransition(async () => {
      const result = await saveBusinessDetails({
        name:            businessName.trim(),
        currency_code:   currency || (selectedCountry === 'CA' ? 'CAD' : 'USD'),
        fiscal_year_end: fiscalYearEnd || undefined,
      });
      if (result.error) { setError(result.error); toastError('Could not save', result.error); return; }

      // Save Canadian tax settings for Business/Freelancer with a province selected
      if (selectedCountry === 'CA' && provinceCode && selectedMode !== 'personal') {
        const taxResult = await saveTaxSettings({
          province_code:            provinceCode,
          hst_registration_number:  hstNumber.trim() || undefined,
          hst_reporting_frequency:  hstFrequency,
        });
        if (taxResult.error) {
          toastError('Tax settings not saved', taxResult.error + ' You can update these in Settings.');
        } else {
          toastSuccess('Tax settings saved', 'Province: ' + provinceCode + ' default tax codes created');
        }
      }

      toastSuccess('Details saved');

      if (selectedMode === 'personal') {
        // Personal: auto-seed default accounts and go directly to Connect Bank.
        // Uses 'general' industry which produces a sensible default account set.
        const seedResult = await seedAccounts('general');
        if (seedResult.error) {
          toastError('Could not seed accounts', seedResult.error);
          // Non-fatal -- continue to Connect Bank; accounts can be added later.
        } else {
          toastSuccess('Accounts ready', 'Default accounts created for Personal mode');
        }
        setStep(3); // Connect Bank (step 3 of 3 for Personal)
      } else {
        setStep(3); // Industry / COA (step 3 of 4 for Business/Freelancer)
      }
    });
  }

  function handleStep3(chosenIndustry: string) {
    setError(null);
    startTransition(async () => {
      const result = await seedAccounts(chosenIndustry);
      if (result.error) { setError(result.error); toastError('Could not seed accounts', result.error); return; }
      const msg = result.skipped ? 'Accounts already set up' : result.seeded + ' accounts created';
      toastSuccess('Chart of accounts ready', msg);
      setStep(4); // Connect Bank (step 4 of 4 for Business/Freelancer)
    });
  }

  // Onboarding complete -- send user to /pricing to select plan and subscribe.
  function handleCheckout() {
    startTransition(async () => {
      const result = await finishOnboarding();
      if (result?.error) { setError(result.error); toastError('Could not finish onboarding', result.error); return; }
      window.location.href = '/pricing';
    });
  }

  const selectedProvince = provinces.find((p) => p.province_code === provinceCode);
  const taxLabel = selectedProvince
    ? selectedProvince.is_hst_province
      ? 'HST ' + Math.round((selectedProvince.hst_rate ?? 0) * 100) + '%'
      : 'GST ' + Math.round(selectedProvince.gst_rate * 100) + '%'
    : null;

  const planLabel    = planCookie ? (PLAN_DISPLAY[planCookie.plan] ?? planCookie.plan) : null;
  const isAccountant = planCookie?.plan === 'accountant';

  const selectClass = 'text-sm border border-border rounded-lg px-3 py-2 outline-none focus:border-primary bg-background text-foreground';

  // Connect Bank renders at the last step for both modes
  const isConnectBankStep = step === totalSteps;

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="w-full max-w-3xl">

        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-primary mb-3">
            <svg viewBox="0 0 16 16" className="w-7 h-7">
              <rect x="1"   y="10" width="3" height="5"  rx="0.5" fill="white" opacity="0.5"/>
              <rect x="6.5" y="7"  width="3" height="8"  rx="0.5" fill="white" opacity="0.75"/>
              <rect x="12"  y="3"  width="3" height="12" rx="0.5" fill="white"/>
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-foreground">Welcome to Tempo</h1>
          <p className="text-muted-foreground mt-1 text-sm">Let&apos;s set up your account in a few steps.</p>
        </div>

        <ProgressBar step={step} totalSteps={totalSteps} />

        {/* Step 1: Mode + Country */}
        {step === 1 && (
          <div className="flex flex-col gap-6">
            <div>
              <h2 className="text-base font-semibold text-foreground mb-3">How will you use Tempo?</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {MODE_CARDS.map((card) => {
                  const isSelected = selectedMode === card.id;
                  return (
                    <button key={card.id} onClick={() => setSelectedMode(card.id)}
                      className={['text-left p-5 rounded-xl border-2 transition-all bg-card hover:border-primary',
                        isSelected ? 'border-primary ring-2 ring-primary/10' : 'border-border'].join(' ')}>
                      <div className="text-2xl mb-2">{card.icon}</div>
                      <div className="font-semibold text-sm text-foreground mb-0.5">{card.title}</div>
                      <div className="text-xs text-muted-foreground mb-3">{card.subtitle}</div>
                      <ul className="space-y-0.5">
                        {card.features.map((f) => (
                          <li key={f} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <span className={isSelected ? 'text-primary' : 'text-muted-foreground/30'}>&#x2713;</span>{f}
                          </li>
                        ))}
                      </ul>
                      {isSelected && (
                        <div className="mt-3 text-xs font-medium text-primary flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" />Selected
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <h2 className="text-base font-semibold text-foreground mb-3">Where are you based?</h2>
              <div className="grid grid-cols-2 gap-3 max-w-xs">
                {(['CA', 'US'] as Country[]).map((c) => {
                  const isSelected = selectedCountry === c;
                  return (
                    <button key={c} onClick={() => setSelectedCountry(c)}
                      className={['relative flex items-center gap-3 p-3 rounded-xl border-2 transition-all bg-card hover:border-primary',
                        isSelected ? 'border-primary ring-2 ring-primary/20 bg-primary-light/30 dark:bg-primary/5' : 'border-border'].join(' ')}>
                      <span className="text-xl">{c === 'CA' ? 'ðŸ‡¨ðŸ‡¦' : 'ðŸ‡ºðŸ‡¸'}</span>
                      <div className="text-left flex-1">
                        <div className="font-semibold text-sm text-foreground">{c === 'CA' ? 'Canada' : 'United States'}</div>
                        <div className="text-xs text-muted-foreground">{c === 'CA' ? 'CAD \u00b7 CRA' : 'USD \u00b7 IRS'}</div>
                      </div>
                      {isSelected && <CheckCircle2 className="w-4 h-4 text-primary flex-shrink-0" />}
                    </button>
                  );
                })}
              </div>
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}
            <div className="flex flex-col gap-3">
              <Button onClick={handleStep1} disabled={isPending || !selectedMode || !selectedCountry} className="flex items-center gap-2">
                {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                Continue <ChevronRight className="w-4 h-4" />
              </Button>
              <button type="button"
                onClick={async () => { await cancelOnboarding(); signOut({ redirectUrl: 'https://gettempo.ca' }); }}
                className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-2 transition-colors w-fit text-left">
                Cancel &mdash; return to website
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Business Details (Business/Freelancer) or Personal Details (Personal) */}
        {step === 2 && (
          <div className="flex flex-col gap-5 bg-card rounded-2xl border border-border p-6">
            <div className="flex items-center gap-2">
              <Building2 className="w-5 h-5 text-primary" />
              <h2 className="text-base font-semibold text-foreground">
                {selectedMode === 'personal' ? 'Tell us about yourself' : 'Tell us about your business'}
              </h2>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label>{selectedMode === 'personal' ? 'Your Name *' : 'Business Name *'}</Label>
              <Input value={businessName} onChange={(e) => setBusinessName(e.target.value)}
                placeholder={selectedMode === 'personal' ? 'e.g. Alex Johnson' : 'e.g. Acme Consulting Inc.'} />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <Label>Base Currency</Label>
                <select value={currency} onChange={(e) => setCurrency(e.target.value)} className={selectClass}>
                  <option value="CAD">CAD &ndash; Canadian Dollar</option>
                  <option value="USD">USD &ndash; US Dollar</option>
                  <option value="EUR">EUR &ndash; Euro</option>
                  <option value="GBP">GBP &ndash; British Pound</option>
                </select>
              </div>
              {selectedMode !== 'personal' && (
                <div className="flex flex-col gap-1.5">
                  <Label>Fiscal Year End <span className="text-muted-foreground font-normal">(optional)</span></Label>
                  <Input type="date" value={fiscalYearEnd} onChange={(e) => setFiscalYearEnd(e.target.value)} />
                </div>
              )}
            </div>

            {/* Canadian Tax Settings -- Business/Freelancer only */}
            {selectedCountry === 'CA' && selectedMode !== 'personal' && (
              <div className="flex flex-col gap-4 pt-2 border-t border-border">
                <div className="flex items-center gap-2">
                  <Receipt className="w-4 h-4 text-primary" />
                  <h3 className="text-sm font-semibold text-foreground">Canadian Tax Settings</h3>
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label>Province / Territory <span className="text-muted-foreground font-normal">(recommended)</span></Label>
                  <select value={provinceCode} onChange={(e) => setProvinceCode(e.target.value)} className={selectClass}>
                    <option value="">&#x2014; Select province &#x2014;</option>
                    {provinces.map((p) => (
                      <option key={p.province_code} value={p.province_code}>
                        {p.province_name} ({p.province_code})
                      </option>
                    ))}
                  </select>
                  {taxLabel && (
                    <p className="text-xs text-primary font-medium">
                      &#x2713; Default tax rate: {taxLabel} &mdash; tax codes will be created automatically
                    </p>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1.5">
                    <Label>HST / GST Number <span className="text-muted-foreground font-normal">(optional)</span></Label>
                    <Input value={hstNumber} onChange={(e) => setHstNumber(e.target.value)}
                      placeholder="123456789RT0001" maxLength={20} />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label>HST / GST Filing Frequency</Label>
                    <select value={hstFrequency}
                      onChange={(e) => setHstFrequency(e.target.value as 'monthly' | 'quarterly' | 'annual')}
                      className={selectClass}>
                      <option value="monthly">Monthly</option>
                      <option value="quarterly">Quarterly (most common)</option>
                      <option value="annual">Annual</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            {error && <p className="text-sm text-destructive">{error}</p>}
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={() => setStep(1)} disabled={isPending}>Back</Button>
              <Button onClick={handleStep2} disabled={isPending} className="flex items-center gap-2">
                {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                Continue <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}

        {/* Step 3: Industry / COA -- Business/Freelancer only */}
        {step === 3 && selectedMode !== 'personal' && (
          <div className="flex flex-col gap-5 bg-card rounded-2xl border border-border p-6">
            <div>
              <h2 className="text-base font-semibold text-foreground mb-1">Set up your chart of accounts</h2>
              <p className="text-sm text-muted-foreground">We&apos;ll create the right accounts for your industry.</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {INDUSTRIES
                .filter((ind) => selectedMode === 'freelancer' ? ind.id !== 'retail' && ind.id !== 'restaurant' : true)
                .map((ind) => (
                  <button key={ind.id} onClick={() => setIndustry(ind.id)}
                    className={['flex items-start gap-3 p-3.5 rounded-xl border-2 transition-all text-left bg-card hover:border-primary',
                      industry === ind.id ? 'border-primary ring-2 ring-primary/10' : 'border-border'].join(' ')}>
                    <span className="text-xl flex-shrink-0">{ind.icon}</span>
                    <div>
                      <div className="text-sm font-medium text-foreground">{ind.label}</div>
                      <div className="text-xs text-muted-foreground mt-0.5">{ind.description}</div>
                    </div>
                  </button>
                ))}
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={() => setStep(2)} disabled={isPending}>Back</Button>
              <Button onClick={() => industry && handleStep3(industry)} disabled={isPending || !industry} className="flex items-center gap-2">
                {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                Set Up Accounts <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}

        {/* Connect Bank -- last step for all modes (step 3 Personal, step 4 Business/Freelancer) */}
        {isConnectBankStep && (
          <div className="flex flex-col gap-5 bg-card rounded-2xl border border-border p-6">
            <div>
              <h2 className="text-base font-semibold text-foreground mb-1">Connect your bank account</h2>
              <p className="text-sm text-muted-foreground">
                Link your bank to auto-import transactions. Powered by Plaid &mdash; secure and read-only.
              </p>
            </div>



            <div className="rounded-xl border border-border bg-muted p-5 flex flex-col items-center gap-3 text-center">
              <div className="text-3xl">ðŸ¦</div>
              <div>
                <p className="text-sm font-medium text-foreground">Secure bank connection via Plaid</p>
                <p className="text-xs text-muted-foreground mt-1">Works with 12,000+ financial institutions in Canada and the US.</p>
              </div>
              <Button onClick={handleCheckout} disabled={isPending} className="flex items-center gap-2 w-full justify-center">
                {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                Continue to Pricing &#x2192;
              </Button>
            </div>

            <div className="text-center">
              <button onClick={handleCheckout} disabled={isPending}
                className="text-sm text-muted-foreground hover:text-foreground underline underline-offset-2 transition-colors disabled:opacity-50">
                Skip bank connection &mdash; go to pricing
              </button>
            </div>

            {error && <p className="text-sm text-destructive text-center">{error}</p>}

            <div className="flex justify-start">
              <Button variant="outline" onClick={() => setStep(step - 1)} disabled={isPending}>Back</Button>
            </div>
          </div>
        )}

        <p className="text-center mt-6 text-xs text-muted-foreground">
          You can change your mode and settings at any time from the Settings page.
        </p>
      </div>
    </div>
  );
}