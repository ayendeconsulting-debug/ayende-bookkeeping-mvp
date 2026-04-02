'use client';

import { useState, useTransition } from 'react';
import {
  Download,
  FileText,
  Sparkles,
  Loader2,
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { getReportNarrative, downloadReport } from '@/app/(app)/reports/[type]/actions';

/* ── Types ───────────────────────────────────────────────────────────────── */

interface ReportViewerProps {
  type: string;
  label: string;
  data: any;
  startDate: string;
  endDate: string;
}

/* ── Download helper ─────────────────────────────────────────────────────── */

function triggerDownload(base64: string, filename: string, format: 'pdf' | 'csv') {
  const mimeType = format === 'pdf' ? 'application/pdf' : 'text/csv';
  const byteChars = atob(base64);
  const byteArray = new Uint8Array(byteChars.length);
  for (let i = 0; i < byteChars.length; i++) {
    byteArray[i] = byteChars.charCodeAt(i);
  }
  const blob = new Blob([byteArray], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/* ── Export buttons ──────────────────────────────────────────────────────── */

function ExportButtons({
  type,
  params,
}: {
  type: string;
  params: Record<string, string>;
}) {
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
    <div className="flex items-center gap-2">
      {error && (
        <span className="text-xs text-red-500">{error}</span>
      )}
      <Button
        variant="outline"
        size="sm"
        onClick={() => handleExport('csv', startCsv)}
        disabled={loadingCsv || loadingPdf}
        className="flex items-center gap-1.5"
      >
        {loadingCsv ? (
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
        ) : (
          <Download className="w-3.5 h-3.5" />
        )}
        CSV
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={() => handleExport('pdf', startPdf)}
        disabled={loadingPdf || loadingCsv}
        className="flex items-center gap-1.5"
      >
        {loadingPdf ? (
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
        ) : (
          <FileText className="w-3.5 h-3.5" />
        )}
        PDF
      </Button>
    </div>
  );
}

/* ── AI Narrative panel ──────────────────────────────────────────────────── */

function NarrativePanel({
  type,
  params,
}: {
  type: 'income-statement' | 'balance-sheet';
  params: Record<string, string>;
}) {
  const [open, setOpen] = useState(false);
  const [narrative, setNarrative] = useState<string | null>(null);
  const [loading, startLoading] = useTransition();
  const [error, setError] = useState<string | null>(null);

  async function handleLoad() {
    if (narrative) {
      setOpen((v) => !v);
      return;
    }
    setOpen(true);
    setError(null);
    startLoading(async () => {
      const result = await getReportNarrative(type, params);
      if (result.success) {
        setNarrative(result.narrative ?? null);
      } else {
        setError(result.error ?? 'Failed to generate narrative.');
      }
    });
  }

  return (
    <div className="mt-4">
      <button
        onClick={handleLoad}
        className="flex items-center gap-2 text-sm text-[#0F6E56] hover:text-[#0a5a45] font-medium transition-colors"
      >
        <Sparkles className="w-4 h-4" />
        {open ? 'Hide' : 'Show'} AI narrative
        {open ? (
          <ChevronUp className="w-3.5 h-3.5" />
        ) : (
          <ChevronDown className="w-3.5 h-3.5" />
        )}
      </button>

      {open && (
        <div className="mt-3 bg-[#F0FAF6] border border-[#C3E8D8] rounded-xl px-4 py-4">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="w-4 h-4 text-[#0F6E56]" />
            <span className="text-sm font-medium text-[#0F6E56]">AI Summary</span>
          </div>
          {loading && (
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <Loader2 className="w-4 h-4 animate-spin" />
              Generating narrative…
            </div>
          )}
          {error && (
            <div className="flex items-center gap-1.5 text-sm text-red-500">
              <AlertCircle className="w-4 h-4" />
              {error}
            </div>
          )}
          {narrative && !loading && (
            <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
              {narrative}
            </p>
          )}
          <p className="text-xs text-gray-400 mt-3">
            AI narratives are for guidance only — always verify with your accountant.
          </p>
        </div>
      )}
    </div>
  );
}

/* ── Report tables ───────────────────────────────────────────────────────── */

function IncomeStatementTable({ data }: { data: any }) {
  return (
    <div className="flex flex-col gap-6">
      {/* Revenue */}
      <div>
        <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider mb-2 px-4">
          Revenue
        </h3>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Account</TableHead>
              <TableHead className="text-right">Amount</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(data.revenue ?? []).map((line: any) => (
              <TableRow key={line.account_id}>
                <TableCell>
                  <span className="text-xs text-gray-400 mr-2">{line.account_code}</span>
                  {line.account_name}
                </TableCell>
                <TableCell className="text-right text-[#0F6E56] font-medium">
                  {formatCurrency(line.amount)}
                </TableCell>
              </TableRow>
            ))}
            <TableRow className="bg-gray-50 font-semibold">
              <TableCell>Total Revenue</TableCell>
              <TableCell className="text-right text-[#0F6E56]">
                {formatCurrency(data.total_revenue ?? 0)}
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>

      {/* Expenses */}
      <div>
        <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider mb-2 px-4">
          Expenses
        </h3>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Account</TableHead>
              <TableHead className="text-right">Amount</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(data.expenses ?? []).map((line: any) => (
              <TableRow key={line.account_id}>
                <TableCell>
                  <span className="text-xs text-gray-400 mr-2">{line.account_code}</span>
                  {line.account_name}
                </TableCell>
                <TableCell className="text-right text-red-500 font-medium">
                  {formatCurrency(line.amount)}
                </TableCell>
              </TableRow>
            ))}
            <TableRow className="bg-gray-50 font-semibold">
              <TableCell>Total Expenses</TableCell>
              <TableCell className="text-right text-red-500">
                {formatCurrency(data.total_expenses ?? 0)}
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>

      {/* Net Income */}
      <div className="border-t-2 border-gray-200 pt-4 px-4">
        <div className="flex items-center justify-between">
          <span className="text-base font-bold text-gray-900">Net Income</span>
          <span
            className={`text-lg font-bold ${
              (data.net_income ?? 0) >= 0 ? 'text-[#0F6E56]' : 'text-red-500'
            }`}
          >
            {formatCurrency(data.net_income ?? 0)}
          </span>
        </div>
      </div>
    </div>
  );
}

