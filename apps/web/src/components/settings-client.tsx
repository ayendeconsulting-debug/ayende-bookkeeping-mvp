'use client';
import { AccountantAccessSection } from '@/components/accountant-access-section';

import Link from 'next/link';
import { useState, useTransition } from 'react';
import { UserProfile } from '@clerk/nextjs';
import type { SubscriptionStatusUI } from '@/lib/subscription-types';
import {
  Settings, Building2, User, ShieldCheck,
  CheckCircle2, AlertCircle, Loader2, Save, RefreshCw, DollarSign,
  Sun, Moon, CreditCard, ExternalLink, Receipt,
  XCircle, Download,
} from 'lucide-react';
import { AdminOnly } from '@/components/admin-only';
import { toastSuccess, toastError } from '@/lib/toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useTheme } from '@/components/theme-provider';
import {
  updateBusinessSettings, verifyAccountingIntegrity, getCurrencyRates,
  createPortalSession, updateTaxSettings,
} from '@/app/(app)/settings/actions';

interface Province { id: string; province_code: string; province_name: string; hst_rate: number | null; gst_rate: number; is_hst_province: boolean; }
interface Business { id: string; name: string; legal_name?: string; tax_id?: string; currency_code: string; fiscal_year_end: string; created_at: string; province_code?: string | null; hst_registration_number?: string | null; hst_reporting_frequency?: 'monthly' | 'quarterly' | 'annual' | null; }
interface Subscription { status: SubscriptionStatusUI; plan: 'starter' | 'pro' | 'accountant' | null; billing_cycle: 'monthly' | 'annual' | null; trial_ends_at: string | null; current_period_end: string | null; days_remaining: number | null; mbg_ends_at?: string | null; readonly_started_at?: string | null; stripe_customer_id?: string | null; }
interface SettingsClientProps { business: Business | null; subscription: Subscription | null; provinces: Province[]; }

const selectCls = 'text-sm border border-border rounded-lg px-3 py-2 outline-none focus:border-accent-teal bg-background text-foreground';

