import { notFound } from 'next/navigation';
import { apiGet } from '@/lib/api';
import { ReportViewer } from '@/components/report-viewer';

/* ── Report config ───────────────────────────────────────────────────────── */

const REPORT_CONFIG: Record<
  string,
  { label: string; endpoint: string; usesAsOfDate?: boolean }
> = {
  'income-statement': {
    label: 'Income Statement',
    endpoint: '/reports/income-statement',
  },
  'balance-sheet': {
    label: 'Balance Sheet',
    endpoint: '/reports/balance-sheet',
    usesAsOfDate: true,
  },
  'trial-balance': {
    label: 'Trial Balance',
    endpoint: '/reports/trial-balance',
  },
  'general-ledger': {
    label: 'General Ledger',
    endpoint: '/reports/general-ledger',
  },
};

/* ── Date defaults ───────────────────────────────────────────────────────── */

function getDefaultDates() {
  const today = new Date();
  const startDate = `${today.getFullYear()}-01-01`;
  const endDate = today.toISOString().split('T')[0];
  return { startDate, endDate };
}

/* ── Data fetcher ────────────────────────────────────────────────────────── */

async function fetchReport(
  endpoint: string,
  startDate: string,
  endDate: string,
  usesAsOfDate?: boolean,
): Promise<any> {
  try {
    const params = usesAsOfDate
      ? `asOfDate=${endDate}`
      : `startDate=${startDate}&endDate=${endDate}`;
    return await apiGet(`${endpoint}?${params}`);
  } catch {
    return null;
  }
}

/* ── Page ────────────────────────────────────────────────────────────────── */

interface ReportPageProps {
  params: Promise<{ type: string }>;
  searchParams: Promise<{ startDate?: string; endDate?: string }>;
}

export default async function ReportPage({
  params,
  searchParams,
}: ReportPageProps) {
  const { type } = await params;
  const search = await searchParams;

  const config = REPORT_CONFIG[type];
  if (!config) notFound();

  const defaults = getDefaultDates();
  const startDate = search.startDate ?? defaults.startDate;
  const endDate = search.endDate ?? defaults.endDate;

  const data = await fetchReport(
    config.endpoint,
    startDate,
    endDate,
    config.usesAsOfDate,
  );

  return (
    <ReportViewer
      type={type}
      label={config.label}
      data={data}
      startDate={startDate}
      endDate={endDate}
    />
  );
}

/* ── Static params for known report types ────────────────────────────────── */

export function generateStaticParams() {
  return Object.keys(REPORT_CONFIG).map((type) => ({ type }));
}
