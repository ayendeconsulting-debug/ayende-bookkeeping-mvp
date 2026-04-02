'use client';

import { useState, useTransition } from 'react';
import {
  saveModeAndCountry,
  saveBusinessDetails,
  seedAccounts,
  createFirstTaxCode,
  completeOnboarding,
} from './actions';
import { toastSuccess, toastError } from '@/lib/toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CheckCircle2, ChevronRight, Loader2, Building2 } from 'lucide-react';

type Mode = 'business' | 'freelancer' | 'personal';
type Country = 'CA' | 'US';

const TOTAL_STEPS = 5;

const MODE_CARDS = [
  {
    id: 'business' as Mode,
    icon: '🏢',
    title: 'Business',
    subtitle: 'Incorporated companies, partnerships, registered businesses',
    features: ['Full double-entry accounting', 'AP/AR tracking', 'Financial reports', 'Invoice creation', 'Multi-user access'],
  },
  {
    id: 'freelancer' as Mode,
    icon: '💼',
    title: 'Freelancer / Sole Proprietor',
    subtitle: 'Independent contractors, consultants, self-employed',
    features: ['Personal & business split', 'Simplified categories', 'Quarterly tax estimates', 'Invoice creation', 'Mileage tracker'],
  },
  {
    id: 'personal' as Mode,
    icon: '🏠',
    title: 'Personal Finance',
    subtitle: 'Household budgeting, savings goals, spending tracking',
    features: ['Budget categories', 'Savings goals', 'Net worth tracker', 'Recurring payment detection', 'Upcoming reminders'],
  },
];

const INDUSTRIES = [
  { id: 'general',      label: 'General / Other',    icon: '📋', description: 'Standard chart of accounts for any business' },
  { id: 'services',     label: 'Professional Services', icon: '💼', description: 'Consulting, legal, accounting, IT services' },
  { id: 'retail',       label: 'Retail',              icon: '🛒', description: 'Inventory, cost of goods sold, sales' },
  { id: 'construction', label: 'Construction',        icon: '🏗️', description: 'WIP, contract revenue, subcontractors' },
  { id: 'restaurant',   label: 'Restaurant / Food',   icon: '🍽️', description: 'Food & beverage, kitchen labor, catering' },
  { id: 'freelancer',   label: 'Freelancer',          icon: '🧑‍💻', description: 'Home office, tools, mileage, consulting revenue' },
];

const TAX_PRESETS: Record<Country, { code: string; name: string; rate: number }[]> = {
  CA: [
    { code: 'HST', name: 'Harmonized Sales Tax (HST)', rate: 0.13 },
    { code: 'GST', name: 'Goods & Services Tax (GST)', rate: 0.05 },
  ],
  US: [
    { code: 'SALES', name: 'Sales Tax', rate: 0.0875 },
  ],
};

/* ── Progress Bar ─────────────────────────────────────────────────────── */
function ProgressBar({ step }: { step: number }) {
  return (
    <div className="flex items-center gap-2 mb-8">
      {Array.from({ length: TOTAL_STEPS }, (_, i) => i + 1).map((s) => (
        <div key={s} className="flex items-center gap-2">
          <div className={[
            'w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold transition-all',
            s < step  ? 'bg-[#0F6E56] text-white' :
            s === step ? 'bg-[#0F6E56] text-white ring-4 ring-[#0F6E56]/20' :
            'bg-gray-200 text-gray-500',
          ].join(' ')}>
            {s < step ? <CheckCircle2 className="w-4 h-4" /> : s}
          </div>
          {s < TOTAL_STEPS && (
            <div className={`h-0.5 w-8 rounded transition-all ${s < step ? 'bg-[#0F6E56]' : 'bg-gray-200'}`} />
          )}
        </div>
      ))}
      <span className="ml-2 text-xs text-gray-400">Step {step} of {TOTAL_STEPS}</span>
    </div>
  );
}

