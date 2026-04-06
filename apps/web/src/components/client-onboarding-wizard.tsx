'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient, Province } from '@/app/(accountant)/accountant/clients/new/actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { CheckCircle2, ChevronRight, ChevronLeft, Loader2 } from 'lucide-react';

interface WizardProps {
  provinces: Province[];
}

interface FormData {
  // Step 1
  name: string;
  businessType: 'sole_prop' | 'corp' | 'partnership';
  country: 'CA' | 'US';
  // Step 2 (CA only)
  province_code: string;
  hst_registration_number: string;
  hst_reporting_frequency: 'monthly' | 'quarterly' | 'annual';
  // Step 3
  seedTemplate: 'standard_ca' | 'standard_us' | 'blank';
  // Step 4
  clientEmail: string;
  clientFirstName: string;
}

const TOTAL_STEPS = 4;

const businessTypeOptions = [
  { value: 'sole_prop',   label: 'Sole Proprietorship', desc: 'Single owner, unincorporated' },
  { value: 'corp',        label: 'Corporation',          desc: 'Incorporated business entity' },
  { value: 'partnership', label: 'Partnership',          desc: 'Two or more owners' },
] as const;

const seedTemplateOptions = [
  { value: 'standard_ca', label: 'Standard Canada',       desc: 'Full chart of accounts for Canadian businesses including HST/GST accounts' },
  { value: 'standard_us', label: 'Standard United States', desc: 'Full chart of accounts for US businesses including sales tax accounts' },
  { value: 'blank',       label: 'Blank',                  desc: 'Start with no accounts — add them manually' },
] as const;

const frequencyOptions = [
  { value: 'monthly',   label: 'Monthly' },
  { value: 'quarterly', label: 'Quarterly' },
  { value: 'annual',    label: 'Annual' },
] as const;

