'use client';

import { useState, useTransition, useEffect } from 'react';
import {
  saveModeAndCountry,
  saveBusinessDetails,
  seedAccounts,
  createFirstTaxCode,
  completeOnboarding,
  acceptLegalDocuments,
  fetchLegalAcceptanceStatus,
} from './actions';
import { toastSuccess, toastError } from '@/lib/toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CheckCircle2, ChevronRight, Loader2, Building2, ShieldCheck } from 'lucide-react';
import { LEGAL_VERSIONS } from '@/lib/legal-versions';

type Mode    = 'business' | 'freelancer' | 'personal';
type Country = 'CA' | 'US';

type LegalDocType =
  | 'terms_of_service'
  | 'terms_of_use'
  | 'privacy_policy'
  | 'cookie_policy';

interface LegalDoc {
  key: LegalDocType;
  label: string;
  linkLabel: string;
  href: string;
}

const LEGAL_DOCS: LegalDoc[] = [
  { key: 'terms_of_service', label: 'I have read and agree to the',  linkLabel: 'Terms of Service', href: '/terms'        },
  { key: 'terms_of_use',     label: 'I have read and agree to the',  linkLabel: 'Terms of Use',     href: '/terms-of-use' },
  { key: 'privacy_policy',   label: 'I have read and reviewed the',  linkLabel: 'Privacy Policy',   href: '/privacy'      },
  { key: 'cookie_policy',    label: 'I acknowledge the',             linkLabel: 'Cookie Policy',    href: '/cookies'      },
];

const TOTAL_STEPS = 6;

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
  { id: 'general',      label: 'General / Other',        icon: '📋', description: 'Standard chart of accounts for any business' },
  { id: 'services',     label: 'Professional Services',  icon: '💼', description: 'Consulting, legal, accounting, IT services' },
  { id: 'retail',       label: 'Retail',                 icon: '🛒', description: 'Inventory, cost of goods sold, sales' },
  { id: 'construction', label: 'Construction',           icon: '🏗️', description: 'WIP, contract revenue, subcontractors' },
  { id: 'restaurant',   label: 'Restaurant / Food',      icon: '🍽️', description: 'Food & beverage, kitchen labor, catering' },
  { id: 'freelancer',   label: 'Freelancer',             icon: '🧑‍💻', description: 'Home office, tools, mileage, consulting revenue' },
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

/* ── Progress Bar ─────────────────────────────────────────────────────────── */
function ProgressBar({ step }: { step: number }) {
  return (
    <div className="flex items-center gap-2 mb-8">
      {Array.from({ length: TOTAL_STEPS }, (_, i) => i + 1).map((s) => (
        <div key={s} className="flex items-center gap-2">
          <div className={[
            'w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold transition-all',
            s < step   ? 'bg-[#0F6E56] text-white' :
            s === step ? 'bg-[#0F6E56] text-white ring-4 ring-[#0F6E56]/20' :
            'bg-gray-200 text-gray-500',
          ].join(' ')}>
            {s < step ? <CheckCircle2 className="w-4 h-4" /> : s}
          </div>
          {s < TOTAL_STEPS && (
            <div className={`h-0.5 w-6 rounded transition-all ${s < step ? 'bg-[#0F6E56]' : 'bg-gray-200'}`} />
          )}
        </div>
      ))}
      <span className="ml-2 text-xs text-gray-400">Step {step} of {TOTAL_STEPS}</span>
    </div>
  );
}

/* ── Legal Checkbox ───────────────────────────────────────────────────────── */
function LegalCheckbox({
  doc,
  checked,
  preChecked,
  onChange,
}: {
  doc: LegalDoc;
  checked: boolean;
  preChecked: boolean;
  onChange: (val: boolean) => void;
}) {
  return (
    <label
      className={[
        'flex items-start gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all select-none',
        checked
          ? 'border-[#0F6E56] bg-[#EDF7F2] dark:bg-primary/10'
          : 'border-border bg-card hover:border-[#0F6E56]/50',
      ].join(' ')}
    >
      {/* Checkbox */}
      <div className="relative flex-shrink-0 mt-0.5">
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          className="sr-only"
        />
        <div
          className={[
            'w-5 h-5 rounded flex items-center justify-center border-2 transition-all',
            checked ? 'bg-[#0F6E56] border-[#0F6E56]' : 'bg-background border-border',
          ].join(' ')}
        >
          {checked && (
            <svg viewBox="0 0 12 12" className="w-3 h-3 text-white" fill="none"
              stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="2,6 5,9 10,3" />
            </svg>
          )}
        </div>
      </div>

      {/* Label */}
      <div className="text-sm text-foreground leading-relaxed">
        <span>{doc.label} </span>
        <a
          href={doc.href}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="text-[#0F6E56] underline underline-offset-2 hover:text-[#085041] font-medium"
        >
          {doc.linkLabel}
        </a>
        {preChecked && (
          <span className="ml-2 inline-flex items-center gap-1 text-xs text-[#0F6E56] font-medium">
            <CheckCircle2 className="w-3 h-3" />
            Previously accepted
          </span>
        )}
      </div>
    </label>
  );
}

