'use client';

import { useState } from 'react';
import { Copy, Check, Loader2, Trash2, Database, UserPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const selectCls = 'w-full text-sm border border-border rounded-lg px-3 py-2 bg-card text-foreground outline-none focus:border-primary focus:ring-1 focus:ring-primary';

const SCENARIOS = [
  { value: 'freelancer_6mo', label: 'Freelancer — 6 months (employment + consulting + mixed expenses)' },
  { value: 'business_6mo',   label: 'Business — 6 months (clients, payroll, rent, utilities)' },
  { value: 'personal_6mo',   label: 'Personal — 6 months (salary, groceries, utilities, savings)' },
];

const ONE_YEAR = new Date();
ONE_YEAR.setFullYear(ONE_YEAR.getFullYear() + 1);

const DEFAULT_FORM = {
  businessName: '',
  clerkOrgId: '',
  mode: 'freelancer',
  plan: 'pro',
  trialEndsAt: ONE_YEAR.toISOString().split('T')[0],
};

export function AdminClient() {
  // ── Card 1: Create Test Account ────────────────────────────────────────────
  const [form, setForm] = useState(DEFAULT_FORM);
  const [creating, setCreating] = useState(false);
  const [createResult, setCreateResult] = useState<{ businessId: string; created: boolean } | null>(null);
  const [createError, setCreateError] = useState('');
  const [copied, setCopied] = useState(false);

  // ── Card 2: Seed Transactions ──────────────────────────────────────────────
  const [seedBizId, setSeedBizId] = useState('');
  const [scenario, setScenario] = useState('freelancer_6mo');
  const [seeding, setSeeding] = useState(false);
  const [seedResult, setSeedResult] = useState<{ inserted: number } | null>(null);
  const [seedError, setSeedError] = useState('');
  const [clearing, setClearing] = useState(false);
  const [clearResult, setClearResult] = useState<{ deleted: number } | null>(null);

  async function handleCreate() {
    if (!form.businessName.trim() || !form.clerkOrgId.trim()) {
      setCreateError('Business name and Clerk Org ID are required.');
      return;
    }
    setCreating(true);
    setCreateError('');
    setCreateResult(null);
    try {
      const res = await fetch('/api/proxy/admin/seed-account', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message ?? 'Failed to create account');
      setCreateResult(data);
      setSeedBizId(data.businessId);
    } catch (e: any) {
      setCreateError(e.message);
    } finally {
      setCreating(false);
    }
  }

  function handleCopy(text: string) {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function handleSeed() {
    if (!seedBizId.trim()) { setSeedError('Business ID is required.'); return; }
    setSeeding(true);
    setSeedError('');
    setSeedResult(null);
    setClearResult(null);
    try {
      const res = await fetch('/api/proxy/admin/seed-transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ businessId: seedBizId, scenario }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message ?? 'Seed failed');
      setSeedResult(data);
    } catch (e: any) {
      setSeedError(e.message);
    } finally {
      setSeeding(false);
    }
  }

  async function handleClear() {
    if (!seedBizId.trim()) { setSeedError('Business ID is required.'); return; }
    setClearing(true);
    setSeedError('');
    setSeedResult(null);
    setClearResult(null);
    try {
      const res = await fetch(`/api/proxy/admin/clear-transactions?businessId=${seedBizId}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message ?? 'Clear failed');
      setClearResult(data);
    } catch (e: any) {
      setSeedError(e.message);
    } finally {
      setClearing(false);
    }
  }

  return (
    <div className="p-8 max-w-2xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Platform Admin</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Internal tool — create Stripe-bypassed test accounts and seed synthetic data for demos and training videos.
        </p>
      </div>

      {/* ── Card 1: Create Test Account ── */}
      <div className="rounded-2xl border border-border bg-card p-6 space-y-5">
        <div className="flex items-center gap-2">
          <UserPlus className="w-5 h-5 text-primary" />
          <h2 className="text-base font-semibold text-foreground">Create Test Account</h2>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2 flex flex-col gap-1.5">
            <Label>Business Name</Label>
            <Input
              value={form.businessName}
              onChange={(e) => setForm((f) => ({ ...f, businessName: e.target.value }))}
              placeholder="e.g. Acme Plumbing Demo"
            />
          </div>
          <div className="col-span-2 flex flex-col gap-1.5">
            <Label>Clerk Org ID</Label>
            <Input
              value={form.clerkOrgId}
              onChange={(e) => setForm((f) => ({ ...f, clerkOrgId: e.target.value }))}
              placeholder="org_xxxxxxxxxxxxxxxx"
              className="font-mono text-sm"
            />
            <p className="text-xs text-muted-foreground">Found in Clerk Dashboard → Organizations</p>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Business Mode</Label>
            <select value={form.mode} onChange={(e) => setForm((f) => ({ ...f, mode: e.target.value }))} className={selectCls}>
              <option value="business">Business</option>
              <option value="freelancer">Freelancer</option>
              <option value="personal">Personal</option>
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Plan</Label>
            <select value={form.plan} onChange={(e) => setForm((f) => ({ ...f, plan: e.target.value }))} className={selectCls}>
              <option value="starter">Starter</option>
              <option value="pro">Pro</option>
              <option value="accountant">Accountant</option>
            </select>
          </div>
          <div className="col-span-2 flex flex-col gap-1.5">
            <Label>Trial / Access End Date</Label>
            <Input
              type="date"
              value={form.trialEndsAt}
              onChange={(e) => setForm((f) => ({ ...f, trialEndsAt: e.target.value }))}
            />
          </div>
        </div>

        {createError && <p className="text-sm text-destructive">{createError}</p>}

        {createResult && (
          <div className="rounded-xl bg-primary-light dark:bg-primary/10 border border-primary/20 px-4 py-3 space-y-2">
            <p className="text-sm font-semibold text-primary">
              Account {createResult.created ? 'created' : 'updated'} ✓
            </p>
            <div className="flex items-center gap-2">
              <code className="text-xs font-mono text-foreground bg-muted px-2 py-1 rounded flex-1 truncate">
                {createResult.businessId}
              </code>
              <button
                onClick={() => handleCopy(createResult.businessId)}
                className="text-muted-foreground hover:text-primary transition-colors"
              >
                {copied ? <Check className="w-4 h-4 text-primary" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
          </div>
        )}

        <Button onClick={handleCreate} disabled={creating} className="w-full">
          {creating ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Creating…</> : 'Create Test Account'}
        </Button>
      </div>

      {/* ── Card 2: Seed Transactions ── */}
      <div className="rounded-2xl border border-border bg-card p-6 space-y-5">
        <div className="flex items-center gap-2">
          <Database className="w-5 h-5 text-primary" />
          <h2 className="text-base font-semibold text-foreground">Seed Transactions</h2>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label>Business ID</Label>
          <Input
            value={seedBizId}
            onChange={(e) => setSeedBizId(e.target.value)}
            placeholder="Paste business ID from Card 1 above"
            className="font-mono text-sm"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label>Scenario</Label>
          <select value={scenario} onChange={(e) => setScenario(e.target.value)} className={selectCls}>
            {SCENARIOS.map((s) => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
        </div>

        {seedError && <p className="text-sm text-destructive">{seedError}</p>}

        {seedResult && (
          <div className="rounded-xl bg-primary-light dark:bg-primary/10 border border-primary/20 px-4 py-3">
            <p className="text-sm font-semibold text-primary">
              {seedResult.inserted} transactions inserted ✓
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              All transactions are pending — ready to classify for demo.
            </p>
          </div>
        )}

        {clearResult && (
          <div className="rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 px-4 py-3">
            <p className="text-sm font-semibold text-amber-700 dark:text-amber-400">
              {clearResult.deleted} synthetic transactions cleared ✓
            </p>
          </div>
        )}

        <div className="flex gap-3">
          <Button onClick={handleSeed} disabled={seeding || clearing} className="flex-1">
            {seeding ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Seeding…</> : 'Seed Transactions'}
          </Button>
          <Button
            variant="outline"
            onClick={handleClear}
            disabled={seeding || clearing}
            className="text-destructive hover:text-destructive border-destructive/30 hover:bg-destructive/10"
          >
            {clearing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          The trash button clears only pending synthetic transactions from this account. Posted transactions are not affected.
        </p>
      </div>
    </div>
  );
}
