'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Loader2, Plus, Pencil, ToggleRight, ToggleLeft, Copy, Check,
  Link2, Users, Activity, DollarSign, X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

// ── Types ───────────────────────────────────────────────────────────────────
interface Partner {
  id: string;
  name: string;
  type: 'bank' | 'accountant' | 'user' | 'community';
  email: string;
  referral_code: string;
  commission_type: 'percentage' | 'flat';
  commission_value: number;
  is_active: boolean;
  notes: string | null;
  created_at: string;
  click_count: number;
  signup_count: number;
  conversion_count: number;
  total_earned: number;
}

const TYPE_BADGE: Record<string, string> = {
  bank:       'bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400',
  accountant: 'bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400',
  user:       'bg-purple-50 text-purple-700 dark:bg-purple-900/20 dark:text-purple-400',
  community:  'bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400',
};

type SubTab = 'partners' | 'activity' | 'commissions';
const SUB_TABS: { id: SubTab; label: string; icon: typeof Users }[] = [
  { id: 'partners',    label: 'Partners',    icon: Users },
  { id: 'activity',    label: 'Activity',    icon: Activity },
  { id: 'commissions', label: 'Commissions', icon: DollarSign },
];

const EMPTY_FORM = {
  name: '', type: 'user' as Partner['type'], email: '', referral_code: '',
  commission_type: 'percentage' as Partner['commission_type'],
  commission_value: '10', notes: '',
};

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-CA', { month: 'short', day: 'numeric', year: 'numeric' });
}