function BalanceSheetTable({ data }: { data: any }) {
  const sections = [
    { key: 'assets', label: 'Assets', total: data.total_assets, color: 'text-[#0F6E56]' },
    { key: 'liabilities', label: 'Liabilities', total: data.total_liabilities, color: 'text-red-500' },
    { key: 'equity', label: 'Equity', total: data.total_equity, color: 'text-blue-600' },
  ];

  return (
    <div className="flex flex-col gap-6">
      {sections.map(({ key, label, total, color }) => (
        <div key={key}>
          <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider mb-2 px-4">
            {label}
          </h3>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Account</TableHead>
                <TableHead className="text-right">Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(data[key] ?? []).map((line: any) => (
                <TableRow key={line.account_id}>
                  <TableCell>
                    <span className="text-xs text-gray-400 mr-2">{line.account_code}</span>
                    {line.account_name}
                  </TableCell>
                  <TableCell className={`text-right font-medium ${color}`}>
                    {formatCurrency(line.amount)}
                  </TableCell>
                </TableRow>
              ))}
              <TableRow className="bg-gray-50 font-semibold">
                <TableCell>Total {label}</TableCell>
                <TableCell className={`text-right ${color}`}>
                  {formatCurrency(total ?? 0)}
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
      ))}

      {/* Balanced indicator */}
      <div className="px-4 flex items-center gap-2">
        {data.is_balanced ? (
          <div className="flex items-center gap-1.5 text-sm text-[#0F6E56]">
            <CheckCircle2 className="w-4 h-4" />
            Balance sheet is balanced — Assets = Liabilities + Equity
          </div>
        ) : (
          <div className="flex items-center gap-1.5 text-sm text-red-500">
            <AlertCircle className="w-4 h-4" />
            Balance sheet is NOT balanced — review journal entries
          </div>
        )}
      </div>
    </div>
  );
}

