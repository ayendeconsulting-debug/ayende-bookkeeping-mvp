'use client';

import { useState, useTransition } from 'react';
import {
  Receipt, AlertCircle, Loader2, Download, FileText,
  Lock, CheckCircle2, Plus, ChevronDown,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toastSuccess, toastError } from '@/lib/toast';
import {
  HstPeriod,
  CraReport,
  getCraReport,
  createHstPeriod,
  filePeriod,
  lockPeriod,
} from '@/app/(app)/reports/hst/actions';

interface Props {
  initialPeriods: HstPeriod[];
  initialError?: string;
}

// -- Helpers ------------------------------------------------------------------

function pad(n: number) { return String(n).padStart(2, '0'); }

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('en-CA', { year: 'numeric', month: 'short', day: 'numeric' });
}

function periodLabel(p: HstPeriod) {
  return `${formatDate(p.period_start)} \u2192 ${formatDate(p.period_end)} (${p.frequency})`;
}

/** Returns CRA-aligned start/end dates for the given frequency based on today's date. */
function getDatesForFrequency(freq: 'monthly' | 'quarterly' | 'annual'): { start: string; end: string } {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth(); // 0-based

  if (freq === 'monthly') {
    const lastDay = new Date(y, m + 1, 0).getDate();
    return {
      start: `${y}-${pad(m + 1)}-01`,
      end:   `${y}-${pad(m + 1)}-${pad(lastDay)}`,
    };
  }

  if (freq === 'quarterly') {
    // CRA quarters: Q1=Jan-Mar, Q2=Apr-Jun, Q3=Jul-Sep, Q4=Oct-Dec
    const qStartMonth = Math.floor(m / 3) * 3; // 0, 3, 6, or 9
    const qEndMonth   = qStartMonth + 2;
    const lastDay = new Date(y, qEndMonth + 1, 0).getDate();
    return {
      start: `${y}-${pad(qStartMonth + 1)}-01`,
      end:   `${y}-${pad(qEndMonth + 1)}-${pad(lastDay)}`,
    };
  }

  // annual
  return {
    start: `${y}-01-01`,
    end:   `${y}-12-31`,
  };
}

