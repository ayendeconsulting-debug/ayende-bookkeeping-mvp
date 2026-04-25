'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useOrganizationList, useUser } from '@clerk/nextjs';
import {
  Copy, Check, Loader2, Trash2, Database, RefreshCw,
  ArrowRightLeft, AlertTriangle, Layers, ChevronRight,
  BarChart3, Link2, Zap, Wrench,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { CommandCenterClient } from './command-center-client';
import { InsightsClient } from './insights-client';
import { ReferralsClient } from './referrals-client';

const selectCls =
  'w-full text-sm border border-border rounded-lg px-3 py-2 bg-card text-foreground outline-none focus:border-primary focus:ring-1 focus:ring-primary';

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
  { value: 'personal_enriched',   label: 'Personal – Enriched (88 tx + budget + goals + recurring)' },
  { value: 'freelancer_enriched', label: 'Freelancer – Enriched (107 tx + mileage + invoices)' },
  { value: 'business_enriched',   label: 'Business – Enriched (99 tx + HST)' },
  { value: 'freelancer_6mo',      label: 'Freelancer – 6 months (legacy)' },
  { value: 'business_6mo',        label: 'Business – 6 months (legacy)' },
  { value: 'personal_6mo',        label: 'Personal – 6 months' },
];

const ONE_YEAR = new Date();
ONE_YEAR.setFullYear(ONE_YEAR.getFullYear() + 1);

type AdminTab = 'insights' | 'referrals' | 'command-center' | 'platform';

const ADMIN_TABS: { id: AdminTab; label: string; icon: typeof BarChart3 }[] = [
  { id: 'insights',        label: 'Insights',        icon: BarChart3 },
  { id: 'referrals',       label: 'Referrals',       icon: Link2 },
  { id: 'command-center',  label: 'Command Center',  icon: Zap },
  { id: 'platform',        label: 'Platform',        icon: Wrench },
];

interface DemoAccount {
  businessId: string;
  name: string;
  mode: string;
  plan: string;
  clerkOrgId: string | null;
  createdAt: string;
}

interface ProvisionResult {
  starter:    { businessId: string; created: boolean };
  pro:        { businessId: string; created: boolean };
  accountant: { businessId: string; created: boolean; firmId: string };
  client1:    { businessId: string; created: boolean };
  client2:    { businessId: string; created: boolean };
}

// ── Copy button (inline) ──────────────────────────────────────────────────
function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  function doCopy() {
    navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }
  return (
    <button onClick={doCopy} className="text-muted-foreground hover:text-primary transition-colors flex-shrink-0">
      {copied ? <Check className="w-3.5 h-3.5 text-primary" /> : <Copy className="w-3.5 h-3.5" />}
    </button>
  );
}

// ── Result row ────────────────────────────────────────────────────────────
function ResultRow({ label, businessId, created }: { label: string; businessId: string; created: boolean }) {
  return (
    <div className="flex items-center gap-2 text-xs">
      <span className="text-muted-foreground w-20 flex-shrink-0">{label}</span>
      <code className="font-mono text-foreground bg-muted px-2 py-0.5 rounded flex-1 truncate">
        {businessId}
      </code>
      <CopyButton value={businessId} />
      <span className={cn(
        'text-[10px] font-semibold px-1.5 py-0.5 rounded-full flex-shrink-0',
        created
          ? 'bg-primary-light text-primary dark:bg-primary/20'
          : 'bg-muted text-muted-foreground'
      )}>
        {created ? 'new' : 'updated'}
      </span>
    </div>
  );
}

// ── Slot input group ──────────────────────────────────────────────────────
function SlotField({
  label, orgIdKey, nameKey, orgIdPlaceholder, namePlaceholder, form, setForm,
}: {
  label: string;
  orgIdKey: string;
  nameKey: string;
  orgIdPlaceholder: string;
  namePlaceholder: string;
  form: Record<string, string>;
  setForm: (fn: (f: Record<string, string>) => Record<string, string>) => void;
}) {
  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{label}</p>
      <div className="flex flex-col gap-1.5">
        <Input value={form[orgIdKey] ?? ''} onChange={(e) => setForm((f) => ({ ...f, [orgIdKey]: e.target.value }))} placeholder={orgIdPlaceholder} className="font-mono text-xs h-8" />
        <Input value={form[nameKey] ?? ''} onChange={(e) => setForm((f) => ({ ...f, [nameKey]: e.target.value }))} placeholder={namePlaceholder} className="text-xs h-8" />
      </div>
    </div>
  );
}