function TrialBalanceTable({ data }: { data: any }) {
  return (
    <div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Code</TableHead>
            <TableHead>Account</TableHead>
            <TableHead>Type</TableHead>
            <TableHead className="text-right">Debits</TableHead>
            <TableHead className="text-right">Credits</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {(data.lines ?? []).map((line: any) => (
            <TableRow key={line.account_id}>
              <TableCell className="text-xs text-gray-400">{line.account_code}</TableCell>
              <TableCell>{line.account_name}</TableCell>
              <TableCell className="capitalize text-gray-500 text-sm">
                {line.account_type}
              </TableCell>
              <TableCell className="text-right font-medium">
                {line.total_debits > 0 ? formatCurrency(line.total_debits) : '—'}
              </TableCell>
              <TableCell className="text-right font-medium">
                {line.total_credits > 0 ? formatCurrency(line.total_credits) : '—'}
              </TableCell>
            </TableRow>
          ))}
          {/* Totals row */}
          <TableRow className="bg-gray-50 font-semibold border-t-2 border-gray-300">
            <TableCell colSpan={3}>Totals</TableCell>
            <TableCell className="text-right">{formatCurrency(data.total_debits ?? 0)}</TableCell>
            <TableCell className="text-right">{formatCurrency(data.total_credits ?? 0)}</TableCell>
          </TableRow>
        </TableBody>
      </Table>
      <div className="px-4 pt-3 flex items-center gap-2">
        {data.is_balanced ? (
          <div className="flex items-center gap-1.5 text-sm text-[#0F6E56]">
            <CheckCircle2 className="w-4 h-4" />
            Trial balance is balanced
          </div>
        ) : (
          <div className="flex items-center gap-1.5 text-sm text-red-500">
            <AlertCircle className="w-4 h-4" />
            Trial balance is NOT balanced — review journal entries
          </div>
        )}
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
          <h3 className="text-sm font-semibold text-gray-800 mb-1 px-4">
            <span className="text-gray-400 mr-2">{account.account_code}</span>
            {account.account_name}
          </h3>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Description</TableHead>
                <TableHead className="text-right">Debit</TableHead>
                <TableHead className="text-right">Credit</TableHead>
                <TableHead className="text-right">Balance</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(account.lines ?? account.entries ?? []).map((line: any, i: number) => (
                <TableRow key={i}>
                  <TableCell className="text-gray-500 whitespace-nowrap text-sm">
                    {line.entry_date ? formatDate(line.entry_date) : '—'}
                  </TableCell>
                  <TableCell className="max-w-[240px] truncate text-sm">
                    {line.description ?? '—'}
                  </TableCell>
                  <TableCell className="text-right text-sm">
                    {line.debit_amount > 0 ? formatCurrency(line.debit_amount) : '—'}
                  </TableCell>
                  <TableCell className="text-right text-sm">
                    {line.credit_amount > 0 ? formatCurrency(line.credit_amount) : '—'}
                  </TableCell>
                  <TableCell className="text-right font-medium text-sm">
                    {formatCurrency(line.running_balance ?? line.balance ?? 0)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ))}
      {accounts.length === 0 && (
        <p className="text-sm text-gray-400 text-center py-8">
          No ledger entries found for this period.
        </p>
      )}
    </div>
  );
}

/* ── Main ReportViewer ───────────────────────────────────────────────────── */

export function ReportViewer({
  type,
  label,
  data,
  startDate: initialStart,
  endDate: initialEnd,
}: ReportViewerProps) {
  const [startDate, setStartDate] = useState(initialStart);
  const [endDate, setEndDate] = useState(initialEnd);

  const exportParams: Record<string, string> = { startDate, endDate };
  const narrativeParams: Record<string, string> =
    type === 'balance-sheet'
      ? { asOfDate: endDate }
      : { startDate, endDate };

  const supportsNarrative =
    type === 'income-statement' || type === 'balance-sheet';

  function handleFilterChange() {
    // Update URL params to trigger server re-fetch
    const url = new URL(window.location.href);
    url.searchParams.set('startDate', startDate);
    url.searchParams.set('endDate', endDate);
    window.location.href = url.toString();
  }

  return (
    <div className="p-6 max-w-screen-lg mx-auto">

      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">{label}</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {type === 'balance-sheet'
              ? `As of ${formatDate(endDate)}`
              : `${formatDate(startDate)} — ${formatDate(endDate)}`}
          </p>
        </div>
        <ExportButtons type={type} params={exportParams} />
      </div>

      {/* Date filters */}
      <Card className="mb-5">
        <CardContent className="pt-4 pb-4">
          <div className="flex items-end gap-4">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-gray-500">
                {type === 'balance-sheet' ? 'From' : 'Start Date'}
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="text-sm border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-[#0F6E56] transition-colors"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-gray-500">
                {type === 'balance-sheet' ? 'As Of Date' : 'End Date'}
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="text-sm border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-[#0F6E56] transition-colors"
              />
            </div>
            <Button onClick={handleFilterChange} size="sm">
              Apply
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Report content */}
      <Card>
        <CardContent className="pt-5 pb-5">
          {!data ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <AlertCircle className="w-8 h-8 text-gray-300 mb-3" />
              <p className="text-sm text-gray-400">
                No data available for this period. Try adjusting the date range.
              </p>
            </div>
          ) : (
            <>
              {type === 'income-statement' && <IncomeStatementTable data={data} />}
              {type === 'balance-sheet' && <BalanceSheetTable data={data} />}
              {type === 'trial-balance' && <TrialBalanceTable data={data} />}
              {type === 'general-ledger' && <GeneralLedgerTable data={data} />}
            </>
          )}
        </CardContent>
      </Card>

      {/* AI Narrative — Income Statement and Balance Sheet only */}
      {supportsNarrative && data && (
        <NarrativePanel
          type={type as 'income-statement' | 'balance-sheet'}
          params={narrativeParams}
        />
      )}
    </div>
  );
}
