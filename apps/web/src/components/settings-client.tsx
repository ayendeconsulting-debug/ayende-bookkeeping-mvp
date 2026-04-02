'use client';

import { useState, useTransition } from 'react';
import { UserProfile } from '@clerk/nextjs';
import {
  Settings, Building2, User, ShieldCheck,
  CheckCircle2, AlertCircle, Loader2, Save, RefreshCw, DollarSign,
} from 'lucide-react';
import { AdminOnly } from '@/components/admin-only';
import { toastSuccess, toastError } from '@/lib/toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  updateBusinessSettings,
  verifyAccountingIntegrity,
  getCurrencyRates,
} from '@/app/(app)/settings/actions';

interface Business {
  id: string;
  name: string;
  legal_name?: string;
  tax_id?: string;
  currency_code: string;
  fiscal_year_end: string;
  created_at: string;
}

interface SettingsClientProps {
  business: Business | null;
}

/* ── Business Settings Section ──────────────────────────────────────────── */

function BusinessSettingsSection({ business }: { business: Business | null }) {
  const [name, setName] = useState(business?.name ?? '');
  const [fiscalYearEnd, setFiscalYearEnd] = useState(
    business?.fiscal_year_end ? String(business.fiscal_year_end).slice(0, 10) : '',
  );
  const [currency, setCurrency] = useState(business?.currency_code ?? 'CAD');
  const [saving, startSaving] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleSave() {
    setError(null);
    if (!name.trim()) { setError('Business name is required.'); return; }
    startSaving(async () => {
      const result = await updateBusinessSettings({
        name: name.trim(),
        fiscal_year_end: fiscalYearEnd || undefined,
        currency_code: currency,
      });
      if (result.success) {
        toastSuccess('Settings saved', 'Your business settings have been updated.');
      } else {
        const msg = result.error ?? 'Failed to save settings.';
        setError(msg);
        toastError('Failed to save settings', msg);
      }
    });
  }

  return (
    <Card>
      <CardHeader className="flex-row items-center gap-2 pb-4">
        <Building2 className="w-4 h-4 text-gray-400" />
        <CardTitle>Business Settings</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <Label>Business Name</Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="My Business Inc." />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-1.5">
            <Label>Base Currency</Label>
            <select
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              className="text-sm border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-[#0F6E56]"
            >
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
          <div className="text-xs text-gray-400">
            Business ID: <span className="font-mono">{business.id}</span>
            <br />
            Created: {new Date(business.created_at).toLocaleDateString('en-CA', { year: 'numeric', month: 'long', day: 'numeric' })}
          </div>
        )}
        {error && (
          <div className="flex items-center gap-1.5 text-sm text-red-500">
            <AlertCircle className="w-4 h-4" />{error}
          </div>
        )}
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

/* ── Currency Rates Section ──────────────────────────────────────────────── */