/* ── Main Wizard ──────────────────────────────────────────────────────── */
export default function OnboardingPage() {
  const [step, setStep] = useState(1);
  const [isPending, startTransition] = useTransition();

  // Step 1 state
  const [selectedMode, setSelectedMode] = useState<Mode | null>(null);
  const [selectedCountry, setSelectedCountry] = useState<Country | null>(null);

  // Step 2 state
  const [businessName, setBusinessName] = useState('');
  const [currency, setCurrency] = useState('');
  const [fiscalYearEnd, setFiscalYearEnd] = useState('');

  // Step 3 state
  const [industry, setIndustry] = useState('');
  const [accountsSeeded, setAccountsSeeded] = useState(false);

  // Step 4 state
  const [taxPreset, setTaxPreset] = useState('');
  const [taxAccountId] = useState(''); // Selected during tax code creation

  const [error, setError] = useState<string | null>(null);

  // ── Step 1: Mode + Country ────────────────────────────────────────────
  function handleStep1() {
    if (!selectedMode || !selectedCountry) { setError('Please select a mode and country.'); return; }
    setError(null);
    startTransition(async () => {
      const result = await saveModeAndCountry(selectedMode, selectedCountry);
      if (result.error) { setError(result.error); toastError('Could not save', result.error); return; }
      // Pre-fill currency based on country
      if (!currency) setCurrency(selectedCountry === 'CA' ? 'CAD' : 'USD');
      toastSuccess('Mode selected', `${selectedMode} mode · ${selectedCountry}`);
      setStep(2);
    });
  }

  // ── Step 2: Business Details ──────────────────────────────────────────
  function handleStep2() {
    if (!businessName.trim()) { setError('Business name is required.'); return; }
    setError(null);
    startTransition(async () => {
      const result = await saveBusinessDetails({
        name: businessName.trim(),
        currency_code: currency || (selectedCountry === 'CA' ? 'CAD' : 'USD'),
        fiscal_year_end: fiscalYearEnd || undefined,
      });
      if (result.error) { setError(result.error); toastError('Could not save', result.error); return; }
      toastSuccess('Business details saved');
      setStep(3);
    });
  }

  // ── Step 3: Seed Accounts ─────────────────────────────────────────────
  function handleStep3(chosenIndustry: string) {
    setError(null);
    startTransition(async () => {
      const result = await seedAccounts(chosenIndustry);
      if (result.error) { setError(result.error); toastError('Could not seed accounts', result.error); return; }
      setAccountsSeeded(true);
      const msg = result.skipped ? 'Accounts already set up' : `${result.seeded} accounts created`;
      toastSuccess('Chart of accounts ready', msg);
      // Skip step 4 (tax codes) for personal mode
      setStep(selectedMode === 'personal' ? 5 : 4);
    });
  }

  // ── Step 4: First Tax Code (skippable) ───────────────────────────────
  function skipStep4() {
    toastSuccess('Tax code skipped', 'You can add tax codes later in Settings.');
    setStep(5);
  }

  // ── Step 5: Connect Bank / Complete ──────────────────────────────────
  function handleComplete(destination: '/dashboard' | '/banks') {
    setError(null);
    startTransition(async () => {
      await completeOnboarding(destination);
      // completeOnboarding redirects — no further action needed
    });
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
      <div className="w-full max-w-3xl">

        {/* Logo + Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-[#0F6E56] text-white text-xl font-bold mb-3">
            A
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Welcome to Ayende CX</h1>
          <p className="text-gray-500 mt-1 text-sm">Let's set up your account in a few steps.</p>
        </div>

        <ProgressBar step={step} />

        {/* ── Step 1: Mode + Country ── */}
        {step === 1 && (
          <div className="flex flex-col gap-6">
            <div>
              <h2 className="text-base font-semibold text-gray-700 mb-3">How will you use Ayende CX?</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {MODE_CARDS.map((card) => {
                  const isSelected = selectedMode === card.id;
                  return (
                    <button key={card.id} onClick={() => setSelectedMode(card.id)}
                      className={['text-left p-5 rounded-xl border-2 transition-all bg-white hover:border-[#0F6E56]',
                        isSelected ? 'border-[#0F6E56] ring-2 ring-[#0F6E56]/10' : 'border-gray-200'].join(' ')}>
                      <div className="text-2xl mb-2">{card.icon}</div>
                      <div className="font-semibold text-sm text-gray-900 mb-0.5">{card.title}</div>
                      <div className="text-xs text-gray-500 mb-3">{card.subtitle}</div>
                      <ul className="space-y-0.5">
                        {card.features.map((f) => (
                          <li key={f} className="flex items-center gap-1.5 text-xs text-gray-500">
                            <span className={isSelected ? 'text-[#0F6E56]' : 'text-gray-300'}>✓</span>{f}
                          </li>
                        ))}
                      </ul>
                      {isSelected && <div className="mt-3 text-xs font-medium text-[#0F6E56] flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5" />Selected</div>}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <h2 className="text-base font-semibold text-gray-700 mb-3">Where are you based?</h2>
              <div className="grid grid-cols-2 gap-3 max-w-xs">
                {(['CA', 'US'] as Country[]).map((c) => (
                  <button key={c} onClick={() => setSelectedCountry(c)}
                    className={['flex items-center gap-3 p-3 rounded-xl border-2 transition-all bg-white hover:border-[#0F6E56]',
                      selectedCountry === c ? 'border-[#0F6E56] ring-2 ring-[#0F6E56]/10' : 'border-gray-200'].join(' ')}>
                    <span className="text-xl">{c === 'CA' ? '🇨🇦' : '🇺🇸'}</span>
                    <div className="text-left">
                      <div className="font-semibold text-sm">{c === 'CA' ? 'Canada' : 'United States'}</div>
                      <div className="text-xs text-gray-400">{c === 'CA' ? 'CAD · CRA' : 'USD · IRS'}</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {error && <p className="text-sm text-red-500">{error}</p>}
            <div>
              <Button onClick={handleStep1} disabled={isPending || !selectedMode || !selectedCountry} className="flex items-center gap-2">
                {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                Continue <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}

        {/* ── Step 2: Business Details ── */}
        {step === 2 && (
          <div className="flex flex-col gap-5 bg-white rounded-2xl border border-gray-200 p-6">
            <div className="flex items-center gap-2">
              <Building2 className="w-5 h-5 text-[#0F6E56]" />
              <h2 className="text-base font-semibold text-gray-900">Tell us about your business</h2>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label>Business Name *</Label>
              <Input value={businessName} onChange={(e) => setBusinessName(e.target.value)}
                placeholder={selectedMode === 'personal' ? 'Your name' : 'e.g. Acme Consulting Inc.'} />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <Label>Base Currency</Label>
                <select value={currency} onChange={(e) => setCurrency(e.target.value)}
                  className="text-sm border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-[#0F6E56]">
                  <option value="CAD">CAD – Canadian Dollar</option>
                  <option value="USD">USD – US Dollar</option>
                  <option value="EUR">EUR – Euro</option>
                  <option value="GBP">GBP – British Pound</option>
                </select>
              </div>
              {selectedMode !== 'personal' && (
                <div className="flex flex-col gap-1.5">
                  <Label>Fiscal Year End <span className="text-gray-400 font-normal">(optional)</span></Label>
                  <Input type="date" value={fiscalYearEnd} onChange={(e) => setFiscalYearEnd(e.target.value)} />
                </div>
              )}
            </div>

            {error && <p className="text-sm text-red-500">{error}</p>}
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={() => setStep(1)} disabled={isPending}>Back</Button>
              <Button onClick={handleStep2} disabled={isPending} className="flex items-center gap-2">
                {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                Continue <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}

        {/* ── Step 3: Seed Accounts ── */}
        {step === 3 && (
          <div className="flex flex-col gap-5 bg-white rounded-2xl border border-gray-200 p-6">
            <div>
              <h2 className="text-base font-semibold text-gray-900 mb-1">Set up your chart of accounts</h2>
              <p className="text-sm text-gray-500">We'll create the right accounts for your industry.</p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {INDUSTRIES
                .filter((ind) => selectedMode === 'freelancer' ? ind.id !== 'retail' && ind.id !== 'restaurant' : true)
                .map((ind) => (
                  <button key={ind.id} onClick={() => setIndustry(ind.id)}
                    className={['flex items-start gap-3 p-3.5 rounded-xl border-2 transition-all text-left bg-white hover:border-[#0F6E56]',
                      industry === ind.id ? 'border-[#0F6E56] ring-2 ring-[#0F6E56]/10' : 'border-gray-200'].join(' ')}>
                    <span className="text-xl flex-shrink-0">{ind.icon}</span>
                    <div>
                      <div className="text-sm font-medium text-gray-900">{ind.label}</div>
                      <div className="text-xs text-gray-400 mt-0.5">{ind.description}</div>
                    </div>
                  </button>
                ))}
            </div>

            {error && <p className="text-sm text-red-500">{error}</p>}
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={() => setStep(2)} disabled={isPending}>Back</Button>
              <Button onClick={() => industry && handleStep3(industry)} disabled={isPending || !industry} className="flex items-center gap-2">
                {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                Set Up Accounts <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}

        {/* ── Step 4: First Tax Code ── */}
        {step === 4 && (
          <div className="flex flex-col gap-5 bg-white rounded-2xl border border-gray-200 p-6">
            <div>
              <h2 className="text-base font-semibold text-gray-900 mb-1">Add your first tax code</h2>
              <p className="text-sm text-gray-500">
                {selectedCountry === 'CA'
                  ? 'Set up HST or GST to track sales tax on transactions.'
                  : 'Set up sales tax to track tax on transactions.'}
                {' '}You can add more tax codes later.
              </p>
            </div>

            <div className="rounded-lg bg-[#F0FAF6] border border-[#C3E8D8] px-4 py-3 text-sm text-[#0F6E56]">
              Tax codes are applied during transaction classification. They split the net amount and tax into separate journal lines automatically.
            </div>

            <div className="grid grid-cols-1 gap-2">
              {(TAX_PRESETS[selectedCountry ?? 'CA'] ?? []).map((preset) => (
                <button key={preset.code} onClick={() => setTaxPreset(preset.code)}
                  className={['flex items-center justify-between p-3.5 rounded-xl border-2 transition-all text-left bg-white hover:border-[#0F6E56]',
                    taxPreset === preset.code ? 'border-[#0F6E56] ring-2 ring-[#0F6E56]/10' : 'border-gray-200'].join(' ')}>
                  <div>
                    <div className="text-sm font-medium text-gray-900">{preset.name}</div>
                    <div className="text-xs text-gray-400">{preset.code} · {(preset.rate * 100).toFixed(2)}%</div>
                  </div>
                  {taxPreset === preset.code && <CheckCircle2 className="w-4 h-4 text-[#0F6E56]" />}
                </button>
              ))}
            </div>

            <p className="text-xs text-gray-400">
              Note: Tax code creation requires a tax liability account. You can add tax codes from Settings → Tax Codes after your accounts are set up.
            </p>

            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={skipStep4} disabled={isPending}>Skip for now</Button>
              <Button onClick={skipStep4} disabled={isPending} className="flex items-center gap-2">
                Continue <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}

        {/* ── Step 5: Connect Bank ── */}
        {step === 5 && (
          <div className="flex flex-col gap-5 bg-white rounded-2xl border border-gray-200 p-6">
            <div>
              <h2 className="text-base font-semibold text-gray-900 mb-1">Connect your bank account</h2>
              <p className="text-sm text-gray-500">
                Link your bank to auto-import transactions. Powered by Plaid — secure and read-only.
              </p>
            </div>

            <div className="rounded-xl border border-gray-100 bg-gray-50 p-5 flex flex-col items-center gap-3 text-center">
              <div className="text-3xl">🏦</div>
              <div>
                <p className="text-sm font-medium text-gray-900">Secure bank connection via Plaid</p>
                <p className="text-xs text-gray-500 mt-1">Works with 12,000+ financial institutions in Canada and the US.</p>
              </div>
              <Button onClick={() => handleComplete('/banks')} disabled={isPending} className="flex items-center gap-2 w-full justify-center">
                {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                Connect Bank →
              </Button>
            </div>

            <div className="text-center">
              <button onClick={() => handleComplete('/dashboard')} disabled={isPending}
                className="text-sm text-gray-400 hover:text-gray-600 underline underline-offset-2 transition-colors disabled:opacity-50">
                Skip for now — go to Dashboard
              </button>
            </div>

            {error && <p className="text-sm text-red-500 text-center">{error}</p>}
          </div>
        )}

        <p className="text-center mt-6 text-xs text-gray-400">
          You can change your mode and settings at any time from the Settings page.
        </p>
      </div>
    </div>
  );
}