function StatusBadge({ status }: { status: HstPeriod['status'] }) {
  const cfg: Record<string, string> = {
    open:   'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/30 dark:text-blue-400 dark:border-blue-800',
    filed:  'bg-[#EDF7F2] text-[#0F6E56] border-[#C3E8D8] dark:bg-[#0F6E56]/10 dark:text-emerald-400 dark:border-[#0F6E56]/30',
    locked: 'bg-gray-100 text-gray-600 border-gray-300 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700',
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${cfg[status] ?? cfg.open}`}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}

// -- GST34 Line Row -----------------------------------------------------------

function Gst34Row({
  line, label, amount, highlight, editable, editValue, onEditChange,
}: {
  line: string;
  label: string;
  amount: number;
  highlight?: boolean;
  editable?: boolean;
  editValue?: string;
  onEditChange?: (v: string) => void;
}) {
  const amtClass = highlight
    ? amount < 0 ? 'text-[#0F6E56] font-semibold' : amount > 0 ? 'text-amber-600 font-semibold' : 'text-foreground font-semibold'
    : 'text-foreground';

  return (
    <div className={`flex items-center justify-between px-4 py-2.5 ${highlight ? 'bg-muted rounded-lg' : ''}`}>
      <div className="flex items-center gap-3">
        <span className="text-xs font-mono text-muted-foreground w-10 flex-shrink-0">L{line}</span>
        <span className={`text-sm ${highlight ? 'font-medium text-foreground' : 'text-muted-foreground'}`}>{label}</span>
      </div>
      {editable ? (
        <div className="w-32">
          <Input
            type="number"
            min="0"
            step="0.01"
            value={editValue}
            onChange={(e) => onEditChange?.(e.target.value)}
            className="text-right text-sm h-8"
            placeholder="0.00"
          />
        </div>
      ) : (
        <span className={`text-sm tabular-nums ${amtClass}`}>
          ${Math.abs(amount).toFixed(2)}
          {line === '113' && amount < 0 && <span className="text-xs font-normal ml-1 text-[#0F6E56]">CR</span>}
          {line === '113' && amount > 0 && <span className="text-xs font-normal ml-1 text-amber-600">DUE</span>}
        </span>
      )}
    </div>
  );
}

// -- Create Period Form -------------------------------------------------------

function CreatePeriodForm({ onCreated }: { onCreated: (p: HstPeriod) => void }) {
  const [open, setOpen]       = useState(false);
  const [freq, setFreq]       = useState<'monthly' | 'quarterly' | 'annual'>('quarterly');
  const [start, setStart]     = useState('');
  const [end, setEnd]         = useState('');
  const [saving, startSaving] = useTransition();
  const [error, setError]     = useState<string | null>(null);

  function handleOpen() {
    const dates = getDatesForFrequency('quarterly');
    setFreq('quarterly');
    setStart(dates.start);
    setEnd(dates.end);
    setError(null);
    setOpen(true);
  }

  function handleFreqChange(newFreq: 'monthly' | 'quarterly' | 'annual') {
    setFreq(newFreq);
    const dates = getDatesForFrequency(newFreq);
    setStart(dates.start);
    setEnd(dates.end);
  }

  function handleCreate() {
    setError(null);
    if (!start || !end) { setError('Start and end dates are required.'); return; }
    startSaving(async () => {
      const result = await createHstPeriod({ period_start: start, period_end: end, frequency: freq });
      if (result.error) { setError(result.error); return; }
      if (result.data) {
        onCreated(result.data);
        toastSuccess('Period created', periodLabel(result.data));
        setOpen(false);
      }
    });
  }

  if (!open) {
    return (
      <Button variant="outline" size="sm" onClick={handleOpen} className="flex items-center gap-2">
        <Plus className="w-4 h-4" /> New Period
      </Button>
    );
  }

  return (
    <div className="border border-border rounded-xl p-4 flex flex-col gap-3 bg-card">
      <h3 className="text-sm font-semibold text-foreground">Create HST Period</h3>
      <div className="grid grid-cols-3 gap-3">
        <div className="flex flex-col gap-1">
          <Label className="text-xs">Frequency</Label>
          <select
            value={freq}
            onChange={(e) => handleFreqChange(e.target.value as typeof freq)}
            className="text-sm border border-border rounded-lg px-2 py-1.5 h-8 bg-background text-foreground outline-none focus:border-[#0F6E56]"
          >
            <option value="monthly">Monthly</option>
            <option value="quarterly">Quarterly</option>
            <option value="annual">Annual</option>
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <Label className="text-xs">Start Date</Label>
          <Input type="date" value={start} onChange={(e) => setStart(e.target.value)} className="h-8 text-sm" />
        </div>
        <div className="flex flex-col gap-1">
          <Label className="text-xs">End Date</Label>
          <Input type="date" value={end} onChange={(e) => setEnd(e.target.value)} className="h-8 text-sm" />
        </div>
      </div>
      <p className="text-xs text-muted-foreground -mt-1">
        Dates auto-populate based on frequency. You can adjust them manually if needed.
      </p>
      {error && <p className="text-xs text-destructive">{error}</p>}
      <div className="flex items-center gap-2">
        <Button size="sm" onClick={handleCreate} disabled={saving} className="flex items-center gap-1.5">
          {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
          Create
        </Button>
        <Button size="sm" variant="outline" onClick={() => setOpen(false)} disabled={saving}>Cancel</Button>
      </div>
    </div>
  );
}

// -- Main Client Component ----------------------------------------------------

export function HstReportClient({ initialPeriods, initialError }: Props) {
  const [periods, setPeriods]         = useState<HstPeriod[]>(initialPeriods);
  const [selectedId, setSelectedId]   = useState<string>(initialPeriods[0]?.id ?? '');
  const [report, setReport]           = useState<CraReport | null>(null);
  const [instalments, setInstalments] = useState('0');
  const [loading, startLoading]       = useTransition();
  const [actionPending, startAction]  = useTransition();
  const [error, setError]             = useState<string | null>(initialError ?? null);

  const selectedPeriod = periods.find((p) => p.id === selectedId) ?? null;

  function handleLoad() {
    if (!selectedId) return;
    setError(null);
    startLoading(async () => {
      const result = await getCraReport(selectedId, parseFloat(instalments) || 0);
      if (result.error) { setError(result.error); return; }
      setReport(result.data ?? null);
    });
  }

  function handlePeriodCreated(p: HstPeriod) {
    setPeriods((prev) => [p, ...prev]);
    setSelectedId(p.id);
    setReport(null);
  }

  function handleFile() {
    if (!selectedId) return;
    startAction(async () => {
      const result = await filePeriod(selectedId);
      if (result.error) { toastError('Could not file period', result.error); return; }
      setPeriods((prev) => prev.map((p) => p.id === selectedId ? { ...p, status: 'filed' as const } : p));
      if (report && result.data) setReport({ ...report, period: result.data });
      toastSuccess('Period filed', 'Status updated to Filed.');
    });
  }

  function handleLock() {
    if (!selectedId) return;
    startAction(async () => {
      const result = await lockPeriod(selectedId);
      if (result.error) { toastError('Could not lock period', result.error); return; }
      setPeriods((prev) => prev.map((p) => p.id === selectedId ? { ...p, status: 'locked' as const } : p));
      if (report && result.data) setReport({ ...report, period: result.data });
      toastSuccess('Period locked', 'No further postings allowed in this period.');
    });
  }

  function downloadPdf() {
    if (!selectedId) return;
    const params = new URLSearchParams({ period_id: selectedId, instalments_paid: instalments });
    window.open(`${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3005'}/tax/hst/report/export/pdf?${params}`, '_blank');
  }

  function downloadCsv() {
    if (!selectedId) return;
    const params = new URLSearchParams({ period_id: selectedId, instalments_paid: instalments });
    window.open(`${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3005'}/tax/hst/report/export/csv?${params}`, '_blank');
  }

  return (
    <div className="p-4 md:p-6 max-w-screen-lg mx-auto">

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Receipt className="w-5 h-5 text-muted-foreground" />
          <h1 className="text-xl font-semibold text-foreground">HST / GST Remittance Report</h1>
        </div>
        <div className="flex items-center gap-2">
          {report && (
            <>
              <Button variant="outline" size="sm" onClick={downloadCsv} className="flex items-center gap-1.5">
                <Download className="w-3.5 h-3.5" /> CSV
              </Button>
              <Button variant="outline" size="sm" onClick={downloadPdf} className="flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5" /> PDF
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Period selector + controls */}
      <div className="flex flex-col gap-4 mb-6">
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex flex-col gap-1 min-w-[280px]">
            <Label className="text-xs">HST Period</Label>
            <div className="relative">
              <select
                value={selectedId}
                onChange={(e) => { setSelectedId(e.target.value); setReport(null); }}
                className="w-full appearance-none text-sm border border-border rounded-lg px-3 py-2 pr-8 outline-none focus:border-[#0F6E56] bg-background text-foreground"
              >
                {periods.length === 0 && <option value="">&mdash; No periods &mdash;</option>}
                {periods.map((p) => (
                  <option key={p.id} value={p.id}>{periodLabel(p)}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-2.5 top-2.5 w-4 h-4 text-muted-foreground pointer-events-none" />
            </div>
          </div>

          <div className="flex flex-col gap-1 w-40">
            <Label className="text-xs">Line 111 &mdash; Instalments Paid</Label>
            <Input
              type="number"
              min="0"
              step="0.01"
              value={instalments}
              onChange={(e) => { setInstalments(e.target.value); setReport(null); }}
              placeholder="0.00"
              className="h-9 text-sm"
            />
          </div>

          <Button onClick={handleLoad} disabled={loading || !selectedId} className="flex items-center gap-2 h-9">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Receipt className="w-4 h-4" />}
            {loading ? 'Loading\u2026' : 'Generate Report'}
          </Button>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <CreatePeriodForm onCreated={handlePeriodCreated} />
          {selectedPeriod && (
            <>
              <StatusBadge status={selectedPeriod.status} />
              {selectedPeriod.status === 'open' && (
                <Button variant="outline" size="sm" onClick={handleFile} disabled={actionPending} className="flex items-center gap-1.5">
                  {actionPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5 text-[#0F6E56]" />}
                  Mark as Filed
                </Button>
              )}
              {selectedPeriod.status === 'filed' && (
                <Button variant="outline" size="sm" onClick={handleLock} disabled={actionPending} className="flex items-center gap-1.5 text-destructive hover:text-destructive">
                  {actionPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Lock className="w-3.5 h-3.5" />}
                  Lock Period
                </Button>
              )}
            </>
          )}
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 text-sm text-destructive mb-4">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />{error}
        </div>
      )}

      {periods.length === 0 && !error && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center gap-3">
            <Receipt className="w-8 h-8 text-muted-foreground" />
            <p className="text-sm font-medium text-foreground">No HST periods yet</p>
            <p className="text-xs text-muted-foreground max-w-sm">
              Create your first HST period to generate a CRA remittance report. Periods track your output tax and ITCs for each filing interval.
            </p>
          </CardContent>
        </Card>
      )}

      {report && (
        <div className="flex flex-col gap-5">

          {report.unposted_transaction_count > 0 && (
            <div className="flex items-start gap-2 rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 px-4 py-3">
              <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
              <p className="text-xs text-amber-700 dark:text-amber-400">
                {report.unposted_transaction_count} unposted transaction{report.unposted_transaction_count > 1 ? 's' : ''} exist within this period.
                This report may be incomplete &mdash; post all transactions before filing.
              </p>
            </div>
          )}

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">GST/HST Return Summary</CardTitle>
              <p className="text-xs text-muted-foreground">
                Period: {formatDate(report.period.period_start)} to {formatDate(report.period.period_end)}
              </p>
            </CardHeader>
            <CardContent className="flex flex-col gap-1 pt-0">
              <Gst34Row line="101" label="Total Sales and Other Revenue"    amount={report.line_101_total_sales} />
              <Gst34Row line="103" label="GST/HST Collected or Collectible" amount={report.line_103_hst_collected} />
              <div className="h-px bg-border mx-4 my-1" />
              <Gst34Row line="106" label="Input Tax Credits (ITCs)"         amount={report.line_106_itc_claimed} />
              <div className="h-px bg-border mx-4 my-1" />
              <Gst34Row line="109" label="Net Tax (Line 103 \u2212 Line 106)" amount={report.line_109_net_tax} highlight />
              <Gst34Row
                line="111"
                label="Instalments Already Paid"
                amount={report.line_111_instalments}
                editable
                editValue={instalments}
                onEditChange={(v) => {
                  setInstalments(v);
                  setReport({ ...report, line_111_instalments: parseFloat(v) || 0, line_113_balance: report.line_109_net_tax - (parseFloat(v) || 0) });
                }}
              />
              <div className="h-px bg-border mx-4 my-1" />
              <Gst34Row line="113" label="Balance Owing / Refund Claimed" amount={report.line_113_balance} highlight />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">ITC Summary</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-muted rounded-lg px-4 py-3">
                  <p className="text-xs text-muted-foreground mb-1">Total Input Tax Paid</p>
                  <p className="text-sm font-semibold text-foreground">${report.total_input_tax.toFixed(2)}</p>
                </div>
                <div className="bg-[#EDF7F2] dark:bg-[#0F6E56]/10 rounded-lg px-4 py-3">
                  <p className="text-xs text-[#0F6E56] mb-1">ITC Eligible (Recoverable)</p>
                  <p className="text-sm font-semibold text-[#0F6E56]">${report.line_106_itc_claimed.toFixed(2)}</p>
                </div>
                <div className="bg-muted rounded-lg px-4 py-3">
                  <p className="text-xs text-muted-foreground mb-1">Non-Recoverable</p>
                  <p className="text-sm font-semibold text-foreground">${report.total_itc_non_recoverable.toFixed(2)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {report.transactions.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Transaction Breakdown</CardTitle>
                <p className="text-xs text-muted-foreground">{report.transactions.length} tax transaction{report.transactions.length !== 1 ? 's' : ''}</p>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead>Tax Code</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead className="text-right">Tax Amount</TableHead>
                        <TableHead className="text-right">ITC Amount</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {report.transactions.map((tx, i) => (
                        <TableRow key={i}>
                          <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                            {new Date(tx.entry_date).toLocaleDateString('en-CA', { month: 'short', day: 'numeric' })}
                          </TableCell>
                          <TableCell className="max-w-[200px] truncate text-sm">{tx.description}</TableCell>
                          <TableCell className="text-xs font-mono">{tx.tax_code}</TableCell>
                          <TableCell>
                            <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${tx.tax_type === 'output' ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400' : 'bg-blue-50 text-blue-700 dark:bg-blue-950/30 dark:text-blue-400'}`}>
                              {tx.tax_type}
                            </span>
                          </TableCell>
                          <TableCell className="text-right text-sm tabular-nums">${tx.tax_amount.toFixed(2)}</TableCell>
                          <TableCell className="text-right text-sm tabular-nums text-[#0F6E56]">
                            {tx.itc_amount > 0 ? `$${tx.itc_amount.toFixed(2)}` : '\u2014'}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          )}

          {report.transactions.length === 0 && (
            <Card>
              <CardContent className="py-8 text-center text-sm text-muted-foreground">
                No tax transactions posted in this period yet.
              </CardContent>
            </Card>
          )}

          <p className="text-xs text-muted-foreground px-1">{report.disclaimer}</p>
        </div>
      )}
    </div>
  );
}