/* ── Main Wizard ──────────────────────────────────────────────────────────── */
export default function OnboardingPage() {
  const [step, setStep]              = useState(1);
  const [isPending, startTransition] = useTransition();

  const [selectedMode,    setSelectedMode]    = useState<Mode | null>(null);
  const [selectedCountry, setSelectedCountry] = useState<Country | null>(null);
  const [businessName,    setBusinessName]    = useState('');
  const [currency,        setCurrency]        = useState('');
  const [fiscalYearEnd,   setFiscalYearEnd]   = useState('');
  const [industry,        setIndustry]        = useState('');
  const [accountsSeeded,  setAccountsSeeded]  = useState(false);
  const [taxPreset,       setTaxPreset]       = useState('');
  const [taxAccountId]                        = useState('');
  const [error,           setError]           = useState<string | null>(null);

  // Legal step state
  const [legalChecks, setLegalChecks] = useState<Record<LegalDocType, boolean>>({
    terms_of_service: false,
    terms_of_use:     false,
    privacy_policy:   false,
    cookie_policy:    false,
  });
  const [preChecked, setPreChecked] = useState<Record<LegalDocType, boolean>>({
    terms_of_service: false,
    terms_of_use:     false,
    privacy_policy:   false,
    cookie_policy:    false,
  });
  const [legalLoading, setLegalLoading] = useState(false);

  const allLegalChecked = LEGAL_DOCS.every((d) => legalChecks[d.key]);

  // When user reaches step 5, pre-check any already-accepted docs
  useEffect(() => {
    if (step !== 5) return;
    setLegalLoading(true);
    fetchLegalAcceptanceStatus().then((status) => {
      if (!status.error && status.documents.length > 0) {
        const newChecks = { ...legalChecks };
        const newPreChecked = { ...preChecked };
        status.documents.forEach((doc) => {
          const key = doc.document_type as LegalDocType;
          if (doc.is_current) {
            newChecks[key] = true;
            newPreChecked[key] = true;
          }
        });
        setLegalChecks(newChecks);
        setPreChecked(newPreChecked);
      }
      setLegalLoading(false);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  function handleStep1() {
    if (!selectedMode || !selectedCountry) { setError('Please select a mode and country.'); return; }
    setError(null);
    startTransition(async () => {
      const result = await saveModeAndCountry(selectedMode, selectedCountry);
      if (result.error) { setError(result.error); toastError('Could not save', result.error); return; }
      if (!currency) setCurrency(selectedCountry === 'CA' ? 'CAD' : 'USD');
      toastSuccess('Mode selected', `${selectedMode} mode · ${selectedCountry}`);
      setStep(2);
    });
  }

  function handleStep2() {
    if (!businessName.trim()) { setError('Business name is required.'); return; }
    setError(null);
    startTransition(async () => {
      const result = await saveBusinessDetails({
        name: businessName.trim(),
        currency_code:   currency || (selectedCountry === 'CA' ? 'CAD' : 'USD'),
        fiscal_year_end: fiscalYearEnd || undefined,
      });
      if (result.error) { setError(result.error); toastError('Could not save', result.error); return; }
      toastSuccess('Business details saved');
      setStep(3);
    });
  }

  function handleStep3(chosenIndustry: string) {
    setError(null);
    startTransition(async () => {
      const result = await seedAccounts(chosenIndustry);
      if (result.error) { setError(result.error); toastError('Could not seed accounts', result.error); return; }
      setAccountsSeeded(true);
      const msg = result.skipped ? 'Accounts already set up' : `${result.seeded} accounts created`;
      toastSuccess('Chart of accounts ready', msg);
      setStep(selectedMode === 'personal' ? 5 : 4);
    });
  }

  function skipStep4() {
    toastSuccess('Tax code skipped', 'You can add tax codes later in Settings.');
    setStep(5);
  }

  function handleStep5() {
    if (!allLegalChecked) { setError('Please accept all agreements to continue.'); return; }
    setError(null);
    startTransition(async () => {
      const documents = LEGAL_DOCS.map((doc) => ({
        document_type:     doc.key,
        document_version:  LEGAL_VERSIONS[doc.key],
        acceptance_source: 'onboarding',
      }));
      const result = await acceptLegalDocuments(documents);
      if (result.error) { setError(result.error); toastError('Could not record agreements', result.error); return; }
      toastSuccess('Agreements accepted', 'You\'re all set!');
      setStep(6);
    });
  }

  function handleComplete(destination: '/dashboard' | '/banks') {
    setError(null);
    startTransition(async () => {
      await completeOnboarding(destination);
    });
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="w-full max-w-3xl">

        {/* Logo + Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-[#0F6E56] mb-3">
            <svg viewBox="0 0 16 16" className="w-7 h-7">
              <rect x="1"   y="10" width="3" height="5"  rx="0.5" fill="white" opacity="0.5"/>
              <rect x="6.5" y="7"  width="3" height="8"  rx="0.5" fill="white" opacity="0.75"/>
              <rect x="12"  y="3"  width="3" height="12" rx="0.5" fill="white"/>
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-foreground">Welcome to Tempo</h1>
          <p className="text-muted-foreground mt-1 text-sm">Let's set up your account in a few steps.</p>
        </div>

        <ProgressBar step={step} />

        {/* ── Step 1: Mode + Country ── */}
        {step === 1 && (
          <div className="flex flex-col gap-6">
            <div>
              <h2 className="text-base font-semibold text-gray-700 mb-3">How will you use Tempo?</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {MODE_CARDS.map((card) => {
                  const isSelected = selectedMode === card.id;
                  return (
                    <button key={card.id} onClick={() => setSelectedMode(card.id)}
                      className={['text-left p-5 rounded-xl border-2 transition-all bg-card hover:border-[#0F6E56]',
                        isSelected ? 'border-[#0F6E56] ring-2 ring-[#0F6E56]/10' : 'border-border'].join(' ')}>
                      <div className="text-2xl mb-2">{card.icon}</div>
                      <div className="font-semibold text-sm text-foreground mb-0.5">{card.title}</div>
                      <div className="text-xs text-muted-foreground mb-3">{card.subtitle}</div>
                      <ul className="space-y-0.5">
                        {card.features.map((f) => (
                          <li key={f} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <span className={isSelected ? 'text-[#0F6E56]' : 'text-gray-300'}>✓</span>{f}
                          </li>
                        ))}
                      </ul>
                      {isSelected && (
                        <div className="mt-3 text-xs font-medium text-[#0F6E56] flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" />Selected
                        </div>
                      )}
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
                    className={['flex items-center gap-3 p-3 rounded-xl border-2 transition-all bg-card hover:border-[#0F6E56]',
                      selectedCountry === c ? 'border-[#0F6E56] ring-2 ring-[#0F6E56]/10' : 'border-border'].join(' ')}>
                    <span className="text-xl">{c === 'CA' ? '🇨🇦' : '🇺🇸'}</span>
                    <div className="text-left">
                      <div className="font-semibold text-sm text-foreground">{c === 'CA' ? 'Canada' : 'United States'}</div>
                      <div className="text-xs text-muted-foreground">{c === 'CA' ? 'CAD · CRA' : 'USD · IRS'}</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}
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
          <div className="flex flex-col gap-5 bg-card rounded-2xl border border-border p-6">
            <div className="flex items-center gap-2">
              <Building2 className="w-5 h-5 text-[#0F6E56]" />
              <h2 className="text-base font-semibold text-foreground">Tell us about your business</h2>
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
                  className="text-sm border border-border rounded-lg px-3 py-2 outline-none focus:border-[#0F6E56] bg-background text-foreground">
                  <option value="CAD">CAD – Canadian Dollar</option>
                  <option value="USD">USD – US Dollar</option>
                  <option value="EUR">EUR – Euro</option>
                  <option value="GBP">GBP – British Pound</option>
                </select>
              </div>
              {selectedMode !== 'personal' && (
                <div className="flex flex-col gap-1.5">
                  <Label>Fiscal Year End <span className="text-muted-foreground font-normal">(optional)</span></Label>
                  <Input type="date" value={fiscalYearEnd} onChange={(e) => setFiscalYearEnd(e.target.value)} />
                </div>
              )}
            </div>

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

        {/* ── Step 3: Seed Accounts ── */}
        {step === 3 && (
          <div className="flex flex-col gap-5 bg-card rounded-2xl border border-border p-6">
            <div>
              <h2 className="text-base font-semibold text-foreground mb-1">Set up your chart of accounts</h2>
              <p className="text-sm text-muted-foreground">We'll create the right accounts for your industry.</p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {INDUSTRIES
                .filter((ind) => selectedMode === 'freelancer' ? ind.id !== 'retail' && ind.id !== 'restaurant' : true)
                .map((ind) => (
                  <button key={ind.id} onClick={() => setIndustry(ind.id)}
                    className={['flex items-start gap-3 p-3.5 rounded-xl border-2 transition-all text-left bg-card hover:border-[#0F6E56]',
                      industry === ind.id ? 'border-[#0F6E56] ring-2 ring-[#0F6E56]/10' : 'border-border'].join(' ')}>
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

        {/* ── Step 4: First Tax Code ── */}
        {step === 4 && (
          <div className="flex flex-col gap-5 bg-card rounded-2xl border border-border p-6">
            <div>
              <h2 className="text-base font-semibold text-foreground mb-1">Add your first tax code</h2>
              <p className="text-sm text-muted-foreground">
                {selectedCountry === 'CA'
                  ? 'Set up HST or GST to track sales tax on transactions.'
                  : 'Set up sales tax to track tax on transactions.'}
                {' '}You can add more tax codes later.
              </p>
            </div>

            <div className="rounded-lg bg-[#EDF7F2] dark:bg-primary/10 border border-[#C3E8D8] dark:border-primary/30 px-4 py-3 text-sm text-[#0F6E56] dark:text-primary">
              Tax codes are applied during transaction classification. They split the net amount and tax into separate journal lines automatically.
            </div>

            <div className="grid grid-cols-1 gap-2">
              {(TAX_PRESETS[selectedCountry ?? 'CA'] ?? []).map((preset) => (
                <button key={preset.code} onClick={() => setTaxPreset(preset.code)}
                  className={['flex items-center justify-between p-3.5 rounded-xl border-2 transition-all text-left bg-card hover:border-[#0F6E56]',
                    taxPreset === preset.code ? 'border-[#0F6E56] ring-2 ring-[#0F6E56]/10' : 'border-border'].join(' ')}>
                  <div>
                    <div className="text-sm font-medium text-foreground">{preset.name}</div>
                    <div className="text-xs text-muted-foreground">{preset.code} · {(preset.rate * 100).toFixed(2)}%</div>
                  </div>
                  {taxPreset === preset.code && <CheckCircle2 className="w-4 h-4 text-[#0F6E56]" />}
                </button>
              ))}
            </div>

            <p className="text-xs text-muted-foreground">
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

        {/* ── Step 5: Legal Agreements ── */}
        {step === 5 && (
          <div className="flex flex-col gap-5 bg-card rounded-2xl border border-border p-6">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-[#0F6E56]" />
              <h2 className="text-base font-semibold text-foreground">Review and accept our agreements</h2>
            </div>

            <p className="text-sm text-muted-foreground">
              Please read and accept the following agreements before accessing Tempo. Links open in a new tab.
            </p>

            {legalLoading ? (
              <div className="flex items-center justify-center py-8 gap-2 text-muted-foreground">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="text-sm">Checking previous agreements…</span>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {LEGAL_DOCS.map((doc) => (
                  <LegalCheckbox
                    key={doc.key}
                    doc={doc}
                    checked={legalChecks[doc.key]}
                    preChecked={preChecked[doc.key]}
                    onChange={(val) => setLegalChecks((prev) => ({ ...prev, [doc.key]: val }))}
                  />
                ))}
              </div>
            )}

            {!allLegalChecked && !legalLoading && (
              <p className="text-xs text-muted-foreground">
                All four agreements must be accepted to continue.
              </p>
            )}

            {error && <p className="text-sm text-destructive">{error}</p>}

            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={() => setStep(selectedMode === 'personal' ? 3 : 4)} disabled={isPending}>
                Back
              </Button>
              <Button
                onClick={handleStep5}
                disabled={isPending || !allLegalChecked || legalLoading}
                className="flex items-center gap-2"
              >
                {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                Accept & Continue <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}

        {/* ── Step 6: Connect Bank ── */}
        {step === 6 && (
          <div className="flex flex-col gap-5 bg-card rounded-2xl border border-border p-6">
            <div>
              <h2 className="text-base font-semibold text-foreground mb-1">Connect your bank account</h2>
              <p className="text-sm text-muted-foreground">
                Link your bank to auto-import transactions. Powered by Plaid — secure and read-only.
              </p>
            </div>

            <div className="rounded-xl border border-border bg-muted p-5 flex flex-col items-center gap-3 text-center">
              <div className="text-3xl">🏦</div>
              <div>
                <p className="text-sm font-medium text-foreground">Secure bank connection via Plaid</p>
                <p className="text-xs text-muted-foreground mt-1">Works with 12,000+ financial institutions in Canada and the US.</p>
              </div>
              <Button onClick={() => handleComplete('/banks')} disabled={isPending} className="flex items-center gap-2 w-full justify-center">
                {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                Connect Bank →
              </Button>
            </div>

            <div className="text-center">
              <button onClick={() => handleComplete('/dashboard')} disabled={isPending}
                className="text-sm text-muted-foreground hover:text-foreground underline underline-offset-2 transition-colors disabled:opacity-50">
                Skip for now — go to Dashboard
              </button>
            </div>

            {error && <p className="text-sm text-destructive text-center">{error}</p>}
          </div>
        )}

        <p className="text-center mt-6 text-xs text-muted-foreground">
          You can change your mode and settings at any time from the Settings page.
        </p>
      </div>
    </div>
  );
}