function StatusBadge({ status }: { status: Subscription['status'] }) {
  const config: Record<string, { label: string; className: string }> = {
    trialing:  { label: 'Trial',     className: 'bg-accent-blue-muted text-accent-blue border-accent-blue/30' },
    active:    { label: 'Active',    className: 'bg-accent-teal-muted text-accent-teal border-accent-teal/30' },
    past_due:  { label: 'Past Due',  className: 'bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400 border-amber-200 dark:border-amber-800' },
    cancelled: { label: 'Cancelled', className: 'bg-red-50 text-red-700 dark:bg-red-950/30 dark:text-red-400 border-red-200 dark:border-red-800' },
    none:      { label: 'No plan',   className: 'bg-muted text-muted-foreground border-border' },
    trial_expired_readonly: { label: 'Read-only', className: 'bg-red-50 text-red-700 dark:bg-red-950/30 dark:text-red-400 border-red-200 dark:border-red-800' },
    archived:  { label: 'Archived',  className: 'bg-muted text-muted-foreground border-border' },
  };
  const { label, className } = config[status] ?? config.none;
  return <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${className}`}>{label}</span>;
}

function BillingSection({ subscription }: { subscription: Subscription | null }) {
  const [loading, startLoading] = useTransition();
  const [error, setError]       = useState<string | null>(null);

  function handleManage() {
    setError(null);
    startLoading(async () => {
      const result = await createPortalSession();
      if (result.success && result.url) window.open(result.url, '_blank', 'noopener,noreferrer');
      else { const msg = result.error ?? 'Could not open billing portal.'; setError(msg); toastError('Billing portal error', msg); }
    });
  }

  const planLabel: Record<string, string> = { starter: 'Personal', pro: 'Pro', accountant: 'Accountant' };
  const formatDate = (iso: string | null) => iso ? new Date(iso).toLocaleDateString('en-CA', { year: 'numeric', month: 'long', day: 'numeric' }) : '–';
  const status = subscription?.status ?? 'none'; const plan = subscription?.plan ?? null;
  const billingCycle = subscription?.billing_cycle ?? null; const trialEndsAt = subscription?.trial_ends_at ?? null;
  const periodEnd = subscription?.current_period_end ?? null; const daysLeft = subscription?.days_remaining ?? null;
  const readonlyStartedAt = subscription?.readonly_started_at ?? null;
  const stripeCustomerId  = subscription?.stripe_customer_id ?? null;

  // Phase 27.2 S4 A-12.3 + A-12.4 derived flags
  const hasStripeCustomer = Boolean(stripeCustomerId);
  const isAccountant      = plan === 'accountant';
  const isPreCardTrial    = status === 'trialing' && !hasStripeCustomer;
  const isReadonly        = status === 'trial_expired_readonly';
  const isArchived        = status === 'archived';

  // 90-day archive countdown for readonly state
  const archiveDaysLeft = (() => {
    if (!isReadonly || !readonlyStartedAt) return null;
    const start = new Date(readonlyStartedAt);
    if (Number.isNaN(start.getTime())) return null;
    const archiveAt = start.getTime() + 90 * 24 * 60 * 60 * 1000;
    return Math.max(0, Math.ceil((archiveAt - Date.now()) / (24 * 60 * 60 * 1000)));
  })();

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between pb-4">
        <div className="flex items-center gap-2"><CreditCard className="w-4 h-4 text-muted-foreground" /><CardTitle>Billing</CardTitle></div>
        <StatusBadge status={status} />
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-muted rounded-lg px-4 py-3">
            <p className="text-xs text-muted-foreground mb-1">Plan</p>
            <p className="text-sm font-medium text-foreground">{plan ? `${planLabel[plan]} – ${billingCycle === 'annual' ? 'Annual' : 'Monthly'}` : '–'}</p>
          </div>
          <div className="bg-muted rounded-lg px-4 py-3">
            <p className="text-xs text-muted-foreground mb-1">Status</p>
            <p className="text-sm font-medium text-foreground capitalize">{status === 'none' ? 'No active plan' : status.replace('_', ' ')}</p>
          </div>
          {status === 'trialing' && trialEndsAt && (
            <div className="bg-blue-50 dark:bg-[#494C4F] border border-blue-200 dark:border-[#60A5FA]/40 rounded-lg px-4 py-3 col-span-2">
              <p className="text-xs text-blue-600 dark:text-[#60A5FA] mb-1">Trial ends</p>
              <p className="text-sm font-medium text-blue-800 dark:text-[#60A5FA]">
                {formatDate(trialEndsAt)}{daysLeft !== null && <span className="text-xs font-normal ml-2">({daysLeft} day{daysLeft !== 1 ? 's' : ''} remaining)</span>}
              </p>
            </div>
          )}
          {status === 'active' && periodEnd && (
            <div className="bg-muted rounded-lg px-4 py-3 col-span-2">
              <p className="text-xs text-muted-foreground mb-1">Next billing date</p>
              <p className="text-sm font-medium text-foreground">{formatDate(periodEnd)}</p>
            </div>
          )}
          {status === 'past_due' && (
            <div className="bg-amber-50 dark:bg-[#494C4F] border border-amber-200 dark:border-[#FBFB47]/40 rounded-lg px-4 py-3 col-span-2">
              <p className="text-xs text-amber-700 dark:text-[#FBFB47] font-medium">⚠️ Payment past due — update your payment method to avoid losing access.</p>
            </div>
          )}
          {status === 'cancelled' && (
            <div className="bg-red-50 dark:bg-[#01060B] border border-red-200 dark:border-[#FF3E3E]/40 rounded-lg px-4 py-3 col-span-2">
              <p className="text-xs text-red-700 dark:text-[#FF3E3E] font-medium">Your subscription has been cancelled. Reactivate below to restore access.</p>
            </div>
          )}
          {/* Phase 27.2 S4 A-12.3: trial_expired_readonly callout */}
          {isReadonly && (
            <div className="bg-red-50 dark:bg-[#01060B] border border-red-200 dark:border-[#FF3E3E]/40 rounded-lg px-4 py-3 col-span-2">
              <p className="text-xs text-red-700 dark:text-[#FF3E3E] font-medium">
                Your trial ended.{' '}
                {archiveDaysLeft !== null && archiveDaysLeft > 0
                  ? `Read-only access for ${archiveDaysLeft} more day${archiveDaysLeft === 1 ? '' : 's'} before archive.`
                  : archiveDaysLeft === 0
                    ? 'Your account will be archived today.'
                    : 'Read-only access window active.'}
                {' '}Upgrade to restore full access, or export your data before archive.
              </p>
            </div>
          )}
          {/* Phase 27.2 S4 A-12.3: archived callout */}
          {isArchived && (
            <div className="bg-muted border border-border rounded-lg px-4 py-3 col-span-2">
              <p className="text-xs text-muted-foreground font-medium flex items-start gap-2">
                <XCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <span>Your account is archived. Bank connections have been disconnected. Contact support to restore access.</span>
              </p>
            </div>
          )}
        </div>
        {error && <div className="flex items-center gap-1.5 text-sm text-destructive"><AlertCircle className="w-4 h-4" />{error}</div>}
        {/* Phase 27.2 S4 A-12.3: action buttons — conditional by status */}
        <div className="flex flex-wrap justify-end gap-2">
          {/* Read-only: Upgrade primary + Export Data */}
          {isReadonly && (
            <Link href="/pricing"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold bg-red-600 text-white hover:bg-red-700 transition-colors">
              Upgrade to restore access
            </Link>
          )}
          {isReadonly && (
            <Link href="/reports"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold border border-border text-foreground hover:border-primary hover:text-primary transition-colors">
              <Download className="w-4 h-4" />
              Export your data
            </Link>
          )}
          {/* Pre-card trial (Starter/Pro): Upgrade primary */}
          {isPreCardTrial && !isAccountant && (
            <Link href="/pricing"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold bg-primary text-primary-foreground hover:bg-primary/90 transition-colors">
              Upgrade plan
            </Link>
          )}
          {/* Manage Subscription — disabled in pre-card, hidden in archived */}
          {!isArchived && (
            <Button
              variant="outline"
              onClick={handleManage}
              disabled={loading || isPreCardTrial}
              className="flex items-center gap-2"
              title={isPreCardTrial ? 'Upgrade your plan to set up billing.' : undefined}
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ExternalLink className="w-4 h-4" />}
              {loading ? 'Opening…' : 'Manage Subscription'}
            </Button>
          )}
          {/* Archived — contact support */}
          {isArchived && (
            <a
              href="mailto:hello@gettempo.ca"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold border border-border text-foreground hover:border-primary hover:text-primary transition-colors"
            >
              Contact support
            </a>
          )}
        </div>
        {/* Phase 27.2 S4 A-12.4: plan-specific footer copy */}
        {isPreCardTrial && !isAccountant ? (
          <p className="text-xs text-muted-foreground">You&apos;re on a free trial. Upgrade your plan to set up billing and access invoices.</p>
        ) : isArchived ? (
          <p className="text-xs text-muted-foreground">Your account has been archived. Contact support to restore access or recover data.</p>
        ) : isReadonly ? (
          <p className="text-xs text-muted-foreground">Your trial has ended. Upgrade to restore full access. Bank syncs are paused; data remains read-only until you upgrade.</p>
        ) : (
          <p className="text-xs text-muted-foreground">Manage your plan, update payment methods, and download invoices via the Stripe billing portal.</p>
        )}
      </CardContent>
    </Card>
  );
}

function TaxSettingsSection({ business, provinces }: { business: Business | null; provinces: Province[] }) {
  const [provinceCode, setProvinceCode] = useState(business?.province_code ?? '');
  const [hstNumber, setHstNumber]       = useState(business?.hst_registration_number ?? '');
  const [frequency, setFrequency]       = useState<'monthly' | 'quarterly' | 'annual'>(business?.hst_reporting_frequency ?? 'quarterly');
  const [saving, startSaving] = useTransition();
  const [error, setError]     = useState<string | null>(null);

  const selectedProvince = provinces.find((p) => p.province_code === provinceCode);
  const taxLabel = selectedProvince
    ? selectedProvince.is_hst_province ? `HST ${Math.round((selectedProvince.hst_rate ?? 0) * 100)}%` : `GST ${Math.round(selectedProvince.gst_rate * 100)}%`
    : null;

  function handleSave() {
    setError(null);
    startSaving(async () => {
      const result = await updateTaxSettings({ province_code: provinceCode || undefined, hst_registration_number: hstNumber.trim() || undefined, hst_reporting_frequency: frequency });
      if (result.success) toastSuccess('Tax settings saved', 'Your Canadian tax settings have been updated.');
      else { const msg = result.error ?? 'Failed to save tax settings.'; setError(msg); toastError('Failed to save tax settings', msg); }
    });
  }

  return (
    <Card>
      <CardHeader className="flex-row items-center gap-2 pb-4">
        <Receipt className="w-4 h-4 text-muted-foreground" /><CardTitle>Canadian Tax Settings</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {!business?.hst_registration_number && (
          <div className="flex items-start gap-2 rounded-lg bg-amber-50 dark:bg-[#494C4F] border border-amber-200 dark:border-[#FBFB47]/40 px-4 py-3">
            <AlertCircle className="w-4 h-4 text-amber-600 dark:text-[#FBFB47] mt-0.5 shrink-0" />
            <p className="text-xs text-amber-700 dark:text-[#FBFB47]">Add your HST/GST registration number to enable full CRA remittance reporting.</p>
          </div>
        )}
        <div className="flex flex-col gap-1.5">
          <Label>Province / Territory</Label>
          <select value={provinceCode} onChange={(e) => setProvinceCode(e.target.value)} className={selectCls}>
            <option value="">— Select province —</option>
            {provinces.map((p) => <option key={p.province_code} value={p.province_code}>{p.province_name} ({p.province_code})</option>)}
          </select>
          {taxLabel && (
            <p className="text-xs text-muted-foreground">Default tax rate: <span className="font-medium text-accent-teal">{taxLabel}</span>{selectedProvince?.is_hst_province ? ' (harmonised)' : ' federal only'}</p>
          )}
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-1.5">
            <Label>HST / GST Registration Number</Label>
            <Input value={hstNumber} onChange={(e) => setHstNumber(e.target.value)} placeholder="123456789RT0001" maxLength={20} />
            <p className="text-xs text-muted-foreground">Your CRA Business Number (BN). Shown on CRA reports.</p>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>HST / GST Reporting Frequency</Label>
            <select value={frequency} onChange={(e) => setFrequency(e.target.value as 'monthly' | 'quarterly' | 'annual')} className={selectCls}>
              <option value="monthly">Monthly</option>
              <option value="quarterly">Quarterly (most common)</option>
              <option value="annual">Annual</option>
            </select>
            <p className="text-xs text-muted-foreground">How often you file with CRA. Used as default when creating HST periods.</p>
          </div>
        </div>
        {error && <div className="flex items-center gap-1.5 text-sm text-destructive"><AlertCircle className="w-4 h-4" />{error}</div>}
        <div className="flex justify-end">
          <AdminOnly fallback={<Button disabled className="flex items-center gap-2"><Save className="w-4 h-4" />Save Tax Settings</Button>}>
            <Button onClick={handleSave} disabled={saving} className="flex items-center gap-2">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {saving ? 'Saving…' : 'Save Tax Settings'}
            </Button>
          </AdminOnly>
        </div>
      </CardContent>
    </Card>
  );
}

function BusinessSettingsSection({ business }: { business: Business | null }) {
  const [name, setName]               = useState(business?.name ?? '');
  const [fiscalYearEnd, setFiscalYearEnd] = useState(business?.fiscal_year_end ? String(business.fiscal_year_end).slice(0, 10) : '');
  const [currency, setCurrency]       = useState(business?.currency_code ?? 'CAD');
  const [saving, startSaving]         = useTransition();
  const [error, setError]             = useState<string | null>(null);

  function handleSave() {
    setError(null); if (!name.trim()) { setError('Business name is required.'); return; }
    startSaving(async () => {
      const result = await updateBusinessSettings({ name: name.trim(), fiscal_year_end: fiscalYearEnd || undefined, currency_code: currency });
      if (result.success) toastSuccess('Settings saved', 'Your business settings have been updated.');
      else { const msg = result.error ?? 'Failed to save settings.'; setError(msg); toastError('Failed to save settings', msg); }
    });
  }

  return (
    <Card>
      <CardHeader className="flex-row items-center gap-2 pb-4"><Building2 className="w-4 h-4 text-muted-foreground" /><CardTitle>Business Settings</CardTitle></CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <Label>Business Name</Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="My Business Inc." />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-1.5">
            <Label>Base Currency</Label>
            <select value={currency} onChange={(e) => setCurrency(e.target.value)} className={selectCls}>
              <option value="CAD">CAD – Canadian Dollar</option>
              <option value="USD">USD – US Dollar</option>
              <option value="EUR">EUR – Euro</option>
              <option value="GBP">GBP – British Pound</option>
              <option value="AUD">AUD – Australian Dollar</option>
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Fiscal Year End</Label>
            <Input type="date" value={fiscalYearEnd} onChange={(e) => setFiscalYearEnd(e.target.value)} />
          </div>
        </div>
        {business && (
          <div className="text-xs text-muted-foreground">
            Business ID: <span className="font-mono">{business.id}</span><br />
            Created: {new Date(business.created_at).toLocaleDateString('en-CA', { year: 'numeric', month: 'long', day: 'numeric' })}
          </div>
        )}
        {error && <div className="flex items-center gap-1.5 text-sm text-destructive"><AlertCircle className="w-4 h-4" />{error}</div>}
        <div className="flex justify-end">
          <AdminOnly fallback={<Button disabled className="flex items-center gap-2"><Save className="w-4 h-4" />Save Changes</Button>}>
            <Button onClick={handleSave} disabled={saving} className="flex items-center gap-2">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {saving ? 'Saving…' : 'Save Changes'}
            </Button>
          </AdminOnly>
        </div>
      </CardContent>
    </Card>
  );
}

function DisplaySection() {
  const { theme, toggleTheme } = useTheme(); const isDark = theme === 'dark';
  return (
    <Card>
      <CardHeader className="flex-row items-center gap-2 pb-4">
        {isDark ? <Moon className="w-4 h-4 text-muted-foreground" /> : <Sun className="w-4 h-4 text-muted-foreground" />}
        <CardTitle>Display</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-foreground">Theme</p>
            <p className="text-sm text-muted-foreground">{isDark ? 'Dark mode is on.' : 'Light mode is on.'} Your preference is saved automatically.</p>
          </div>
          <button onClick={toggleTheme}
            className="flex items-center gap-2 px-4 py-2 rounded-lg border border-border hover:bg-accent hover:text-accent-foreground text-sm font-medium text-foreground transition-colors">
            {isDark ? <><Sun className="w-4 h-4" />Switch to Light</> : <><Moon className="w-4 h-4" />Switch to Dark</>}
          </button>
        </div>
      </CardContent>
    </Card>
  );
}

function CurrencyRatesSection({ baseCurrency }: { baseCurrency: string }) {
  const [rates, setRates]       = useState<Record<string, number> | null>(null);
  const [loading, startLoading] = useTransition();
  const [error, setError]       = useState<string | null>(null);
  const [lastFetched, setLastFetched] = useState<Date | null>(null);

  function handleFetch() {
    setError(null);
    startLoading(async () => {
      const result = await getCurrencyRates(baseCurrency);
      if (result.success && result.data) { setRates(result.data.rates); setLastFetched(new Date()); toastSuccess('Rates refreshed', `Exchange rates for ${baseCurrency}`); }
      else { const msg = result.error ?? 'Failed to fetch rates'; setError(msg); toastError('Failed to fetch rates', msg); }
    });
  }

  const displayCurrencies = ['USD', 'CAD', 'EUR', 'GBP', 'AUD'].filter((c) => c !== baseCurrency);

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between pb-4">
        <div className="flex items-center gap-2"><DollarSign className="w-4 h-4 text-muted-foreground" /><CardTitle>Exchange Rates</CardTitle></div>
        <Button variant="outline" size="sm" onClick={handleFetch} disabled={loading} className="flex items-center gap-1.5">
          {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
          {loading ? 'Fetching…' : 'Refresh Rates'}
        </Button>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <p className="text-sm text-muted-foreground">Rates relative to your base currency ({baseCurrency}). Refreshed on demand — cached for 24 hours.</p>
        {error && <div className="flex items-center gap-1.5 text-sm text-destructive"><AlertCircle className="w-4 h-4" />{error}</div>}
        {rates && (
          <div className="rounded-lg border border-border overflow-hidden">
            <div className="grid grid-cols-3 gap-0 divide-y divide-border">
              {displayCurrencies.map((currency) => {
                const rate = rates[currency]; if (!rate) return null;
                return (
                  <div key={currency} className="flex items-center justify-between px-4 py-2.5 col-span-1">
                    <span className="text-sm font-medium text-foreground">{currency}</span>
                    <span className="text-sm font-mono text-foreground">{rate.toFixed(4)}</span>
                  </div>
                );
              })}
            </div>
            {lastFetched && (
              <div className="px-4 py-2 bg-muted border-t border-border">
                <p className="text-xs text-muted-foreground">Fetched {lastFetched.toLocaleTimeString('en-CA', { hour: '2-digit', minute: '2-digit' })} · Powered by Open Exchange Rates</p>
              </div>
            )}
          </div>
        )}
        {!rates && !loading && (
          <div className="rounded-lg bg-muted border border-border px-4 py-3 text-sm text-muted-foreground text-center">Click &quot;Refresh Rates&quot; to load current exchange rates.</div>
        )}
      </CardContent>
    </Card>
  );
}

function IntegritySection() {
  const [result, setResult] = useState<{ is_balanced: boolean; total_debits?: number; total_credits?: number; } | null>(null);
  const [running, startRunning] = useTransition();
  const [error, setError]       = useState<string | null>(null);

  function handleVerify() {
    setError(null); setResult(null);
    startRunning(async () => {
      const res = await verifyAccountingIntegrity();
      if (res.success) { setResult(res.data); toastSuccess(res.data?.is_balanced ? 'Books are balanced' : 'Balance issue detected', res.data?.is_balanced ? 'No issues found.' : 'Review your journal entries.'); }
      else { const msg = res.error ?? 'Verification failed.'; setError(msg); toastError('Integrity check failed', msg); }
    });
  }

  return (
    <Card>
      <CardHeader className="flex-row items-center gap-2 pb-4"><ShieldCheck className="w-4 h-4 text-muted-foreground" /><CardTitle>Accounting Integrity</CardTitle></CardHeader>
      <CardContent className="flex flex-col gap-4">
        <p className="text-sm text-muted-foreground">Verify all journal entries are balanced and your books are mathematically correct.</p>
        <Button variant="outline" onClick={handleVerify} disabled={running} className="w-fit flex items-center gap-2">
          {running ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
          {running ? 'Verifying…' : 'Run Integrity Check'}
        </Button>
        {error && <div className="flex items-center gap-1.5 text-sm text-destructive"><AlertCircle className="w-4 h-4" />{error}</div>}
        {result && (
          <div className={`rounded-xl border px-4 py-3 ${result.is_balanced ? 'bg-accent-teal-muted border-accent-teal/20' : 'bg-destructive/10 border-destructive/30'}`}>
            <div className="flex items-center gap-2 mb-2">
              {result.is_balanced ? <CheckCircle2 className="w-4 h-4 text-accent-teal" /> : <AlertCircle className="w-4 h-4 text-destructive" />}
              <span className={`text-sm font-medium ${result.is_balanced ? 'text-accent-teal' : 'text-destructive'}`}>
                {result.is_balanced ? 'Books are balanced — no issues found' : 'Books are NOT balanced — review journal entries'}
              </span>
            </div>
            {result.total_debits !== undefined && (
              <div className="text-xs text-muted-foreground grid grid-cols-2 gap-1 mt-2">
                <span>Total Debits: <strong>${Number(result.total_debits).toFixed(2)}</strong></span>
                <span>Total Credits: <strong>${Number(result.total_credits).toFixed(2)}</strong></span>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function SettingsClient({ business, subscription, provinces }: SettingsClientProps) {
  const [showProfile, setShowProfile] = useState(false);

  return (
    <div className="p-6 max-w-screen-md mx-auto">
      <div className="flex items-center gap-2 mb-6">
        <Settings className="w-5 h-5 text-muted-foreground" />
        <h1 className="text-2xl font-extrabold text-foreground">Settings</h1>
      </div>

      <div className="flex flex-col gap-5">
        <BusinessSettingsSection business={business} />
        <TaxSettingsSection business={business} provinces={provinces} />
        <BillingSection subscription={subscription} />
        <AccountantAccessSection />
        <DisplaySection />
        <CurrencyRatesSection baseCurrency={business?.currency_code ?? 'CAD'} />

        <Card>
          <CardHeader className="flex-row items-center justify-between pb-4">
            <div className="flex items-center gap-2"><User className="w-4 h-4 text-muted-foreground" /><CardTitle>User Profile</CardTitle></div>
            <Button variant="outline" size="sm" onClick={() => setShowProfile((v) => !v)}>{showProfile ? 'Hide' : 'Manage Profile'}</Button>
          </CardHeader>
          {showProfile ? (
            <CardContent className="pt-0">
              <UserProfile routing="hash" appearance={{ elements: { rootBox: 'w-full', card: 'shadow-none border-0 p-0' } }} />
            </CardContent>
          ) : (
            <CardContent className="pt-0">
              <p className="text-sm text-muted-foreground">Manage your name, email address, and password via Clerk&apos;s secure profile manager.</p>
            </CardContent>
          )}
        </Card>

        <IntegritySection />
      </div>
    </div>
  );
}
