'use client';

import { useState, useTransition } from 'react';
import { formatCurrency, cn } from '@/lib/utils';
import { toastSuccess, toastError } from '@/lib/toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus, Pencil, Trash2, ChevronDown, ChevronUp, Calculator } from 'lucide-react';

const CCA_CLASSES = [
  { value: '10',   label: 'Class 10 — Motor Vehicles (30%)',         rate: 0.30 },
  { value: '12',   label: 'Class 12 — Software / Tools (100%)',      rate: 1.00 },
  { value: '14.1', label: 'Class 14.1 — Goodwill / IP (5%)',         rate: 0.05 },
  { value: '50',   label: 'Class 50 — Computer Equipment (55%)',     rate: 0.55 },
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

const selectCls = "text-sm border border-gray-200 rounded-lg px-3 py-2 w-full outline-none bg-white text-gray-900 focus:border-[#0F6E56] dark:bg-[#222019] dark:border-[#3a3730] dark:text-[#f0ede8] dark:focus:border-[#0F6E56]";

interface CcaManagerProps {
  initialAssets: CcaAsset[];
  initialSchedule: ScheduleSummary | null;
}

export function CcaManager({ initialAssets, initialSchedule }: CcaManagerProps) {
  const [assets, setAssets] = useState<CcaAsset[]>(initialAssets);
  const [schedule, setSchedule] = useState<ScheduleSummary | null>(initialSchedule);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [expandedAssets, setExpandedAssets] = useState<Set<string>>(new Set());
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function toggleExpand(id: string) {
    setExpandedAssets((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  function openCreate() {
    setEditingId(null);
    setForm({ ...EMPTY_FORM });
    setError(null);
    setShowForm(true);
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
    setError(null);
    setShowForm(true);
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
      setShowForm(false);
      setEditingId(null);
      await refreshSchedule();
    });
  }

  function handleDelete(asset: CcaAsset) {
    startTransition(async () => {
      const res = await fetch(`/api/proxy/cca/assets/${asset.id}`, { method: 'DELETE' });
      if (res.ok || res.status === 204) {
        setAssets((prev) => prev.filter((a) => a.id !== asset.id));
        toastSuccess('Asset removed', asset.name);
        await refreshSchedule();
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
          <h1 className="text-xl font-semibold text-gray-900 dark:text-[#f0ede8]">Capital Cost Allowance (CCA)</h1>
          <p className="text-sm text-gray-500 dark:text-[#a09888] mt-0.5">
            Track capital assets and calculate annual CRA deductions using declining balance method.
          </p>
        </div>
        <Button onClick={openCreate} className="flex items-center gap-2">
          <Plus className="w-4 h-4" />Add Asset
        </Button>
      </div>

      {/* Add / Edit form */}
      {showForm && (
        <div className="rounded-xl border border-gray-200 dark:border-[#3a3730] bg-white dark:bg-[#1e1c18] p-5 flex flex-col gap-4">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-[#f0ede8]">
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
              <select value={form.cca_class}
                onChange={(e) => setForm((f) => ({ ...f, cca_class: e.target.value }))}
                className={selectCls} disabled={!!editingId}>
                {CCA_CLASSES.map((c) => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Original Cost ($) *</Label>
              <Input type="number" min="0" step="0.01"
                value={form.original_cost}
                onChange={(e) => setForm((f) => ({ ...f, original_cost: e.target.value }))}
                placeholder="e.g. 25000.00" />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Acquisition Date *</Label>
              <Input type="date" value={form.acquisition_date}
                onChange={(e) => setForm((f) => ({ ...f, acquisition_date: e.target.value }))} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Business Use % <span className="text-gray-400 font-normal">(1–100)</span></Label>
              <Input type="number" min="1" max="100" step="1"
                value={form.business_use_percent}
                onChange={(e) => setForm((f) => ({ ...f, business_use_percent: e.target.value }))}
                placeholder="100" />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>UCC Opening Balance <span className="text-gray-400 font-normal">(optional override)</span></Label>
              <Input type="number" min="0" step="0.01"
                value={form.ucc_opening_balance}
                onChange={(e) => setForm((f) => ({ ...f, ucc_opening_balance: e.target.value }))}
                placeholder="Leave blank to use original cost" />
            </div>
            <div className="flex flex-col gap-1.5 sm:col-span-2">
              <Label>Description <span className="text-gray-400 font-normal">(optional)</span></Label>
              <Input value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                placeholder="e.g. Platform development costs 2024–2025" />
            </div>
          </div>
          {error && <p className="text-sm text-red-500">{error}</p>}
          <div className="flex gap-2">
            <Button onClick={handleSave} disabled={isPending}>
              {isPending ? 'Saving\u2026' : editingId ? 'Save Changes' : 'Add Asset'}
            </Button>
            <Button variant="outline" onClick={() => { setShowForm(false); setEditingId(null); }}>Cancel</Button>
          </div>
        </div>
      )}

      {/* Asset list */}
      {assets.length === 0 && !showForm ? (
        <div className="rounded-xl border border-gray-100 dark:border-[#3a3730] bg-white dark:bg-[#1e1c18] flex flex-col items-center justify-center py-16 text-center">
          <Calculator className="w-10 h-10 text-gray-300 dark:text-[#3a3730] mb-3" />
          <p className="text-sm font-medium text-gray-900 dark:text-[#f0ede8] mb-1">No capital assets yet</p>
          <p className="text-sm text-gray-400 dark:text-[#7a7060]">Add assets like software, vehicles, or equipment to track CCA deductions.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {assets.map((asset) => {
            const classInfo = CCA_CLASSES.find((c) => c.value === asset.cca_class);
            const assetSchedule = schedule?.assets.find((s) => s.asset.id === asset.id);
            const currentYearRow = assetSchedule?.schedule.find((r) => r.year === currentYear);
            const isExpanded = expandedAssets.has(asset.id);

            return (
              <div key={asset.id} className="rounded-xl border border-gray-100 dark:border-[#3a3730] bg-white dark:bg-[#1e1c18] overflow-hidden">
                {/* Asset header */}
                <div className="flex items-center gap-3 px-4 py-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-semibold text-gray-900 dark:text-[#f0ede8]">{asset.name}</span>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-[#EDF7F2] text-[#0F6E56] dark:bg-[#0F6E56]/20 dark:text-[#4abe94] font-medium">
                        {classInfo?.label ?? `Class ${asset.cca_class}`}
                      </span>
                      {Number(asset.business_use_percent) < 100 && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400">
                          {asset.business_use_percent}% business use
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 mt-0.5">
                      <span className="text-xs text-gray-400 dark:text-[#7a7060]">
                        Cost: {formatCurrency(Number(asset.original_cost))}
                      </span>
                      <span className="text-xs text-gray-300 dark:text-[#4a4438]">&middot;</span>
                      <span className="text-xs text-gray-400 dark:text-[#7a7060]">
                        Acquired: {asset.acquisition_date}
                      </span>
                      {currentYearRow && (
                        <>
                          <span className="text-xs text-gray-300 dark:text-[#4a4438]">&middot;</span>
                          <span className="text-xs font-medium text-[#0F6E56] dark:text-[#4abe94]">
                            {currentYear} claimable: {formatCurrency(currentYearRow.claimable_amount)}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="sm" onClick={() => openEdit(asset)}
                      className="text-gray-400 hover:text-gray-600 dark:text-[#7a7060] dark:hover:text-[#c8c0b0]">
                      <Pencil className="w-3.5 h-3.5" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => handleDelete(asset)}
                      className="text-gray-400 hover:text-red-500 dark:text-[#7a7060] dark:hover:text-red-400">
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => toggleExpand(asset.id)}
                      className="text-gray-400 dark:text-[#7a7060]">
                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </Button>
                  </div>
                </div>

                {/* Expanded schedule */}
                {isExpanded && assetSchedule && (
                  <div className="border-t border-gray-100 dark:border-[#2a2720] overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="bg-gray-50 dark:bg-[#161410]">
                          <th className="text-left px-4 py-2 font-semibold text-gray-500 dark:text-[#7a7060]">Year</th>
                          <th className="text-right px-4 py-2 font-semibold text-gray-500 dark:text-[#7a7060]">Opening UCC</th>
                          <th className="text-right px-4 py-2 font-semibold text-gray-500 dark:text-[#7a7060]">CCA Deduction</th>
                          <th className="text-right px-4 py-2 font-semibold text-gray-500 dark:text-[#7a7060]">Claimable Amount</th>
                          <th className="text-right px-4 py-2 font-semibold text-gray-500 dark:text-[#7a7060]">Closing UCC</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50 dark:divide-[#1e1c18]">
                        {assetSchedule.schedule.map((row) => (
                          <tr key={row.year}
                            className={cn(
                              'hover:bg-gray-50 dark:hover:bg-[#161410]',
                              row.year === currentYear && 'bg-[#EDF7F2]/40 dark:bg-[#0F6E56]/5',
                            )}>
                            <td className="px-4 py-2 font-medium text-gray-700 dark:text-[#c8c0b0]">
                              {row.year}
                              {row.year === currentYear && (
                                <span className="ml-1.5 text-[10px] text-[#0F6E56] dark:text-[#4abe94] font-semibold">current</span>
                              )}
                            </td>
                            <td className="px-4 py-2 text-right tabular-nums text-gray-600 dark:text-[#a09888]">{formatCurrency(row.opening_ucc)}</td>
                            <td className="px-4 py-2 text-right tabular-nums text-gray-600 dark:text-[#a09888]">{formatCurrency(row.cca_deduction)}</td>
                            <td className="px-4 py-2 text-right tabular-nums font-semibold text-[#0F6E56] dark:text-[#4abe94]">{formatCurrency(row.claimable_amount)}</td>
                            <td className="px-4 py-2 text-right tabular-nums text-gray-600 dark:text-[#a09888]">{formatCurrency(row.closing_ucc)}</td>
                          </tr>
                        ))}
                        <tr className="bg-gray-50 dark:bg-[#161410] font-semibold">
                          <td className="px-4 py-2 text-gray-700 dark:text-[#c8c0b0]">Total</td>
                          <td className="px-4 py-2" />
                          <td className="px-4 py-2 text-right tabular-nums text-gray-700 dark:text-[#c8c0b0]">{formatCurrency(assetSchedule.total_deductions)}</td>
                          <td className="px-4 py-2 text-right tabular-nums text-[#0F6E56] dark:text-[#4abe94]">{formatCurrency(assetSchedule.total_claimable)}</td>
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
        <div className="rounded-xl border border-[#C3E8D8] dark:border-[#0F6E56]/30 bg-[#EDF7F2] dark:bg-[#0F6E56]/10 p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-[#0F6E56] dark:text-[#4abe94]">CCA Summary &mdash; {currentYear}</h3>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {Object.entries(schedule.by_class).map(([cls, info]) => {
              const currentYearClaimable = info.assets.reduce((sum, as) => {
                const row = as.schedule.find((r) => r.year === currentYear);
                return sum + (row?.claimable_amount ?? 0);
              }, 0);
              return (
                <div key={cls} className="bg-white dark:bg-[#1e1c18] rounded-lg p-3">
                  <p className="text-xs font-medium text-gray-500 dark:text-[#a09888] mb-1">{info.label}</p>
                  <p className="text-lg font-bold text-[#0F6E56] dark:text-[#4abe94] tabular-nums">
                    {formatCurrency(currentYearClaimable)}
                  </p>
                  <p className="text-xs text-gray-400 dark:text-[#7a7060]">{currentYear} claimable</p>
                </div>
              );
            })}
          </div>
          <div className="mt-4 pt-4 border-t border-[#C3E8D8] dark:border-[#0F6E56]/20 flex items-center justify-between">
            <span className="text-sm font-medium text-[#0F6E56] dark:text-[#4abe94]">Total {currentYear} CCA Claimable</span>
            <span className="text-xl font-bold text-[#0F6E56] dark:text-[#4abe94] tabular-nums">
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
