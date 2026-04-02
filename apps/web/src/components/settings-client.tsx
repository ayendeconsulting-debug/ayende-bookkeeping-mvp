'use client';

import { useState, useTransition } from 'react';
import { UserProfile } from '@clerk/nextjs';
import {
  Settings,
  Building2,
  User,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Save,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { updateBusinessSettings, verifyAccountingIntegrity } from '@/app/(app)/settings/actions';

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

/* ── Business Settings Section ───────────────────────────────────────────── */

function BusinessSettingsSection({ business }: { business: Business | null }) {
  const [name, setName] = useState(business?.name ?? '');
  const [fiscalYearEnd, setFiscalYearEnd] = useState(
    business?.fiscal_year_end
      ? String(business.fiscal_year_end).slice(0, 10)
      : '',
  );
  const [currency, setCurrency] = useState(business?.currency_code ?? 'CAD');
  const [saving, startSaving] = useTransition();
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleSave() {
    setError(null);
    setSaved(false);
    if (!name.trim()) {
      setError('Business name is required.');
      return;
    }
    startSaving(async () => {
      const result = await updateBusinessSettings({
        name: name.trim(),
        fiscal_year_end: fiscalYearEnd || undefined,
        currency_code: currency,
      });
      if (result.success) {
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
      } else {
        setError(result.error ?? 'Failed to save settings.');
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
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="My Business Inc."
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-1.5">
            <Label>Currency</Label>
            <select
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              className="text-sm border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-[#0F6E56]"
            >
              <option value="CAD">CAD — Canadian Dollar</option>
              <option value="USD">USD — US Dollar</option>
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Fiscal Year End</Label>
            <Input
              type="date"
              value={fiscalYearEnd}
              onChange={(e) => setFiscalYearEnd(e.target.value)}
            />
          </div>
        </div>

        {business && (
          <div className="text-xs text-gray-400">
            Business ID: <span className="font-mono">{business.id}</span>
            <br />
            Created:{' '}
            {new Date(business.created_at).toLocaleDateString('en-CA', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}
          </div>
        )}

        {error && (
          <div className="flex items-center gap-1.5 text-sm text-red-500">
            <AlertCircle className="w-4 h-4" />
            {error}
          </div>
        )}

        {saved && (
          <div className="flex items-center gap-1.5 text-sm text-[#0F6E56]">
            <CheckCircle2 className="w-4 h-4" />
            Settings saved successfully.
          </div>
        )}

        <div className="flex justify-end">
          <Button onClick={handleSave} disabled={saving} className="flex items-center gap-2">
            {saving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            {saving ? 'Saving…' : 'Save Changes'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

/* ── Accounting Integrity Section ────────────────────────────────────────── */

function IntegritySection() {
  const [result, setResult] = useState<any>(null);
  const [running, startRunning] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleVerify() {
    setError(null);
    setResult(null);
    startRunning(async () => {
      const res = await verifyAccountingIntegrity();
      if (res.success) {
        setResult(res.data);
      } else {
        setError(res.error ?? 'Verification failed.');
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
          Run a verification check to ensure all journal entries are balanced and
          your books are mathematically correct.
        </p>

        <Button
          variant="outline"
          onClick={handleVerify}
          disabled={running}
          className="w-fit flex items-center gap-2"
        >
          {running ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <ShieldCheck className="w-4 h-4" />
          )}
          {running ? 'Verifying…' : 'Run Integrity Check'}
        </Button>

        {error && (
          <div className="flex items-center gap-1.5 text-sm text-red-500">
            <AlertCircle className="w-4 h-4" />
            {error}
          </div>
        )}

        {result && (
          <div
            className={`rounded-xl border px-4 py-3 ${
              result.is_balanced
                ? 'bg-[#F0FAF6] border-[#C3E8D8]'
                : 'bg-red-50 border-red-200'
            }`}
          >
            <div className="flex items-center gap-2 mb-2">
              {result.is_balanced ? (
                <CheckCircle2 className="w-4 h-4 text-[#0F6E56]" />
              ) : (
                <AlertCircle className="w-4 h-4 text-red-500" />
              )}
              <span
                className={`text-sm font-medium ${
                  result.is_balanced ? 'text-[#0F6E56]' : 'text-red-600'
                }`}
              >
                {result.is_balanced
                  ? 'Books are balanced — no issues found'
                  : 'Books are NOT balanced — review journal entries'}
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

/* ── Main Settings Client ────────────────────────────────────────────────── */

export function SettingsClient({ business }: SettingsClientProps) {
  const [showProfile, setShowProfile] = useState(false);

  return (
    <div className="p-6 max-w-screen-md mx-auto">
      {/* Header */}
      <div className="flex items-center gap-2 mb-6">
        <Settings className="w-5 h-5 text-gray-400" />
        <h1 className="text-xl font-semibold text-gray-900">Settings</h1>
      </div>

      <div className="flex flex-col gap-5">
        {/* Business settings */}
        <BusinessSettingsSection business={business} />

        {/* User profile */}
        <Card>
          <CardHeader className="flex-row items-center justify-between pb-4">
            <div className="flex items-center gap-2">
              <User className="w-4 h-4 text-gray-400" />
              <CardTitle>User Profile</CardTitle>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowProfile((v) => !v)}
            >
              {showProfile ? 'Hide' : 'Manage Profile'}
            </Button>
          </CardHeader>
          {showProfile && (
            <CardContent className="pt-0">
              <UserProfile
                appearance={{
                  elements: {
                    rootBox: 'w-full',
                    card: 'shadow-none border-0 p-0',
                  },
                }}
              />
            </CardContent>
          )}
          {!showProfile && (
            <CardContent className="pt-0">
              <p className="text-sm text-gray-500">
                Manage your name, email address, password, and connected accounts
                via Clerk's secure profile manager.
              </p>
            </CardContent>
          )}
        </Card>

        {/* Accounting integrity */}
        <IntegritySection />
      </div>
    </div>
  );
}
