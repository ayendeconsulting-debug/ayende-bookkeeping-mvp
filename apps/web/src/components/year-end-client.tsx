'use client';

import { useEffect, useRef, useState } from 'react';
import { Wand2, Download, RefreshCw, AlertCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  generateYearEndReport, checkYearEndJob, exportYearEndPdf,
  checkYearEndPdfStatus, downloadYearEndPdfFile,
} from '@/app/(app)/year-end/actions';

interface YearEndClientProps {
  availableYears: number[];
}

type JobStatus = 'idle' | 'generating' | 'complete' | 'failed';
type PdfStatus = 'idle' | 'exporting' | 'downloading' | 'done' | 'failed';

const POLL_INTERVAL_MS = 2500;
const TIMEOUT_MS       = 90000;
const SESSION_KEY      = (year: number) => `tempo_year_end_${year}`;

interface ReportSection { key: string; label: string; isList?: boolean; }

const REPORT_SECTIONS: ReportSection[] = [
  { key: 'executiveSummary',      label: 'Executive Summary' },
  { key: 'executive_summary',     label: 'Executive Summary' },
  { key: 'revenueAnalysis',       label: 'Revenue Analysis' },
  { key: 'revenue_analysis',      label: 'Revenue Analysis' },
  { key: 'expenseBreakdown',      label: 'Expense Breakdown' },
  { key: 'expense_breakdown',     label: 'Expense Breakdown' },
  { key: 'keyRecommendations',    label: 'Key Recommendations',    isList: true },
  { key: 'key_recommendations',   label: 'Key Recommendations',    isList: true },
  { key: 'yearEndActionItems',    label: 'Year-End Action Items',  isList: true },
  { key: 'year_end_action_items', label: 'Year-End Action Items',  isList: true },
];

function getSectionsToRender(report: Record<string, unknown>) {
  const seen = new Set<string>();
  const result: { label: string; content: string | string[]; isList: boolean }[] = [];
  for (const sec of REPORT_SECTIONS) {
    const value = report[sec.key];
    if (!value || seen.has(sec.label)) continue;
    seen.add(sec.label);
    result.push({ label: sec.label, content: value as string | string[], isList: sec.isList ?? false });
  }
  return result;
}

