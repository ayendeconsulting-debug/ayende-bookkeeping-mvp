'use client';

import { useState, useTransition } from 'react';
import {
  Download, FileText, Sparkles, Loader2,
  AlertCircle, CheckCircle2, ChevronDown, ChevronUp,
} from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { IncomeStatementChart } from '@/components/charts/income-statement-chart';
import { BalanceSheetChart }    from '@/components/charts/balance-sheet-chart';
import { getReportNarrative, downloadReport } from '@/app/(app)/reports/[type]/actions';

/* ── Types ───────────────────────────────────────────────────────────────── */

interface ReportViewerProps {
  type:      string;
  label:     string;
  data:      any;
  startDate: string;
  endDate:   string;
}

/* ── Download helper ─────────────────────────────────────────────────────── */

function triggerDownload(base64: string, filename: string, format: 'pdf' | 'csv') {
  const mimeType = format === 'pdf' ? 'application/pdf' : 'text/csv';
  const byteChars = atob(base64);
  const byteArray = new Uint8Array(byteChars.length);
  for (let i = 0; i < byteChars.length; i++) byteArray[i] = byteChars.charCodeAt(i);
  const blob = new Blob([byteArray], { type: mimeType });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

/* ── Export buttons ──────────────────────────────────────────────────────── */

function ExportButtons({ type, params }: { type: string; params: Record<string, string> }) {
  const [loadingPdf, startPdf] = useTransition();
  const [loadingCsv, startCsv] = useTransition();
  const [error, setError] = useState<string | null>(null);

  async function handleExport(format: 'pdf' | 'csv', start: (fn: () => void) => void) {
    setError(null);
    start(async () => {
      const result = await downloadReport(type, format, params);
      if (result.success && result.data && result.filename) {
        triggerDownload(result.data, result.filename, format);
      } else {
        setError(result.error ?? 'Export failed.');
      }
    });
  }

  return (
    <div className="flex items-center gap-2 flex-shrink-0">
      {error && <span className="text-xs text-destructive">{error}</span>}
      <Button variant="outline" size="sm" onClick={() => handleExport('csv', startCsv)} disabled={loadingCsv || loadingPdf} className="flex items-center gap-1.5">
        {loadingCsv ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
        CSV
      </Button>
      <Button variant="outline" size="sm" onClick={() => handleExport('pdf', startPdf)} disabled={loadingPdf || loadingCsv} className="flex items-center gap-1.5">
        {loadingPdf ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileText className="w-3.5 h-3.5" />}
        PDF
      </Button>
    </div>
  );
}

/* ── AI Narrative panel ──────────────────────────────────────────────────── */

function NarrativePanel({ type, params }: { type: 'income-statement' | 'balance-sheet'; params: Record<string, string> }) {
  const [open, setOpen]           = useState(false);
  const [narrative, setNarrative] = useState<string | null>(null);
  const [loading, startLoading]   = useTransition();
  const [error, setError]         = useState<string | null>(null);

  async function handleLoad() {
    if (narrative) { setOpen((v) => !v); return; }
    setOpen(true); setError(null);
    startLoading(async () => {
      const result = await getReportNarrative(type, params);
      if (result.success) { setNarrative(result.narrative ?? null); }
      else { setError(result.error ?? 'Failed to generate narrative.'); }
    });
  }

  return (
    <div className="mt-4">
      <button onClick={handleLoad} className="flex items-center gap-2 text-sm text-[#0F6E56] hover:text-[#0a5a45] dark:text-primary dark:hover:text-primary/80 font-medium transition-colors">
        <Sparkles className="w-4 h-4" />
        {open ? 'Hide' : 'Show'} AI narrative
        {open ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
      </button>
      {open && (
        <div className="mt-3 bg-[#EDF7F2] border border-[#C3E8D8] dark:bg-primary/10 dark:border-primary/30 rounded-xl px-4 py-4">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="w-4 h-4 text-[#0F6E56] dark:text-primary" />
            <span className="text-sm font-medium text-[#0F6E56] dark:text-primary">AI Summary</span>
          </div>
          {loading  && <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="w-4 h-4 animate-spin" />Generating narrative…</div>}
          {error    && <div className="flex items-center gap-1.5 text-sm text-destructive"><AlertCircle className="w-4 h-4" />{error}</div>}
          {narrative && !loading && <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">{narrative}</p>}
          <p className="text-xs text-muted-foreground mt-3">AI narratives are for guidance only — always verify with your accountant.</p>
        </div>
      )}
    </div>
  );
}

/* ── Report tables ───────────────────────────────────────────────────────── */

function IncomeStatementTable({ data }: { data: any }) {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 px-4">Revenue</h3>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader><TableRow><TableHead>Account</TableHead><TableHead className="text-right">Amount</TableHead></TableRow></TableHeader>
            <TableBody>
              {(data.revenue ?? []).map((line: any) => (
                <TableRow key={line.account_id}>
                  <TableCell><span className="text-xs text-muted-foreground mr-2">{line.account_code}</span>{line.account_name}</TableCell>
                  <TableCell className="text-right text-[#0F6E56] dark:text-primary font-medium">{formatCurrency(line.amount)}</TableCell>
                </TableRow>
              ))}
              <TableRow className="bg-muted font-semibold">
                <TableCell>Total Revenue</TableCell>
                <TableCell className="text-right text-[#0F6E56] dark:text-primary">{formatCurrency(data.total_revenue ?? 0)}</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
      </div>
      <div>
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 px-4">Expenses</h3>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader><TableRow><TableHead>Account</TableHead><TableHead className="text-right">Amount</TableHead></TableRow></TableHeader>
            <TableBody>
              {(data.expenses ?? []).map((line: any) => (
                <TableRow key={line.account_id}>
                  <TableCell><span className="text-xs text-muted-foreground mr-2">{line.account_code}</span>{line.account_name}</TableCell>
                  <TableCell className="text-right text-destructive font-medium">{formatCurrency(line.amount)}</TableCell>
                </TableRow>
              ))}
              <TableRow className="bg-muted font-semibold">
                <TableCell>Total Expenses</TableCell>
                <TableCell className="text-right text-destructive">{formatCurrency(data.total_expenses ?? 0)}</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
      </div>
      <div className="border-t-2 border-border pt-4 px-4">
        <div className="flex items-center justify-between">
          <span className="text-base font-bold text-foreground">Net Income</span>
          <span className={`text-lg font-bold ${(data.net_income ?? 0) >= 0 ? 'text-[#0F6E56] dark:text-primary' : 'text-destructive'}`}>
            {formatCurrency(data.net_income ?? 0)}
          </span>
        </div>
      </div>
    </div>
  );
}

function BalanceSheetTable({ data }: { data: any }) {
  const sections = [
    { key: 'assets',      label: 'Assets',      total: data.total_assets,      colorClass: 'text-[#0F6E56] dark:text-primary' },
    { key: 'liabilities', label: 'Liabilities', total: data.total_liabilities, colorClass: 'text-destructive' },
    { key: 'equity',      label: 'Equity',      total: data.total_equity,      colorClass: 'text-[#185fa5] dark:text-blue-400' },
  ];
  return (
    <div className="flex flex-col gap-6">
      {sections.map(({ key, label, total, colorClass }) => (
        <div key={key}>
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 px-4">{label}</h3>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader><TableRow><TableHead>Account</TableHead><TableHead className="text-right">Amount</TableHead></TableRow></TableHeader>
              <TableBody>
                {(data[key] ?? []).map((line: any) => (
                  <TableRow key={line.account_id}>
                    <TableCell><span className="text-xs text-muted-foreground mr-2">{line.account_code}</span>{line.account_name}</TableCell>
                    <TableCell className={`text-right font-medium ${colorClass}`}>{formatCurrency(line.amount)}</TableCell>
                  </TableRow>
                ))}
                <TableRow className="bg-muted font-semibold">
                  <TableCell>Total {label}</TableCell>
                  <TableCell className={`text-right ${colorClass}`}>{formatCurrency(total ?? 0)}</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
        </div>
      ))}
      <div className="px-4 flex items-center gap-2">
        {data.is_balanced
          ? <div className="flex items-center gap-1.5 text-sm text-[#0F6E56] dark:text-primary"><CheckCircle2 className="w-4 h-4" />Balance sheet is balanced — Assets = Liabilities + Equity</div>
          : <div className="flex items-center gap-1.5 text-sm text-destructive"><AlertCircle className="w-4 h-4" />Balance sheet is NOT balanced — review journal entries</div>
        }
      </div>
    </div>
  );
}

function TrialBalanceTable({ data }: { data: any }) {
  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Code</TableHead><TableHead>Account</TableHead><TableHead>Type</TableHead>
            <TableHead className="text-right">Debits</TableHead><TableHead className="text-right">Credits</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {(data.lines ?? []).map((line: any) => (
            <TableRow key={line.account_id}>
              <TableCell className="text-xs text-muted-foreground">{line.account_code}</TableCell>
              <TableCell>{line.account_name}</TableCell>
              <TableCell className="capitalize text-muted-foreground text-sm">{line.account_type}</TableCell>
              <TableCell className="text-right font-medium">{line.total_debits > 0 ? formatCurrency(line.total_debits) : '—'}</TableCell>
              <TableCell className="text-right font-medium">{line.total_credits > 0 ? formatCurrency(line.total_credits) : '—'}</TableCell>
            </TableRow>
          ))}
          <TableRow className="bg-muted font-semibold border-t-2 border-border">
            <TableCell colSpan={3}>Totals</TableCell>
            <TableCell className="text-right">{formatCurrency(data.total_debits ?? 0)}</TableCell>
            <TableCell className="text-right">{formatCurrency(data.total_credits ?? 0)}</TableCell>
          </TableRow>
        </TableBody>
      </Table>
      <div className="px-4 pt-3 flex items-center gap-2">
        {data.is_balanced
          ? <div className="flex items-center gap-1.5 text-sm text-[#0F6E56] dark:text-primary"><CheckCircle2 className="w-4 h-4" />Trial balance is balanced</div>
          : <div className="flex items-center gap-1.5 text-sm text-destructive"><AlertCircle className="w-4 h-4" />Trial balance is NOT balanced</div>
        }
      </div>
    </div>
  );
}

function GeneralLedgerTable({ data }: { data: any }) {
  const accounts = data.accounts ?? data.ledger ?? [];
  return (
    <div className="flex flex-col gap-6">
      {accounts.map((account: any) => (
        <div key={account.account_id ?? account.id}>
          <h3 className="text-sm font-semibold text-foreground mb-1 px-4">
            <span className="text-muted-foreground mr-2">{account.account_code}</span>{account.account_name}
          </h3>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead><TableHead>Description</TableHead>
                  <TableHead className="text-right">Debit</TableHead><TableHead className="text-right">Credit</TableHead>
                  <TableHead className="text-right">Balance</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(account.lines ?? account.entries ?? []).map((line: any, i: number) => (
                  <TableRow key={i}>
                    <TableCell className="text-muted-foreground whitespace-nowrap text-sm">{line.entry_date ? formatDate(line.entry_date) : '—'}</TableCell>
                    <TableCell className="max-w-[180px] truncate text-sm">{line.description ?? '—'}</TableCell>
                    <TableCell className="text-right text-sm">{line.debit_amount  > 0 ? formatCurrency(line.debit_amount)  : '—'}</TableCell>
                    <TableCell className="text-right text-sm">{line.credit_amount > 0 ? formatCurrency(line.credit_amount) : '—'}</TableCell>
                    <TableCell className="text-right font-medium text-sm">{formatCurrency(line.running_balance ?? line.balance ?? 0)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      ))}
      {accounts.length === 0 && <p className="text-sm text-muted-foreground text-center py-8">No ledger entries found for this period.</p>}
    </div>
  );
}

/* ── Main ReportViewer ───────────────────────────────────────────────────── */

export function ReportViewer({ type, label, data, startDate: initialStart, endDate: initialEnd }: ReportViewerProps) {
  const [startDate, setStartDate] = useState(initialStart);
  const [endDate, setEndDate]     = useState(initialEnd);

  const exportParams: Record<string, string>    = { startDate, endDate };
  const narrativeParams: Record<string, string> =
    type === 'balance-sheet' ? { asOfDate: endDate } : { startDate, endDate };
  const supportsNarrative = type === 'income-statement' || type === 'balance-sheet';

  function handleFilterChange() {
    const url = new URL(window.location.href);
    url.searchParams.set('startDate', startDate);
    url.searchParams.set('endDate', endDate);
    window.location.href = url.toString();
  }

  return (
    <div className="p-4 md:p-6 max-w-screen-lg mx-auto">

      {/* Header — wraps on mobile */}
      <div className="flex flex-wrap items-start justify-between gap-3 mb-6">
        <div>
          <h1 className="text-xl font-semibold text-foreground">{label}</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {type === 'balance-sheet'
              ? `As of ${formatDate(endDate)}`
              : `${formatDate(startDate)} — ${formatDate(endDate)}`}
          </p>
        </div>
        <ExportButtons type={type} params={exportParams} />
      </div>

      {/* Date filters — wrap on mobile */}
      <Card className="mb-5">
        <CardContent className="pt-4 pb-4">
          <div className="flex flex-wrap items-end gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-muted-foreground">
                {type === 'balance-sheet' ? 'From' : 'Start Date'}
              </label>
              <input
                type="date" value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="text-sm border border-border rounded-lg px-3 py-2 outline-none focus:border-[#0F6E56] bg-background text-foreground transition-colors"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-muted-foreground">
                {type === 'balance-sheet' ? 'As Of Date' : 'End Date'}
              </label>
              <input
                type="date" value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="text-sm border border-border rounded-lg px-3 py-2 outline-none focus:border-[#0F6E56] bg-background text-foreground transition-colors"
              />
            </div>
            <Button onClick={handleFilterChange} size="sm">Apply</Button>
          </div>
        </CardContent>
      </Card>

      {/* Chart sections */}
      {data && type === 'income-statement' && (
        <Card className="mb-5">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Overview</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <IncomeStatementChart
              totalRevenue={data.total_revenue ?? 0}
              totalExpenses={data.total_expenses ?? 0}
              netIncome={data.net_income ?? 0}
            />
          </CardContent>
        </Card>
      )}

      {data && type === 'balance-sheet' && (
        <Card className="mb-5">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Overview</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <BalanceSheetChart
              totalAssets={data.total_assets ?? 0}
              totalLiabilities={data.total_liabilities ?? 0}
              totalEquity={data.total_equity ?? 0}
            />
          </CardContent>
        </Card>
      )}

      {/* Report table */}
      <Card>
        <CardContent className="pt-5 pb-5">
          {!data ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <AlertCircle className="w-8 h-8 text-muted-foreground mb-3" />
              <p className="text-sm text-muted-foreground">No data available for this period. Try adjusting the date range.</p>
            </div>
          ) : (
            <>
              {type === 'income-statement' && <IncomeStatementTable data={data} />}
              {type === 'balance-sheet'    && <BalanceSheetTable    data={data} />}
              {type === 'trial-balance'    && <TrialBalanceTable    data={data} />}
              {type === 'general-ledger'   && <GeneralLedgerTable   data={data} />}
            </>
          )}
        </CardContent>
      </Card>

      {supportsNarrative && data && (
        <NarrativePanel type={type as 'income-statement' | 'balance-sheet'} params={narrativeParams} />
      )}
    </div>
  );
}