export function AdminClient() {
  const router = useRouter();
  const { setActive } = useOrganizationList();
  const { user } = useUser();
  const [activeTab, setActiveTab] = useState<AdminTab>('insights');

  // ── Card 0: Demo Account Switcher ─────────────────────────────────────
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

  // ── Card 1: Demo Suite Provisioner ────────────────────────────────────
  const DEFAULT_SUITE_FORM: Record<string, string> = {
    starterOrgId: '', starterBusinessName: 'Maple Leaf Construction',
    proOrgId: '', proBusinessName: 'Jordan Rivera Design',
    accountantOrgId: '', firmName: 'Clearview Accounting', firmSubdomain: 'clearview',
    client1OrgId: '', client1BusinessName: 'Northgate Café',
    client2OrgId: '', client2BusinessName: 'Rivera Consulting',
    trialEndsAt: ONE_YEAR.toISOString().split('T')[0],
  };

  const [suiteForm, setSuiteForm] = useState<Record<string, string>>(DEFAULT_SUITE_FORM);
  const [provisioning, setProvisioning] = useState(false);
  const [suiteResult, setSuiteResult] = useState<ProvisionResult | null>(null);
  const [suiteError, setSuiteError] = useState('');

  async function handleProvision() {
    const required = ['starterOrgId', 'proOrgId', 'accountantOrgId', 'client1OrgId', 'client2OrgId', 'firmSubdomain', 'firmName'];
    const missing = required.filter((k) => !suiteForm[k]?.trim());
    if (missing.length > 0) { setSuiteError(`Missing fields: ${missing.join(', ')}`); return; }
    if (!user?.id) { setSuiteError('Could not read your Clerk user ID. Please refresh and try again.'); return; }
    setProvisioning(true); setSuiteError(''); setSuiteResult(null);
    try {
      const res = await fetch('/api/proxy/admin/provision-demo-suite', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ownerClerkUserId: user.id, ...suiteForm }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message ?? 'Provision failed');
      setSuiteResult(data);
      await loadAccounts();
    } catch (e: any) { setSuiteError(e.message); }
    finally { setProvisioning(false); }
  }

  // ── Card 2: Seed Transactions ─────────────────────────────────────────
  const [seedBizId, setSeedBizId] = useState('');
  const [scenario, setScenario] = useState('personal_enriched');
  const [seeding, setSeeding] = useState(false);
  const [seedResult, setSeedResult] = useState<{ inserted: number } | null>(null);
  const [seedError, setSeedError] = useState('');
  const [clearing, setClearing] = useState(false);
  const [clearResult, setClearResult] = useState<{ deleted: number } | null>(null);

  async function handleSeed() {
    if (!seedBizId.trim()) { setSeedError('Business ID is required.'); return; }
    setSeeding(true); setSeedError(''); setSeedResult(null); setClearResult(null);
    try {
      const res = await fetch('/api/proxy/admin/seed-transactions', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
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
    <div className="p-4 sm:p-6 md:p-8 max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Platform Admin</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Insights, referral management, email campaigns, and platform tools.
        </p>
      </div>

      {/* ── Tab Bar ── */}
      <div className="flex gap-1 border-b border-border -mx-4 px-4 sm:-mx-6 sm:px-6 md:-mx-8 md:px-8 overflow-x-auto">
        {ADMIN_TABS.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors',
                activeTab === tab.id
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground',
              )}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* ── Insights Tab ── */}
      {activeTab === 'insights' && <InsightsClient />}

      {/* ── Referrals Tab ── */}
      {activeTab === 'referrals' && <ReferralsClient />}

      {/* ── Command Center Tab ── */}
      {activeTab === 'command-center' && <CommandCenterClient />}

      {/* ── Platform Tab ── */}
      {activeTab === 'platform' && (
        <div className="space-y-8">
          {/* Demo Account Switcher */}
          <div className="rounded-2xl border border-border bg-card p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ArrowRightLeft className="w-5 h-5 text-primary" />
                <h2 className="text-base font-semibold text-foreground">Demo Accounts</h2>
              </div>
              <button onClick={loadAccounts} disabled={loadingAccounts} className="text-muted-foreground hover:text-foreground transition-colors" title="Refresh">
                <RefreshCw className={cn('w-4 h-4', loadingAccounts && 'animate-spin')} />
              </button>
            </div>

            {loadingAccounts ? (
              <div className="flex items-center justify-center py-6 gap-2 text-muted-foreground">
                <Loader2 className="w-4 h-4 animate-spin" /><span className="text-sm">Loading accounts…</span>
              </div>
            ) : accounts.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">No test accounts yet. Create one below.</p>
            ) : (
              <div className="divide-y divide-border rounded-xl border border-border overflow-hidden">
                {accounts.map((account) => (
                  <div key={account.businessId} className="flex items-center gap-3 px-4 py-3 bg-card hover:bg-muted/30 transition-colors">
                    <div className="w-8 h-8 rounded-lg bg-primary-light dark:bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <span className="text-xs font-bold text-primary">{account.name.slice(0, 2).toUpperCase()}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{account.name}</p>
                      <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                        <span className={cn('text-[10px] font-semibold px-1.5 py-0.5 rounded-full capitalize', MODE_BADGE[account.mode] ?? 'bg-muted text-muted-foreground')}>{account.mode}</span>
                        <span className={cn('text-[10px] font-semibold px-1.5 py-0.5 rounded-full capitalize', PLAN_BADGE[account.plan] ?? 'bg-muted text-muted-foreground')}>{account.plan}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button onClick={() => setSeedBizId(account.businessId)} className="text-xs text-muted-foreground hover:text-primary px-2 py-1 rounded transition-colors" title="Use this ID in Seed card">Use</button>
                      <Button size="sm" variant="outline" disabled={!account.clerkOrgId || switchingId === account.businessId} onClick={() => handleSwitch(account)} className="h-7 px-3 text-xs" title={account.clerkOrgId ? 'Switch to this account' : 'No Clerk Org ID – cannot switch'}>
                        {switchingId === account.businessId ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Switch'}
                      </Button>
                      {confirmDeleteId === account.businessId ? (
                        <div className="flex items-center gap-1">
                          <button onClick={() => handleDelete(account)} disabled={deletingId === account.businessId} className="text-xs font-semibold text-destructive hover:text-destructive/80 px-2 py-1 rounded border border-destructive/30 transition-colors">
                            {deletingId === account.businessId ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Confirm'}
                          </button>
                          <button onClick={() => setConfirmDeleteId(null)} className="text-xs text-muted-foreground hover:text-foreground px-1">✕</button>
                        </div>
                      ) : (
                        <button onClick={() => setConfirmDeleteId(account.businessId)} disabled={deletingId === account.businessId} className="text-muted-foreground hover:text-destructive transition-colors p-1" title="Delete this test account">
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

          {/* Demo Suite Provisioner */}
          <div className="rounded-2xl border border-border bg-card p-6 space-y-6">
            <div className="flex items-center gap-2">
              <Layers className="w-5 h-5 text-primary" />
              <h2 className="text-base font-semibold text-foreground">Demo Suite Provisioner</h2>
            </div>
            <p className="text-xs text-muted-foreground -mt-2">
              Provisions all 3 demo profiles at once for your account. Each Clerk Org ID must already exist in your Clerk dashboard.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="rounded-xl border border-border p-4 space-y-3 bg-muted/20">
                <div className="flex items-center gap-2">
                  <span className={cn('text-[10px] font-bold px-2 py-0.5 rounded-full uppercase', PLAN_BADGE['starter'])}>Personal</span>
                  <ChevronRight className="w-3 h-3 text-muted-foreground" />
                  <span className={cn('text-[10px] font-bold px-2 py-0.5 rounded-full capitalize', MODE_BADGE['personal'])}>Personal</span>
                </div>
                <SlotField label="Personal Slot" orgIdKey="starterOrgId" nameKey="starterBusinessName" orgIdPlaceholder="org_starter…" namePlaceholder="Business name" form={suiteForm} setForm={setSuiteForm} />
                <p className="text-[10px] text-muted-foreground">Seeds: personal_enriched (88 tx · budget · goals · recurring)</p>
              </div>
              <div className="rounded-xl border border-border p-4 space-y-3 bg-muted/20">
                <div className="flex items-center gap-2">
                  <span className={cn('text-[10px] font-bold px-2 py-0.5 rounded-full uppercase', PLAN_BADGE['pro'])}>Pro</span>
                  <ChevronRight className="w-3 h-3 text-muted-foreground" />
                  <span className={cn('text-[10px] font-bold px-2 py-0.5 rounded-full capitalize', MODE_BADGE['freelancer'])}>Freelancer</span>
                </div>
                <SlotField label="Pro Slot" orgIdKey="proOrgId" nameKey="proBusinessName" orgIdPlaceholder="org_pro…" namePlaceholder="Freelancer name" form={suiteForm} setForm={setSuiteForm} />
                <p className="text-[10px] text-muted-foreground">Seeds: freelancer_enriched (107 tx · mileage · invoices · HST · goals)</p>
              </div>
              <div className="rounded-xl border border-border p-4 space-y-3 bg-muted/20">
                <div className="flex items-center gap-2">
                  <span className={cn('text-[10px] font-bold px-2 py-0.5 rounded-full uppercase', PLAN_BADGE['accountant'])}>Accountant</span>
                </div>
                <div className="space-y-1.5">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Firm</p>
                  <Input value={suiteForm['accountantOrgId'] ?? ''} onChange={(e) => setSuiteForm((f) => ({ ...f, accountantOrgId: e.target.value }))} placeholder="org_accountant…" className="font-mono text-xs h-8" />
                  <Input value={suiteForm['firmName'] ?? ''} onChange={(e) => setSuiteForm((f) => ({ ...f, firmName: e.target.value }))} placeholder="Firm display name" className="text-xs h-8" />
                  <Input value={suiteForm['firmSubdomain'] ?? ''} onChange={(e) => setSuiteForm((f) => ({ ...f, firmSubdomain: e.target.value }))} placeholder="subdomain (e.g. clearview)" className="font-mono text-xs h-8" />
                </div>
                <SlotField label="Client 1 – Business" orgIdKey="client1OrgId" nameKey="client1BusinessName" orgIdPlaceholder="org_client1…" namePlaceholder="Client business name" form={suiteForm} setForm={setSuiteForm} />
                <SlotField label="Client 2 – Freelancer" orgIdKey="client2OrgId" nameKey="client2BusinessName" orgIdPlaceholder="org_client2…" namePlaceholder="Client freelancer name" form={suiteForm} setForm={setSuiteForm} />
                <p className="text-[10px] text-muted-foreground">Client 1: business_enriched (99 tx). Client 2: freelancer_enriched (107 tx).</p>
              </div>
            </div>

            <div className="flex flex-col gap-1.5 max-w-xs">
              <Label className="text-xs">Trial / Access End Date (all slots)</Label>
              <Input type="date" value={suiteForm['trialEndsAt'] ?? ''} onChange={(e) => setSuiteForm((f) => ({ ...f, trialEndsAt: e.target.value }))} className="h-8 text-xs" />
            </div>

            {suiteError && <p className="text-sm text-destructive">{suiteError}</p>}

            {suiteResult && (
              <div className="rounded-xl bg-primary-light dark:bg-primary/10 border border-primary/20 px-4 py-4 space-y-2">
                <p className="text-sm font-semibold text-primary mb-3">All 3 slots provisioned ✓</p>
                <ResultRow label="Personal"  businessId={suiteResult.starter.businessId}    created={suiteResult.starter.created} />
                <ResultRow label="Pro"      businessId={suiteResult.pro.businessId}         created={suiteResult.pro.created} />
                <ResultRow label="Acct Biz" businessId={suiteResult.accountant.businessId} created={suiteResult.accountant.created} />
                <ResultRow label="Client 1" businessId={suiteResult.client1.businessId}    created={suiteResult.client1.created} />
                <ResultRow label="Client 2" businessId={suiteResult.client2.businessId}    created={suiteResult.client2.created} />
                <div className="pt-1 flex items-center gap-2 text-xs">
                  <span className="text-muted-foreground w-20">Firm ID</span>
                  <code className="font-mono text-foreground bg-muted px-2 py-0.5 rounded flex-1 truncate">{suiteResult.accountant.firmId}</code>
                  <CopyButton value={suiteResult.accountant.firmId} />
                </div>
              </div>
            )}

            <Button onClick={handleProvision} disabled={provisioning} className="w-full">
              {provisioning
                ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Provisioning all 3…</>
                : 'Provision All 3 & Seed Data'}
            </Button>
          </div>

          {/* Seed Transactions */}
          <div className="rounded-2xl border border-border bg-card p-6 space-y-5">
            <div className="flex items-center gap-2">
              <Database className="w-5 h-5 text-primary" />
              <h2 className="text-base font-semibold text-foreground">Seed Transactions</h2>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label>Business ID</Label>
              <Input value={seedBizId} onChange={(e) => setSeedBizId(e.target.value)} placeholder="Paste or select from Demo Accounts above" className="font-mono text-sm" />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label>Scenario</Label>
              <select value={scenario} onChange={(e) => setScenario(e.target.value)} className={selectCls}>
                {SCENARIOS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </div>

            {seedError && <p className="text-sm text-destructive">{seedError}</p>}

            {seedResult && (
              <div className="rounded-xl bg-primary-light dark:bg-primary/10 border border-primary/20 px-4 py-3">
                <p className="text-sm font-semibold text-primary">{seedResult.inserted} transactions inserted ✓</p>
                <p className="text-xs text-muted-foreground mt-0.5">All transactions are pending – ready to classify for demo.</p>
              </div>
            )}

            {clearResult && (
              <div className="rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 px-4 py-3">
                <p className="text-sm font-semibold text-amber-700 dark:text-amber-400">{clearResult.deleted} synthetic transactions cleared ✓</p>
              </div>
            )}

            <div className="flex gap-3">
              <Button onClick={handleSeed} disabled={seeding || clearing} className="flex-1">
                {seeding ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Seeding…</> : 'Seed Transactions'}
              </Button>
              <Button variant="outline" onClick={handleClear} disabled={seeding || clearing} className="text-destructive hover:text-destructive border-destructive/30 hover:bg-destructive/10">
                {clearing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              The trash button clears only pending synthetic transactions. Posted transactions are not affected.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