function fmtEarned(v: number): string {
  return '$' + Number(v).toLocaleString('en-CA', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// ── Copy button ─────────────────────────────────────────────────────────────
function CopyBtn({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button onClick={() => { navigator.clipboard.writeText(value); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
      className="text-muted-foreground hover:text-primary transition-colors p-0.5">
      {copied ? <Check className="w-3 h-3 text-primary" /> : <Copy className="w-3 h-3" />}
    </button>
  );
}

// ── Main Component ──────────────────────────────────────────────────────────
export function ReferralsClient() {
  const [subTab, setSubTab] = useState<SubTab>('partners');

  // ── Partner state ─────────────────────────────────────────────────────
  const [partners, setPartners] = useState<Partner[]>([]);
  const [loading, setLoading] = useState(true);
  const [slideOpen, setSlideOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const loadPartners = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/proxy/admin/referral-partners');
      if (res.ok) setPartners(await res.json());
    } catch { /* non-fatal */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { loadPartners(); }, [loadPartners]);

  function openNew() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setFormError('');
    setSlideOpen(true);
  }

  function openEdit(p: Partner) {
    setEditingId(p.id);
    setForm({
      name: p.name,
      type: p.type,
      email: p.email,
      referral_code: p.referral_code,
      commission_type: p.commission_type,
      commission_value: String(p.commission_value),
      notes: p.notes ?? '',
    });
    setFormError('');
    setSlideOpen(true);
  }

  function slugify(name: string): string {
    return name.toLowerCase().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '').slice(0, 50);
  }

  async function handleSave() {
    if (!form.name.trim()) { setFormError('Partner name is required.'); return; }
    if (!form.email.trim()) { setFormError('Email is required.'); return; }
    const commValue = parseFloat(form.commission_value);
    if (isNaN(commValue) || commValue < 0) { setFormError('Commission value must be a non-negative number.'); return; }

    setSaving(true); setFormError('');
    try {
      if (editingId) {
        const res = await fetch('/api/proxy/admin/referral-partners/' + editingId, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: form.email.trim(),
            commission_type: form.commission_type,
            commission_value: commValue,
            notes: form.notes.trim(),
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message ?? 'Update failed');
      } else {
        const code = form.referral_code.trim() || slugify(form.name);
        const res = await fetch('/api/proxy/admin/referral-partners', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: form.name.trim(),
            type: form.type,
            email: form.email.trim(),
            referral_code: code,
            commission_type: form.commission_type,
            commission_value: commValue,
            notes: form.notes.trim() || undefined,
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message ?? 'Create failed');
      }
      await loadPartners();
      setSlideOpen(false);
      setEditingId(null);
    } catch (e: any) { setFormError(e.message); }
    finally { setSaving(false); }
  }

  async function handleToggle(p: Partner) {
    setTogglingId(p.id);
    try {
      const res = await fetch('/api/proxy/admin/referral-partners/' + p.id, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !p.is_active }),
      });
      if (res.ok) setPartners((prev) => prev.map((item) => item.id === p.id ? { ...item, is_active: !p.is_active } : item));
    } finally { setTogglingId(null); }
  }

  return (
    <div className="rounded-2xl border border-border bg-card overflow-hidden">
      {/* Header */}
      <div className="px-6 pt-6 pb-0">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
              <Link2 className="w-5 h-5 text-primary" />
              Referral Engine
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Manage referral partners, track attribution, and monitor commissions.
            </p>
          </div>
        </div>

        {/* Sub-tabs */}
        <div className="flex gap-1 border-b border-border -mx-6 px-6">
          {SUB_TABS.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setSubTab(tab.id)}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-2 text-sm font-medium border-b-2 -mb-px transition-colors',
                  subTab === tab.id ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground',
                )}
              >
                <Icon className="w-3.5 h-3.5" />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab content */}
      <div className="p-6">
        {/* ── Partners tab ── */}
        {subTab === 'partners' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">{partners.length} partner{partners.length !== 1 ? 's' : ''}</p>
              <Button size="sm" onClick={openNew} className="h-8 gap-1.5">
                <Plus className="w-3.5 h-3.5" />New Partner
              </Button>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-10 gap-2 text-muted-foreground">
                <Loader2 className="w-4 h-4 animate-spin" /><span className="text-sm">Loading partners…</span>
              </div>
            ) : partners.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 gap-3 text-center">
                <div className="w-12 h-12 rounded-xl bg-primary-light dark:bg-primary/10 flex items-center justify-center">
                  <Link2 className="w-6 h-6 text-primary" />
                </div>
                <p className="text-sm font-medium text-foreground">No referral partners yet</p>
                <p className="text-xs text-muted-foreground max-w-xs">
                  Create your first referral partner. They&apos;ll get a unique link to share with their audience.
                </p>
                <Button size="sm" onClick={openNew} className="mt-1 gap-1.5">
                  <Plus className="w-3.5 h-3.5" />Create First Partner
                </Button>
              </div>
            ) : (
              <div className="rounded-xl border border-border overflow-x-auto">
                <table className="w-full text-sm min-w-[700px]">
                  <thead>
                    <tr className="border-b border-border bg-muted/40">
                      <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground">Partner</th>
                      <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground">Type</th>
                      <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground">Code</th>
                      <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground hidden md:table-cell">Commission</th>
                      <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground hidden lg:table-cell">Referrals</th>
                      <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground hidden lg:table-cell">Earned</th>
                      <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground w-20">Status</th>
                      <th className="px-4 py-2.5 w-20" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {partners.map((p) => (
                      <tr key={p.id} className="hover:bg-muted/20 transition-colors">
                        <td className="px-4 py-3">
                          <p className="text-sm font-medium text-foreground">{p.name}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">{p.email}</p>
                        </td>
                        <td className="px-4 py-3">
                          <span className={cn('text-[10px] font-semibold px-2 py-0.5 rounded-full capitalize', TYPE_BADGE[p.type] ?? 'bg-muted text-muted-foreground')}>
                            {p.type}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1">
                            <code className="text-xs font-mono bg-muted px-1.5 py-0.5 rounded text-foreground">{p.referral_code}</code>
                            <CopyBtn value={`https://gettempo.ca/sign-up?ref=${p.referral_code}`} />
                          </div>
                        </td>
                        <td className="px-4 py-3 hidden md:table-cell">
                          <p className="text-xs text-foreground">
                            {p.commission_type === 'percentage' ? `${p.commission_value}%` : `$${Number(p.commission_value).toFixed(2)}`}
                            <span className="text-muted-foreground ml-1">
                              {p.commission_type === 'percentage' ? 'of MRR' : 'flat'}
                            </span>
                          </p>
                        </td>
                        <td className="px-4 py-3 hidden lg:table-cell">
                          <p className="text-xs text-muted-foreground">
                            {p.signup_count} signup{p.signup_count !== 1 ? 's' : ''} · {p.conversion_count} conv.
                          </p>
                        </td>
                        <td className="px-4 py-3 hidden lg:table-cell">
                          <p className="text-xs font-medium text-foreground">{fmtEarned(p.total_earned)}</p>
                        </td>
                        <td className="px-4 py-3">
                          <span className={cn('text-[10px] font-semibold px-2 py-0.5 rounded-full',
                            p.is_active ? 'bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400' : 'bg-muted text-muted-foreground')}>
                            {p.is_active ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1 justify-end">
                            <button onClick={() => openEdit(p)}
                              className="text-muted-foreground hover:text-primary transition-colors p-1 rounded" title="Edit">
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            <button onClick={() => handleToggle(p)} disabled={togglingId === p.id}
                              className={cn('transition-colors p-1 rounded',
                                p.is_active ? 'text-muted-foreground hover:text-amber-500' : 'text-muted-foreground hover:text-green-600')}
                              title={p.is_active ? 'Deactivate' : 'Activate'}>
                              {togglingId === p.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                : p.is_active ? <ToggleRight className="w-3.5 h-3.5" /> : <ToggleLeft className="w-3.5 h-3.5" />}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ── Activity tab (placeholder) ── */}
        {subTab === 'activity' && (
          <div className="flex flex-col items-center justify-center py-12 gap-3 text-center">
            <div className="w-12 h-12 rounded-xl bg-primary-light dark:bg-primary/10 flex items-center justify-center">
              <Activity className="w-6 h-6 text-primary" />
            </div>
            <p className="text-sm font-medium text-foreground">Referral Activity Log</p>
            <p className="text-xs text-muted-foreground max-w-xs">
              All referral events (clicks, signups, conversions, churn) will appear here — built in step 26g.
            </p>
          </div>
        )}

        {/* ── Commissions tab (placeholder) ── */}
        {subTab === 'commissions' && (
          <div className="flex flex-col items-center justify-center py-12 gap-3 text-center">
            <div className="w-12 h-12 rounded-xl bg-primary-light dark:bg-primary/10 flex items-center justify-center">
              <DollarSign className="w-6 h-6 text-primary" />
            </div>
            <p className="text-sm font-medium text-foreground">Commission Tracking</p>
            <p className="text-xs text-muted-foreground max-w-xs">
              Commission accruals, mark-as-paid, and payout history — built in step 26e.
            </p>
          </div>
        )}
      </div>

      {/* ── Create/Edit Slide-over ── */}
      {slideOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-card rounded-2xl border border-border w-full max-w-md shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <h3 className="text-base font-semibold text-foreground">
                {editingId ? 'Edit Partner' : 'New Referral Partner'}
              </h3>
              <button onClick={() => { setSlideOpen(false); setEditingId(null); }}
                className="text-muted-foreground hover:text-foreground p-1 rounded">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="px-6 py-5 space-y-4">
              <div className="space-y-1.5">
                <Label className="text-xs">Partner Name <span className="text-destructive">*</span></Label>
                <Input value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                  placeholder="e.g. TD Ready Commitment" disabled={!!editingId} />
                {editingId && <p className="text-xs text-muted-foreground">Name cannot be changed after creation.</p>}
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Type <span className="text-destructive">*</span></Label>
                <select value={form.type} onChange={(e) => setForm((p) => ({ ...p, type: e.target.value as Partner['type'] }))}
                  disabled={!!editingId}
                  className="w-full text-sm border border-border rounded-lg px-3 py-2 bg-card text-foreground outline-none focus:border-primary">
                  <option value="bank">Bank</option>
                  <option value="accountant">Accountant</option>
                  <option value="user">User</option>
                  <option value="community">Community</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Email <span className="text-destructive">*</span></Label>
                <Input value={form.email} onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
                  placeholder="partner@example.com" />
              </div>
              {!editingId && (
                <div className="space-y-1.5">
                  <Label className="text-xs">Referral Code</Label>
                  <Input value={form.referral_code} onChange={(e) => setForm((p) => ({ ...p, referral_code: e.target.value }))}
                    placeholder={form.name ? slugify(form.name) || 'auto-generated' : 'auto-generated from name'}
                    className="font-mono" />
                  <p className="text-xs text-muted-foreground">
                    URL-safe, lowercase. Leave blank to auto-generate from name. Link: gettempo.ca/sign-up?ref=<span className="font-mono">{form.referral_code || slugify(form.name) || '...'}</span>
                  </p>
                </div>
              )}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Commission Type</Label>
                  <select value={form.commission_type} onChange={(e) => setForm((p) => ({ ...p, commission_type: e.target.value as Partner['commission_type'] }))}
                    className="w-full text-sm border border-border rounded-lg px-3 py-2 bg-card text-foreground outline-none focus:border-primary">
                    <option value="percentage">Percentage of MRR</option>
                    <option value="flat">Flat CAD / period</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Value</Label>
                  <Input type="number" min={0} step="0.01" value={form.commission_value}
                    onChange={(e) => setForm((p) => ({ ...p, commission_value: e.target.value }))}
                    placeholder={form.commission_type === 'percentage' ? '10' : '5.00'} />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Notes</Label>
                <textarea value={form.notes} onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))} rows={3}
                  placeholder="Internal notes about this partner…"
                  className="w-full text-sm border border-border rounded-lg px-3 py-2 bg-card text-foreground resize-none outline-none focus:border-primary focus:ring-1 focus:ring-primary" />
              </div>

              {formError && <p className="text-sm text-destructive">{formError}</p>}

              <div className="flex gap-3 pt-2 border-t border-border">
                <Button variant="outline" onClick={() => { setSlideOpen(false); setEditingId(null); }} className="flex-1">
                  Cancel
                </Button>
                <Button onClick={handleSave} disabled={saving} className="flex-1">
                  {saving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Saving…</> : editingId ? 'Save Changes' : 'Create Partner'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