function CurrencyRatesSection({ baseCurrency }: { baseCurrency: string }) {
  const [rates, setRates] = useState<Record<string, number> | null>(null);
  const [loading, startLoading] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [lastFetched, setLastFetched] = useState<Date | null>(null);

  function handleFetch() {
    setError(null);
    startLoading(async () => {
      const result = await getCurrencyRates(baseCurrency);
      if (result.success && result.data) {
        setRates(result.data.rates);
        setLastFetched(new Date());
        toastSuccess('Rates refreshed', `Exchange rates for ${baseCurrency}`);
      } else {
        const msg = result.error ?? 'Failed to fetch rates';
        setError(msg);
        toastError('Failed to fetch rates', msg);
      }
    });
  }

  const displayCurrencies = ['USD', 'CAD', 'EUR', 'GBP', 'AUD'].filter((c) => c !== baseCurrency);

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between pb-4">
        <div className="flex items-center gap-2">
          <DollarSign className="w-4 h-4 text-gray-400" />
          <CardTitle>Exchange Rates</CardTitle>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleFetch}
          disabled={loading}
          className="flex items-center gap-1.5"
        >
          {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
          {loading ? 'Fetching…' : 'Refresh Rates'}
        </Button>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <p className="text-sm text-gray-500">
          Rates relative to your base currency ({baseCurrency}).
          Refreshed on demand — cached for 24 hours. Used for automatic foreign currency conversion
          on Plaid-imported transactions.
        </p>

        {error && (
          <div className="flex items-center gap-1.5 text-sm text-red-500">
            <AlertCircle className="w-4 h-4" />{error}
          </div>
        )}

        {rates && (
          <div className="rounded-lg border border-gray-100 overflow-hidden">
            <div className="grid grid-cols-3 gap-0 divide-y divide-gray-100">
              {displayCurrencies.map((currency) => {
                const rate = rates[currency];
                if (!rate) return null;
                return (
                  <div
                    key={currency}
                    className="flex items-center justify-between px-4 py-2.5 col-span-1"
                  >
                    <span className="text-sm font-medium text-gray-700">{currency}</span>
                    <span className="text-sm font-mono text-gray-900">
                      {rate.toFixed(4)}
                    </span>
                  </div>
                );
              })}
            </div>
            {lastFetched && (
              <div className="px-4 py-2 bg-gray-50 border-t border-gray-100">
                <p className="text-xs text-gray-400">
                  Fetched {lastFetched.toLocaleTimeString('en-CA', { hour: '2-digit', minute: '2-digit' })}
                  {' · '}Powered by Open Exchange Rates
                </p>
              </div>
            )}
          </div>
        )}

        {!rates && !loading && (
          <div className="rounded-lg bg-gray-50 border border-gray-100 px-4 py-3 text-sm text-gray-500 text-center">
            Click "Refresh Rates" to load current exchange rates.
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/* ── Accounting Integrity Section ───────────────────────────────────────── */

function IntegritySection() {
  const [result, setResult] = useState<any>(null);
  const [running, startRunning] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleVerify() {
    setError(null); setResult(null);
    startRunning(async () => {
      const res = await verifyAccountingIntegrity();
      if (res.success) {
        setResult(res.data);
        toastSuccess(
          res.data?.is_balanced ? 'Books are balanced' : 'Balance issue detected',
          res.data?.is_balanced ? 'No issues found.' : 'Review your journal entries.',
        );
      } else {
        const msg = res.error ?? 'Verification failed.';
        setError(msg);
        toastError('Integrity check failed', msg);
      }
    });
  }

  return (
    <Card>
      <CardHeader className="flex-row items-center gap-2 pb-4">
        <ShieldCheck className="w-4 h-4 text-gray-400" />
        <CardTitle>Accounting Integrity</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <p className="text-sm text-gray-500">
          Verify all journal entries are balanced and your books are mathematically correct.
        </p>
        <Button variant="outline" onClick={handleVerify} disabled={running} className="w-fit flex items-center gap-2">
          {running ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
          {running ? 'Verifying…' : 'Run Integrity Check'}
        </Button>
        {error && <div className="flex items-center gap-1.5 text-sm text-red-500"><AlertCircle className="w-4 h-4" />{error}</div>}
        {result && (
          <div className={`rounded-xl border px-4 py-3 ${result.is_balanced ? 'bg-[#F0FAF6] border-[#C3E8D8]' : 'bg-red-50 border-red-200'}`}>
            <div className="flex items-center gap-2 mb-2">
              {result.is_balanced ? <CheckCircle2 className="w-4 h-4 text-[#0F6E56]" /> : <AlertCircle className="w-4 h-4 text-red-500" />}
              <span className={`text-sm font-medium ${result.is_balanced ? 'text-[#0F6E56]' : 'text-red-600'}`}>
                {result.is_balanced ? 'Books are balanced – no issues found' : 'Books are NOT balanced – review journal entries'}
              </span>
            </div>
            {result.total_debits !== undefined && (
              <div className="text-xs text-gray-500 grid grid-cols-2 gap-1 mt-2">
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

/* ── Main Settings Client ───────────────────────────────────────────────── */

export function SettingsClient({ business }: SettingsClientProps) {
  const [showProfile, setShowProfile] = useState(false);

  return (
    <div className="p-6 max-w-screen-md mx-auto">
      <div className="flex items-center gap-2 mb-6">
        <Settings className="w-5 h-5 text-gray-400" />
        <h1 className="text-xl font-semibold text-gray-900">Settings</h1>
      </div>

      <div className="flex flex-col gap-5">
        <BusinessSettingsSection business={business} />

        <CurrencyRatesSection baseCurrency={business?.currency_code ?? 'CAD'} />

        <Card>
          <CardHeader className="flex-row items-center justify-between pb-4">
            <div className="flex items-center gap-2">
              <User className="w-4 h-4 text-gray-400" />
              <CardTitle>User Profile</CardTitle>
            </div>
            <Button variant="outline" size="sm" onClick={() => setShowProfile((v) => !v)}>
              {showProfile ? 'Hide' : 'Manage Profile'}
            </Button>
          </CardHeader>
          {showProfile ? (
            <CardContent className="pt-0">
              <UserProfile routing="hash" appearance={{ elements: { rootBox: 'w-full', card: 'shadow-none border-0 p-0' } }} />
            </CardContent>
          ) : (
            <CardContent className="pt-0">
              <p className="text-sm text-gray-500">
                Manage your name, email address, and password via Clerk's secure profile manager.
              </p>
            </CardContent>
          )}
        </Card>

        <IntegritySection />
      </div>
    </div>
  );
}
