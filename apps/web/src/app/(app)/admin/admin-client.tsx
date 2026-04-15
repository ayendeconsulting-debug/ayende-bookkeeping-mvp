'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useOrganizationList } from '@clerk/nextjs';
import { Copy, Check, Loader2, Trash2, Database, UserPlus, RefreshCw, ArrowRightLeft, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

const selectCls = 'w-full text-sm border border-border rounded-lg px-3 py-2 bg-card text-foreground outline-none focus:border-primary focus:ring-1 focus:ring-primary';

const MODE_BADGE: Record<string, string> = {
  business:   'bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400',
  freelancer: 'bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400',
  personal:   'bg-purple-50 text-purple-700 dark:bg-purple-900/20 dark:text-purple-400',
};

const PLAN_BADGE: Record<string, string> = {
  starter:    'bg-muted text-muted-foreground',
  pro:        'bg-primary-light text-primary dark:bg-primary/20',
  accountant: 'bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400',
};

const SCENARIOS = [
  { value: 'freelancer_6mo', label: 'Freelancer — 6 months' },
  { value: 'business_6mo',   label: 'Business — 6 months' },
  { value: 'personal_6mo',   label: 'Personal — 6 months' },
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

interface DemoAccount {
  businessId: string;
  name: string;
  mode: string;
  plan: string;
  clerkOrgId: string | null;
  createdAt: string;
}

export function AdminClient() {
  const router = useRouter();
  const { setActive } = useOrganizationList();

  // ── Card 0: Demo Account Switcher ──────────────────────────────────────────
  const [accounts, setAccounts] = useState<DemoAccount[]>([]);
  const [loadingAccounts, setLoadingAccounts] = useState(true);
  const [switchingId, setSwitchingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const loadAccounts = useCallback(async () => {
    setLoadingAccounts(true);
    try {
      const res = await fetch('/api/proxy/admin/accounts');
      if (res.ok) setAccounts(await res.json());
    } catch { /* non-fatal */ }
    finally { setLoadingAccounts(false); }
  }, []);

  useEffect(() => { loadAccounts(); }, [loadAccounts]);

  async function handleSwitch(account: DemoAccount) {
    if (!account.clerkOrgId || !setActive) return;
    setSwitchingId(account.businessId);
    try {
      await setActive({ organization: account.clerkOrgId });
      router.push('/dashboard');
      router.refresh();
    } catch {
      setSwitchingId(null);
    }
  }

  async function handleDelete(account: DemoAccount) {
    setDeletingId(account.businessId);
    setConfirmDeleteId(null);
    try {
      const res = await fetch(`/api/proxy/admin/accounts/${account.businessId}`, { method: 'DELETE' });
      if (res.ok) {
        setAccounts((prev) => prev.filter((a) => a.businessId !== account.businessId));
      }
    } finally {
      setDeletingId(null);
    }
  }

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
    setCreating(true); setCreateError(''); setCreateResult(null);
    try {
      const res = await fetch('/api/proxy/admin/seed-account', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message ?? 'Failed');
      setCreateResult(data);
      setSeedBizId(data.businessId);
      await loadAccounts(); // refresh Card 0
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
    setSeeding(true); setSeedError(''); setSeedResult(null); setClearResult(null);
    try {
      const res = await fetch('/api/proxy/admin/seed-transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ businessId: seedBizId, scenario }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message ?? 'Seed failed');
      setSeedResult(data);
    } catch (e: any) { setSeedError(e.message); }
    finally { setSeeding(false); }
  }

  async function handleClear() {
    if (!seedBizId.trim()) { setSeedError('Business ID is required.'); return; }
    setClearing(true); setSeedError(''); setSeedResult(null); setClearResult(null);
    try {
      const res = await fetch(`/api/proxy/admin/clear-transactions?businessId=${seedBizId}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message ?? 'Clear failed');
      setClearResult(data);
    } catch (e: any) { setSeedError(e.message); }
    finally { setClearing(false); }
  }

  return (
    <div className="p-8 max-w-2xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Platform Admin</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Internal tool — create Stripe-bypassed test accounts and seed synthetic data for demos and training videos.
        </p>
      </div>

      {/* ── Card 0: Demo Account Switcher ── */}
      <div className="rounded-2xl border border-border bg-card p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ArrowRightLeft className="w-5 h-5 text-primary" />
            <h2 className="text-base font-semibold text-foreground">Demo Accounts</h2>
          </div>
          <button
            onClick={loadAccounts}
            disabled={loadingAccounts}
            className="text-muted-foreground hover:text-foreground transition-colors"
            title="Refresh"
          >
            <RefreshCw className={cn('w-4 h-4', loadingAccounts && 'animate-spin')} />
          </button>
        </div>

        {loadingAccounts ? (
          <div className="flex items-center justify-center py-6 gap-2 text-muted-foreground">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span className="text-sm">Loading accounts…</span>
          </div>
        ) : accounts.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            No test accounts yet. Create one below.
          </p>
        ) : (
          <div className="divide-y divide-border rounded-xl border border-border overflow-hidden">
            {accounts.map((account) => (
              <div key={account.businessId} className="flex items-center gap-3 px-4 py-3 bg-card hover:bg-muted/30 transition-colors">
                <div className="w-8 h-8 rounded-lg bg-primary-light dark:bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <span className="text-xs font-bold text-primary">
                    {account.name.slice(0, 2).toUpperCase()}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{account.name}</p>
                  <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                    <span className={cn('text-[10px] font-semibold px-1.5 py-0.5 rounded-full capitalize', MODE_BADGE[account.mode] ?? 'bg-muted text-muted-foreground')}>
                      {account.mode}
                    </span>
                    <span className={cn('text-[10px] font-semibold px-1.5 py-0.5 rounded-full capitalize', PLAN_BADGE[account.plan] ?? 'bg-muted text-muted-foreground')}>
                      {account.plan}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {/* Pre-fill seed card with this business ID */}
                  <button
                    onClick={() => setSeedBizId(account.businessId)}
                    className="text-xs text-muted-foreground hover:text-primary px-2 py-1 rounded transition-colors"
                    title="Use this ID in Seed card"
                  >
                    Use
                  </button>

                  {/* Switch to this org in Clerk */}
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={!account.clerkOrgId || switchingId === account.businessId}
                    onClick={() => handleSwitch(account)}
                    className="h-7 px-3 text-xs"
                    title={account.clerkOrgId ? 'Switch to this account' : 'No Clerk Org ID — cannot switch'}
                  >
                    {switchingId === account.businessId
                      ? <Loader2 className="w-3 h-3 animate-spin" />
                      : 'Switch'}
                  </Button>

                  {/* Delete with confirmation */}
                  {confirmDeleteId === account.businessId ? (
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleDelete(account)}
                        disabled={deletingId === account.businessId}
                        className="text-xs font-semibold text-destructive hover:text-destructive/80 px-2 py-1 rounded border border-destructive/30 transition-colors"
                      >
                        {deletingId === account.businessId ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Confirm'}
                      </button>
                      <button
                        onClick={() => setConfirmDeleteId(null)}
                        className="text-xs text-muted-foreground hover:text-foreground px-1"
                      >
                        ✕
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setConfirmDeleteId(account.businessId)}
                      disabled={deletingId === account.businessId}
                      className="text-muted-foreground hover:text-destructive transition-colors p-1"
                      title="Delete this test account"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {accounts.length > 0 && (
          <p className="text-xs text-muted-foreground flex items-center gap-1.5">
            <AlertTriangle className="w-3 h-3 text-amber-500 flex-shrink-0" />
            Delete permanently wipes all transactions, journal entries, and accounts for that business.
          </p>
        )}
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
            <Input type="date" value={form.trialEndsAt} onChange={(e) => setForm((f) => ({ ...f, trialEndsAt: e.target.value }))} />
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
              <button onClick={() => handleCopy(createResult.businessId)} className="text-muted-foreground hover:text-primary transition-colors">
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
            placeholder="Paste or select from Demo Accounts above"
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
            <p className="text-sm font-semibold text-primary">{seedResult.inserted} transactions inserted ✓</p>
            <p className="text-xs text-muted-foreground mt-0.5">All transactions are pending — ready to classify for demo.</p>
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
          The trash button clears only pending synthetic transactions. Posted transactions are not affected.
        </p>
      </div>
    </div>
  );
}
