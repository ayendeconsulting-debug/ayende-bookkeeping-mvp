'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { formatCurrency, cn } from '@/lib/utils';
import { toastSuccess, toastError } from '@/lib/toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus, Pencil, Trash2, ChevronDown, ChevronUp, Calculator } from 'lucide-react';

const CCA_CLASSES = [
  { value: '10',   label: 'Class 10 – Motor Vehicles (30%)',      rate: 0.30 },
  { value: '12',   label: 'Class 12 – Software / Tools (100%)',   rate: 1.00 },
  { value: '14.1', label: 'Class 14.1 – Goodwill / IP (5%)',      rate: 0.05 },
  { value: '50',   label: 'Class 50 – Computer Equipment (55%)',  rate: 0.55 },
];

interface CcaYearRow {
  year: number;
  opening_ucc: number;
  additions: number;
  cca_deduction: number;
  claimable_amount: number;
  closing_ucc: number;
}

interface CcaAsset {
  id: string;
  name: string;
  description?: string | null;
  cca_class: string;
  rate: number;
  original_cost: number;
  acquisition_date: string;
  business_use_percent: number;
  ucc_opening_balance?: number | null;
}

interface CcaAssetSchedule {
  asset: CcaAsset;
  schedule: CcaYearRow[];
  total_deductions: number;
  total_claimable: number;
}

interface ScheduleSummary {
  assets: CcaAssetSchedule[];
  by_class: Record<string, {
    label: string;
    rate: number;
    total_cost: number;
    total_claimable: number;
    assets: CcaAssetSchedule[];
  }>;
  grand_total_claimable: number;
}

const EMPTY_FORM = {
  name: '',
  description: '',
  cca_class: '12',
  original_cost: '',
  acquisition_date: new Date().toISOString().split('T')[0],
  business_use_percent: '100',
  ucc_opening_balance: '',
};

interface CcaManagerProps {
  initialAssets: CcaAsset[];
  initialSchedule: ScheduleSummary | null;
}