export function ClientOnboardingWizard({ provinces }: WizardProps) {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState<FormData>({
    name: '',
    businessType: 'sole_prop',
    country: 'CA',
    province_code: '',
    hst_registration_number: '',
    hst_reporting_frequency: 'quarterly',
    seedTemplate: 'standard_ca',
    clientEmail: '',
    clientFirstName: '',
  });

  function update(patch: Partial<FormData>) {
    setForm((prev) => ({ ...prev, ...patch }));
  }

  // Step 2 is skipped for US businesses
  function nextStep() {
    if (step === 1 && form.country === 'US') {
      update({ seedTemplate: 'standard_us' });
      setStep(3);
    } else {
      setStep((s) => Math.min(s + 1, TOTAL_STEPS));
    }
  }

  function prevStep() {
    if (step === 3 && form.country === 'US') {
      setStep(1);
    } else {
      setStep((s) => Math.max(s - 1, 1));
    }
  }

  // Effective step count for progress bar (US skips step 2)
  const effectiveTotal = form.country === 'US' ? 3 : 4;
  const effectiveStep  = step === 3 ? (form.country === 'US' ? 2 : 3)
                       : step === 4 ? (form.country === 'US' ? 3 : 4)
                       : step;

  async function handleFinish(sendInvite: boolean) {
    setError(null);
    setSubmitting(true);
    try {
      const result = await createClient({
        name:           form.name,
        businessType:   form.businessType,
        country:        form.country,
        province_code:  form.province_code || undefined,
        hst_registration_number: form.hst_registration_number || undefined,
        hst_reporting_frequency: form.hst_reporting_frequency || undefined,
        seedTemplate:   form.seedTemplate,
        clientEmail:    sendInvite && form.clientEmail ? form.clientEmail : undefined,
        clientFirstName: sendInvite && form.clientFirstName ? form.clientFirstName : undefined,
      });
      if (!result.success) {
        setError(result.error ?? 'Failed to create client');
        setSubmitting(false);
        return;
      }
      router.push('/accountant/clients');
    } catch {
      setError('An unexpected error occurred');
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Progress */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>Step {effectiveStep} of {effectiveTotal}</span>
          <span>{Math.round((effectiveStep / effectiveTotal) * 100)}% complete</span>
        </div>
        <div className="h-1.5 bg-muted rounded-full overflow-hidden">
          <div
            className="h-full bg-primary rounded-full transition-all duration-300"
            style={{ width: `${(effectiveStep / effectiveTotal) * 100}%` }}
          />
        </div>
      </div>

      {/* Step content */}
      <Card>
        <CardContent className="pt-6 space-y-6">

          {/* ── Step 1: Business Details ──────────────────────────────── */}
          {step === 1 && (
            <div className="space-y-5">
              <h2 className="text-lg font-semibold text-foreground">Business Details</h2>

              <div className="space-y-2">
                <Label htmlFor="name">Business Name</Label>
                <Input
                  id="name"
                  placeholder="e.g. Acme Corporation"
                  value={form.name}
                  onChange={(e) => update({ name: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label>Business Type</Label>
                <div className="grid gap-2">
                  {businessTypeOptions.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => update({ businessType: opt.value })}
                      className={cn(
                        'flex items-center justify-between px-4 py-3 rounded-lg border text-left transition-colors',
                        form.businessType === opt.value
                          ? 'border-primary bg-primary/5'
                          : 'border-border hover:border-muted-foreground',
                      )}
                    >
                      <div>
                        <div className="text-sm font-medium text-foreground">{opt.label}</div>
                        <div className="text-xs text-muted-foreground">{opt.desc}</div>
                      </div>
                      {form.businessType === opt.value && (
                        <CheckCircle2 className="w-4 h-4 text-primary flex-shrink-0" />
                      )}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label>Country</Label>
                <div className="grid grid-cols-2 gap-2">
                  {(['CA', 'US'] as const).map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => update({ country: c })}
                      className={cn(
                        'flex items-center justify-center gap-2 px-4 py-3 rounded-lg border text-sm font-medium transition-colors',
                        form.country === c
                          ? 'border-primary bg-primary/5 text-foreground'
                          : 'border-border text-muted-foreground hover:border-muted-foreground',
                      )}
                    >
                      {c === 'CA' ? '🇨🇦 Canada' : '🇺🇸 United States'}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ── Step 2: Tax Settings (CA only) ────────────────────────── */}
          {step === 2 && (
            <div className="space-y-5">
              <div>
                <h2 className="text-lg font-semibold text-foreground">Canadian Tax Settings</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Optional — you can update these later in the client's settings.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="province">Province / Territory</Label>
                <select
                  id="province"
                  value={form.province_code}
                  onChange={(e) => update({ province_code: e.target.value })}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
                >
                  <option value="">— Select province —</option>
                  {provinces.map((p) => (
                    <option key={p.province_code} value={p.province_code}>
                      {p.province_name} ({p.province_code})
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="hst">HST / GST Registration Number</Label>
                <Input
                  id="hst"
                  placeholder="e.g. 123456789RT0001"
                  value={form.hst_registration_number}
                  onChange={(e) => update({ hst_registration_number: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label>Reporting Frequency</Label>
                <div className="grid grid-cols-3 gap-2">
                  {frequencyOptions.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => update({ hst_reporting_frequency: opt.value })}
                      className={cn(
                        'px-3 py-2 rounded-lg border text-sm font-medium transition-colors',
                        form.hst_reporting_frequency === opt.value
                          ? 'border-primary bg-primary/5 text-foreground'
                          : 'border-border text-muted-foreground hover:border-muted-foreground',
                      )}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ── Step 3: Chart of Accounts Seed ───────────────────────── */}
          {step === 3 && (
            <div className="space-y-5">
              <div>
                <h2 className="text-lg font-semibold text-foreground">Chart of Accounts</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Choose a starting template for this client's chart of accounts.
                </p>
              </div>

              <div className="grid gap-2">
                {seedTemplateOptions.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => update({ seedTemplate: opt.value })}
                    className={cn(
                      'flex items-center justify-between px-4 py-3 rounded-lg border text-left transition-colors',
                      form.seedTemplate === opt.value
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:border-muted-foreground',
                    )}
                  >
                    <div>
                      <div className="text-sm font-medium text-foreground">{opt.label}</div>
                      <div className="text-xs text-muted-foreground">{opt.desc}</div>
                    </div>
                    {form.seedTemplate === opt.value && (
                      <CheckCircle2 className="w-4 h-4 text-primary flex-shrink-0" />
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ── Step 4: Client Invite (Optional) ─────────────────────── */}
          {step === 4 && (
            <div className="space-y-5">
              <div>
                <h2 className="text-lg font-semibold text-foreground">Invite Client</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Optionally send your client an email invitation to access their books.
                  You can skip this and invite them later.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="clientEmail">Client Email Address</Label>
                <Input
                  id="clientEmail"
                  type="email"
                  placeholder="client@example.com"
                  value={form.clientEmail}
                  onChange={(e) => update({ clientEmail: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="clientFirstName">Client First Name <span className="text-muted-foreground">(optional)</span></Label>
                <Input
                  id="clientFirstName"
                  placeholder="e.g. Jane"
                  value={form.clientFirstName}
                  onChange={(e) => update({ clientFirstName: e.target.value })}
                />
              </div>
            </div>
          )}

          {/* Error */}
          {error && (
            <p className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-md">{error}</p>
          )}
        </CardContent>
      </Card>

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          onClick={step === 1 ? () => router.push('/accountant/clients') : prevStep}
          disabled={submitting}
        >
          <ChevronLeft className="w-4 h-4 mr-1" />
          {step === 1 ? 'Cancel' : 'Back'}
        </Button>

        <div className="flex gap-2">
          {step < TOTAL_STEPS ? (
            <Button
              onClick={nextStep}
              disabled={step === 1 && !form.name.trim()}
            >
              Next
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          ) : (
            <>
              <Button
                variant="outline"
                onClick={() => handleFinish(false)}
                disabled={submitting}
              >
                {submitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                Skip &amp; Finish
              </Button>
              <Button
                onClick={() => handleFinish(true)}
                disabled={submitting || !form.clientEmail.trim()}
              >
                {submitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                Send Invite &amp; Finish
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