export function YearEndClient({ availableYears }: YearEndClientProps) {
  const currentYear = availableYears[0];
  const [selectedYear, setSelectedYear] = useState<number>(currentYear);
  const [jobStatus,  setJobStatus]  = useState<JobStatus>('idle');
  const [pdfStatus,  setPdfStatus]  = useState<PdfStatus>('idle');
  const [report,     setReport]     = useState<Record<string, unknown> | null>(null);
  const [errorMsg,   setErrorMsg]   = useState('');
  const [pdfError,   setPdfError]   = useState('');
  const [expanded,   setExpanded]   = useState<Set<string>>(new Set(['Executive Summary']));

  const pollRef    = useRef<ReturnType<typeof setInterval> | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout>  | null>(null);
  const jobIdRef   = useRef<string | null>(null);
  const pdfJobRef  = useRef<string | null>(null);

  function clearTimers() {
    if (pollRef.current)    clearInterval(pollRef.current);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    pollRef.current    = null;
    timeoutRef.current = null;
  }

  useEffect(() => {
    setReport(null); setJobStatus('idle'); setErrorMsg(''); setPdfStatus('idle'); setPdfError('');
    try {
      const cached = sessionStorage.getItem(SESSION_KEY(selectedYear));
      if (cached) { setReport(JSON.parse(cached)); setJobStatus('complete'); }
    } catch { /* ignore */ }
  }, [selectedYear]);

  async function handleGenerate() {
    clearTimers();
    setReport(null); setJobStatus('generating'); setErrorMsg(''); setPdfStatus('idle');

    const res = await generateYearEndReport(`${selectedYear}-12-31`);
    if (!res.success || !res.data?.job_id) {
      setErrorMsg(res.error ?? 'Failed to start year-end report.');
      setJobStatus('failed');
      return;
    }

    jobIdRef.current = res.data.job_id;

    pollRef.current = setInterval(async () => {
      if (!jobIdRef.current) return;
      const poll = await checkYearEndJob(jobIdRef.current);
      if (!poll.success) return;
      const { status, result } = poll.data ?? {};
      if (status === 'complete' && result) {
        clearTimers();
        const reportData = result as Record<string, unknown>;
        setReport(reportData);
        setJobStatus('complete');
        setExpanded(new Set(['Executive Summary']));
        try { sessionStorage.setItem(SESSION_KEY(selectedYear), JSON.stringify(reportData)); } catch { /* ignore */ }
      } else if (status === 'failed') {
        clearTimers();
        setErrorMsg('Report generation failed. Please try again.');
        setJobStatus('failed');
      }
    }, POLL_INTERVAL_MS);

    timeoutRef.current = setTimeout(() => {
      clearTimers();
      setErrorMsg('Report generation timed out. Please try again.');
      setJobStatus('failed');
    }, TIMEOUT_MS);
  }

  async function handleDownloadPdf() {
    if (!report) return;
    setPdfStatus('exporting'); setPdfError('');

    const exportRes = await exportYearEndPdf(report);
    if (!exportRes.success || !exportRes.data?.job_id) {
      setPdfError(exportRes.error ?? 'Failed to start PDF export.');
      setPdfStatus('failed');
      return;
    }

    pdfJobRef.current = exportRes.data.job_id;

    const pdfPollRef = setInterval(async () => {
      if (!pdfJobRef.current) return;
      const poll = await checkYearEndPdfStatus(pdfJobRef.current);
      if (!poll.success) return;
      const { status } = poll.data ?? {};
      if (status === 'complete') {
        clearInterval(pdfPollRef);
        setPdfStatus('downloading');
        const dlRes = await downloadYearEndPdfFile(pdfJobRef.current!);
        if (dlRes.success && dlRes.base64) {
          triggerDownload(dlRes.base64, dlRes.filename ?? 'year-end-report.pdf');
          setPdfStatus('done');
        } else {
          setPdfError(dlRes.error ?? 'Download failed.');
          setPdfStatus('failed');
        }
      } else if (status === 'failed') {
        clearInterval(pdfPollRef);
        setPdfError('PDF generation failed.');
        setPdfStatus('failed');
      }
    }, POLL_INTERVAL_MS);

    setTimeout(() => {
      clearInterval(pdfPollRef);
      if (pdfStatus === 'exporting') { setPdfError('PDF export timed out.'); setPdfStatus('failed'); }
    }, 60000);
  }

  function triggerDownload(base64: string, filename: string) {
    const bytes = new Uint8Array(atob(base64).split('').map((c) => c.charCodeAt(0)));
    const url   = URL.createObjectURL(new Blob([bytes], { type: 'application/pdf' }));
    const a     = Object.assign(document.createElement('a'), { href: url, download: filename });
    a.click();
    URL.revokeObjectURL(url);
  }

  function toggleSection(label: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(label)) next.delete(label); else next.add(label);
      return next;
    });
  }

  const sections     = report ? getSectionsToRender(report) : [];
  const isGenerating = jobStatus === 'generating';
  const isPdfBusy    = pdfStatus === 'exporting' || pdfStatus === 'downloading';

  const selectClass = 'h-9 rounded-md border border-input px-3 text-sm bg-card text-foreground focus:outline-none focus:ring-1 focus:ring-primary min-w-[140px]';

  return (
    <div className="space-y-6">

      {/* Controls */}
      <div className="bg-card border border-border rounded-xl p-5">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <div className="flex-1">
            <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">
              Fiscal Year
            </label>
            <select value={selectedYear} onChange={(e) => setSelectedYear(Number(e.target.value))}
              disabled={isGenerating} className={selectClass}>
              {availableYears.map((y) => (
                <option key={y} value={y}>FY {y} (Jan – Dec {y})</option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-3 pt-5 sm:pt-0">
            <Button onClick={handleGenerate} disabled={isGenerating}>
              <Wand2 className="w-4 h-4 mr-1.5" />
              {isGenerating ? 'Generating…' : jobStatus === 'complete' ? 'Regenerate' : 'Generate Report'}
            </Button>

            {jobStatus === 'complete' && (
              <Button variant="outline" onClick={handleDownloadPdf} disabled={isPdfBusy}>
                <Download className="w-4 h-4 mr-1.5" />
                {pdfStatus === 'exporting'    ? 'Preparing PDF…'
                 : pdfStatus === 'downloading' ? 'Downloading…'
                 : 'Download PDF'}
              </Button>
            )}
          </div>
        </div>

        {pdfError && (
          <p className="mt-3 text-sm text-destructive flex items-center gap-1.5">
            <AlertCircle className="w-4 h-4" />{pdfError}
          </p>
        )}
        {pdfStatus === 'done' && (
          <p className="mt-3 text-sm text-primary">PDF downloaded successfully.</p>
        )}
      </div>

      {/* Generating state */}
      {isGenerating && (
        <div className="bg-card border border-border rounded-xl p-10 flex flex-col items-center gap-3">
          <RefreshCw className="w-6 h-6 text-primary animate-spin" />
          <p className="text-sm text-muted-foreground">Analysing your FY {selectedYear} data…</p>
          <p className="text-xs text-muted-foreground">This usually takes 20–40 seconds.</p>
        </div>
      )}

      {/* Error state */}
      {jobStatus === 'failed' && errorMsg && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-5 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-red-700 dark:text-red-400">Report generation failed</p>
            <p className="text-sm text-red-600 dark:text-red-400 mt-0.5">{errorMsg}</p>
          </div>
        </div>
      )}

      {/* Report sections */}
      {jobStatus === 'complete' && sections.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-foreground">Year-End Report — FY {selectedYear}</p>
              {typeof report?.generatedAt === 'string' && (
                <p className="text-xs text-muted-foreground mt-0.5">
                  Generated {new Date(report.generatedAt).toLocaleDateString('en-CA', {
                    month: 'short', day: 'numeric', year: 'numeric',
                  })}
                </p>
              )}
            </div>
            <button
              onClick={() => setExpanded(sections.length === expanded.size
                ? new Set() : new Set(sections.map((s) => s.label)))}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors">
              {sections.length === expanded.size ? 'Collapse all' : 'Expand all'}
            </button>
          </div>

          {sections.map((sec) => {
            const isOpen = expanded.has(sec.label);
            return (
              <div key={sec.label} className="bg-card border border-border rounded-xl overflow-hidden">
                <button onClick={() => toggleSection(sec.label)}
                  className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-muted transition-colors">
                  <span className="text-sm font-semibold text-foreground">{sec.label}</span>
                  {isOpen
                    ? <ChevronUp className="w-4 h-4 text-muted-foreground" />
                    : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                </button>
                {isOpen && (
                  <div className="px-5 pb-5 border-t border-border">
                    {sec.isList && Array.isArray(sec.content) ? (
                      <ul className="mt-4 space-y-2">
                        {sec.content.map((item, i) => (
                          <li key={i} className="flex items-start gap-2.5 text-sm text-foreground">
                            <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0" />
                            {item}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="mt-4 text-sm text-foreground leading-relaxed whitespace-pre-line">
                        {sec.content as string}
                      </p>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Empty state */}
      {jobStatus === 'idle' && (
        <div className="bg-card border border-border rounded-xl p-10 text-center">
          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
            <Wand2 className="w-5 h-5 text-primary" />
          </div>
          <p className="text-sm font-medium text-foreground mb-1">No report generated yet</p>
          <p className="text-sm text-muted-foreground">
            Select a fiscal year above and click Generate Report to get started.
          </p>
        </div>
      )}
    </div>
  );
}