export function CcaManager({ initialAssets, initialSchedule }: CcaManagerProps) {
  const router = useRouter();
  const [assets, setAssets] = useState<CcaAsset[]>(initialAssets);
  const [schedule, setSchedule] = useState<ScheduleSummary | null>(initialSchedule);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [expandedAssets, setExpandedAssets] = useState<Set<string>>(new Set());
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const selectCls = 'text-sm border border-input rounded-lg px-3 py-2 w-full outline-none bg-card text-foreground focus:border-primary';

  function toggleExpand(id: string) {
    setExpandedAssets((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  function openCreate() {
    setEditingId(null); setForm({ ...EMPTY_FORM }); setError(null); setShowForm(true);
  }

  function openEdit(asset: CcaAsset) {
    setEditingId(asset.id);
    setForm({
      name: asset.name,
      description: asset.description ?? '',
      cca_class: asset.cca_class,
      original_cost: String(asset.original_cost),
      acquisition_date: asset.acquisition_date,
      business_use_percent: String(asset.business_use_percent),
      ucc_opening_balance: asset.ucc_opening_balance != null ? String(asset.ucc_opening_balance) : '',
    });
    setError(null); setShowForm(true);
  }

  async function refreshSchedule() {
    try {
      const res = await fetch('/api/proxy/cca/schedule');
      if (res.ok) setSchedule(await res.json());
    } catch { /* non-critical */ }
  }

  function handleSave() {
    if (!form.name.trim()) { setError('Asset name is required.'); return; }
    if (!form.original_cost || isNaN(Number(form.original_cost))) { setError('Original cost is required.'); return; }
    if (!form.acquisition_date) { setError('Acquisition date is required.'); return; }

    setError(null);
    startTransition(async () => {
      const payload: any = {
        name: form.name.trim(),
        description: form.description || null,
        cca_class: form.cca_class,
        original_cost: Number(form.original_cost),
        acquisition_date: form.acquisition_date,
        business_use_percent: Number(form.business_use_percent) || 100,
        ucc_opening_balance: form.ucc_opening_balance ? Number(form.ucc_opening_balance) : null,
      };

      const url    = editingId ? `/api/proxy/cca/assets/${editingId}` : '/api/proxy/cca/assets';
      const method = editingId ? 'PATCH' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError(body.message ?? 'Failed to save asset.');
        return;
      }

      const saved = await res.json();
      if (editingId) {
        setAssets((prev) => prev.map((a) => a.id === editingId ? saved : a));
        toastSuccess('Asset updated', form.name);
      } else {
        setAssets((prev) => [saved, ...prev]);
        toastSuccess('Asset added', form.name);
      }
      setShowForm(false); setEditingId(null);
      await refreshSchedule();
      router.refresh();
    });
  }

  function handleDelete(asset: CcaAsset) {
    startTransition(async () => {
      const res = await fetch(`/api/proxy/cca/assets/${asset.id}`, { method: 'DELETE' });
      if (res.ok || res.status === 204) {
        setAssets((prev) => prev.filter((a) => a.id !== asset.id));
        toastSuccess('Asset removed', asset.name);
        await refreshSchedule();
        router.refresh();
      } else {
        toastError('Failed to remove asset');
      }
    });
  }

  const currentYear = new Date().getFullYear();

  return (
    <div className="p-6 max-w-screen-lg mx-auto flex flex-col gap-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Capital Cost Allowance (CCA)</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Track capital assets and calculate annual CRA deductions using declining balance method.
          </p>
        </div>
        <Button onClick={openCreate} className="flex items-center gap-2">
          <Plus className="w-4 h-4" />Add Asset
        </Button>
      </div>

      {/* Add / Edit form */}
      {showForm && (
        <div className="rounded-xl border border-border bg-card p-5 flex flex-col gap-4">
          <h3 className="text-sm font-semibold text-foreground">
            {editingId ? 'Edit Asset' : 'Add Capital Asset'}
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <Label>Asset Name *</Label>
              <Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="e.g. Tempo Books Platform, Toyota Camry 2023" />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>CCA Class *</Label>
              <select value={form.cca_class} onChange={(e) => setForm((f) => ({ ...f, cca_class: e.target.value }))}
                className={selectCls} disabled={!!editingId}>
                {CCA_CLASSES.map((c) => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Original Cost ($) *</Label>
              <Input type="number" min="0" step="0.01" value={form.original_cost}
                onChange={(e) => setForm((f) => ({ ...f, original_cost: e.target.value }))}
                placeholder="e.g. 25000.00" />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Acquisition Date *</Label>
              <Input type="date" value={form.acquisition_date}
                onChange={(e) => setForm((f) => ({ ...f, acquisition_date: e.target.value }))} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Business Use % <span className="text-muted-foreground font-normal">(1–100)</span></Label>
              <Input type="number" min="1" max="100" step="1" value={form.business_use_percent}
                onChange={(e) => setForm((f) => ({ ...f, business_use_percent: e.target.value }))}
                placeholder="100" />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>UCC Opening Balance <span className="text-muted-foreground font-normal">(optional override)</span></Label>
              <Input type="number" min="0" step="0.01" value={form.ucc_opening_balance}
                onChange={(e) => setForm((f) => ({ ...f, ucc_opening_balance: e.target.value }))}
                placeholder="Leave blank to use original cost" />
            </div>
            <div className="flex flex-col gap-1.5 sm:col-span-2">
              <Label>Description <span className="text-muted-foreground font-normal">(optional)</span></Label>
              <Input value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                placeholder="e.g. Platform development costs 2024–2025" />
            </div>
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <div className="flex gap-2">
            <Button onClick={handleSave} disabled={isPending}>
              {isPending ? 'Saving…' : editingId ? 'Save Changes' : 'Add Asset'}
            </Button>
            <Button variant="outline" onClick={() => { setShowForm(false); setEditingId(null); }}>Cancel</Button>
          </div>
        </div>
      )}

      {/* Asset list */}
      {assets.length === 0 && !showForm ? (
        <div className="rounded-xl border border-border bg-card flex flex-col items-center justify-center py-16 text-center">
          <Calculator className="w-10 h-10 text-muted-foreground/20 mb-3" />
          <p className="text-sm font-medium text-foreground mb-1">No capital assets yet</p>
          <p className="text-sm text-muted-foreground">Add assets like software, vehicles, or equipment to track CCA deductions.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {assets.map((asset) => {
            const classInfo      = CCA_CLASSES.find((c) => c.value === asset.cca_class);
            const assetSchedule  = schedule?.assets.find((s) => s.asset.id === asset.id);
            const currentYearRow = assetSchedule?.schedule.find((r) => r.year === currentYear);
            const isExpanded     = expandedAssets.has(asset.id);

            return (
              <div key={asset.id} className="rounded-xl border border-border bg-card overflow-hidden">
                <div className="flex items-center gap-3 px-4 py-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-semibold text-foreground">{asset.name}</span>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-primary-light text-primary dark:bg-primary/20 font-medium">
                        {classInfo?.label ?? `Class ${asset.cca_class}`}
                      </span>
                      {Number(asset.business_use_percent) < 100 && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400">
                          {asset.business_use_percent}% business use
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 mt-0.5">
                      <span className="text-xs text-muted-foreground">Cost: {formatCurrency(Number(asset.original_cost))}</span>
                      <span className="text-xs text-border">·</span>
                      <span className="text-xs text-muted-foreground">Acquired: {asset.acquisition_date}</span>
                      {currentYearRow && (
                        <>
                          <span className="text-xs text-border">·</span>
                          <span className="text-xs font-medium text-primary">
                            {currentYear} claimable: {formatCurrency(currentYearRow.claimable_amount)}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="sm" onClick={() => openEdit(asset)}
                      className="text-muted-foreground hover:text-foreground">
                      <Pencil className="w-3.5 h-3.5" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => handleDelete(asset)}
                      className="text-muted-foreground hover:text-destructive">
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => toggleExpand(asset.id)}
                      className="text-muted-foreground">
                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </Button>
                  </div>
                </div>

                {isExpanded && assetSchedule && (
                  <div className="border-t border-border overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="bg-muted">
                          <th className="text-left px-4 py-2 font-semibold text-muted-foreground">Year</th>
                          <th className="text-right px-4 py-2 font-semibold text-muted-foreground">Opening UCC</th>
                          <th className="text-right px-4 py-2 font-semibold text-muted-foreground">CCA Deduction</th>
                          <th className="text-right px-4 py-2 font-semibold text-muted-foreground">Claimable Amount</th>
                          <th className="text-right px-4 py-2 font-semibold text-muted-foreground">Closing UCC</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {assetSchedule.schedule.map((row) => (
                          <tr key={row.year} className={cn(
                            'hover:bg-muted/50',
                            row.year === currentYear && 'bg-primary/5',
                          )}>
                            <td className="px-4 py-2 font-medium text-foreground">
                              {row.year}
                              {row.year === currentYear && (
                                <span className="ml-1.5 text-[10px] text-primary font-semibold">current</span>
                              )}
                            </td>
                            <td className="px-4 py-2 text-right tabular-nums text-muted-foreground">{formatCurrency(row.opening_ucc)}</td>
                            <td className="px-4 py-2 text-right tabular-nums text-muted-foreground">{formatCurrency(row.cca_deduction)}</td>
                            <td className="px-4 py-2 text-right tabular-nums font-semibold text-primary">{formatCurrency(row.claimable_amount)}</td>
                            <td className="px-4 py-2 text-right tabular-nums text-muted-foreground">{formatCurrency(row.closing_ucc)}</td>
                          </tr>
                        ))}
                        <tr className="bg-muted font-semibold">
                          <td className="px-4 py-2 text-foreground">Total</td>
                          <td className="px-4 py-2" />
                          <td className="px-4 py-2 text-right tabular-nums text-foreground">{formatCurrency(assetSchedule.total_deductions)}</td>
                          <td className="px-4 py-2 text-right tabular-nums text-primary">{formatCurrency(assetSchedule.total_claimable)}</td>
                          <td className="px-4 py-2" />
                        </tr>
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Summary */}
      {schedule && assets.length > 0 && (
        <div className="rounded-xl border border-primary/30 bg-primary-light dark:bg-primary/10 p-5">
          <h3 className="text-sm font-semibold text-primary mb-3">CCA Summary – {currentYear}</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {Object.entries(schedule.by_class).map(([cls, info]) => {
              const currentYearClaimable = info.assets.reduce((sum, as) => {
                const row = as.schedule.find((r) => r.year === currentYear);
                return sum + (row?.claimable_amount ?? 0);
              }, 0);
              return (
                <div key={cls} className="bg-card rounded-lg p-3">
                  <p className="text-xs font-medium text-muted-foreground mb-1">{info.label}</p>
                  <p className="text-lg font-bold text-primary tabular-nums">{formatCurrency(currentYearClaimable)}</p>
                  <p className="text-xs text-muted-foreground">{currentYear} claimable</p>
                </div>
              );
            })}
          </div>
          <div className="mt-4 pt-4 border-t border-primary/20 flex items-center justify-between">
            <span className="text-sm font-medium text-primary">Total {currentYear} CCA Claimable</span>
            <span className="text-xl font-bold text-primary tabular-nums">
              {formatCurrency(schedule.assets.reduce((sum, as) => {
                const row = as.schedule.find((r) => r.year === currentYear);
                return sum + (row?.claimable_amount ?? 0);
              }, 0))}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
