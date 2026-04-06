import { AccessRequestBanner } from '@/components/access-request-banner';
import { getAccessRequests } from '@/app/(app)/settings/actions';
import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { apiGet } from '@/lib/api';
import { TrialBalance, PlaidItem, RawTransaction, Business } from '@/types';
import { formatCurrency } from '@/lib/utils';
import { Sparkline } from '@/components/sparkline';
import { DashboardCharts } from '@/components/charts/dashboard-charts';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  TrendingUp, TrendingDown, DollarSign, Clock, Building2, RefreshCw,
  AlertCircle, ShieldAlert, AlertTriangle, Info, Receipt, ExternalLink,
} from 'lucide-react';

interface AnomalyFlag {
  journal_entry_id: string;
  entry_number:     string;
  description:      string;
  severity:         'high' | 'medium' | 'low';
  reason:           string;
}
interface AnomalyResult { flags: AnomalyFlag[]; summary: string; }

interface SparklinePoint { date: string; value: number; }
interface SparklineData {
  revenue:  SparklinePoint[];
  expenses: SparklinePoint[];
  net:      SparklinePoint[];
  pending:  SparklinePoint[];
}

// Phase 9: HST Position
interface HstPosition {
  period_start: string;
  period_end: string;
  total_output_tax: number;
  total_itc_eligible: number;
  net_tax_owing: number;
  position_indicator: 'owing' | 'refund' | 'nil';
  unposted_transaction_count: number;
}

async function getMyBusiness(): Promise<Business | null> {
  try { return await apiGet<Business>('/businesses/me'); } catch { return null; }
}
async function getTrialBalance(): Promise<TrialBalance | null> {
  try {
    const today = new Date();
    return await apiGet(`/reports/trial-balance?startDate=${today.getFullYear()}-01-01&endDate=${today.toISOString().split('T')[0]}`);
  } catch { return null; }
}
async function getRecentTransactions(): Promise<RawTransaction[]> {
  try {
    const data = await apiGet<{ data: RawTransaction[]; total: number }>('/classification/raw?limit=8');
    return data?.data ?? [];
  } catch { return []; }
}
async function getConnectedBanks(): Promise<PlaidItem[]> {
  try { return await apiGet('/plaid/items'); } catch { return []; }
}
async function getAnomalies(): Promise<AnomalyResult | null> {
  try { return await apiGet('/ai/anomalies'); } catch { return null; }
}
async function getSparklineData(): Promise<SparklineData | null> {
  try { return await apiGet<SparklineData>('/reports/sparkline'); } catch { return null; }
}
// Phase 9: fetch current quarter HST position
async function getHstPosition(): Promise<HstPosition | null> {
  try { return await apiGet<HstPosition>('/tax/hst/position'); } catch { return null; }
}

function deriveMetrics(tb: TrialBalance | null) {
  if (!tb) return { revenue: 0, expenses: 0, netIncome: 0 };
  const revenue  = tb.lines.filter((l) => l.account_type === 'revenue').reduce((s, l) => s + (l.total_credits - l.total_debits), 0);
  const expenses = tb.lines.filter((l) => l.account_type === 'expense').reduce((s, l) => s + (l.total_debits - l.total_credits), 0);
  return { revenue, expenses, netIncome: revenue - expenses };
}
function statusVariant(s: string): 'pending' | 'classified' | 'posted' | 'review' {
  return ({ pending: 'pending', classified: 'classified', posted: 'posted', ignored: 'review' } as Record<string, 'pending' | 'classified' | 'posted' | 'review'>)[s] ?? 'pending';
}
function severityIcon(s: AnomalyFlag['severity']) {
  if (s === 'high')   return <ShieldAlert   className="w-4 h-4 text-red-500   flex-shrink-0" />;
  if (s === 'medium') return <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0" />;
  return <Info className="w-4 h-4 text-blue-400 flex-shrink-0" />;
}
function severityBadgeClass(s: AnomalyFlag['severity']) {
  if (s === 'high')   return 'bg-red-50   text-red-700   border-red-200   dark:bg-red-950   dark:text-red-400   dark:border-red-900';
  if (s === 'medium') return 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-400 dark:border-amber-900';
  return 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-400 dark:border-blue-900';
}

export default async function DashboardPage() {
  const [business, trialBalance, transactions, banks, anomalies, sparklines, hstPosition, accessRequests] = await Promise.all([
    getMyBusiness(), getTrialBalance(), getRecentTransactions(),
    getConnectedBanks(), getAnomalies(), getSparklineData(), getHstPosition(), getAccessRequests(),
  ]);

  if (business?.mode === 'freelancer') redirect('/freelancer/dashboard');
  if (business?.mode === 'personal')   redirect('/personal/dashboard');

  const { revenue, expenses, netIncome } = deriveMetrics(trialBalance);
  const pendingCount  = transactions.filter((t) => t.status === 'pending').length;
  const highAnomalies = anomalies?.flags.filter((f) => f.severity === 'high') ?? [];

  const revenueSparkline  = sparklines?.revenue.map((p) => p.value)  ?? [];
  const expensesSparkline = sparklines?.expenses.map((p) => p.value) ?? [];
  const netSparkline      = sparklines?.net.map((p) => p.value)      ?? [];
  const pendingSparkline  = sparklines?.pending.map((p) => p.value)  ?? [];

  // Only show HST card for Canadian businesses with province configured
  const showHstCard = !!(
    (business as any)?.country === 'CA' &&
    (business as any)?.province_code &&
    hstPosition
  );

  return (
    <div className="p-4 md:p-6 max-w-screen-xl mx-auto">

      {/* Page header */}
      <div className="mb-5">
        <h1 className="text-xl font-semibold text-foreground">Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          {new Date().toLocaleDateString('en-CA', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </p>
      </div>

      {/* High severity anomaly banner */}
      {highAnomalies.length > 0 && (
        <div className="mb-5 flex items-start gap-3 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-900 rounded-xl px-4 py-3">
          <ShieldAlert className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-red-700 dark:text-red-400">
              {highAnomalies.length} high-severity anomal{highAnomalies.length > 1 ? 'ies' : 'y'} detected
            </p>
            <p className="text-xs text-red-500 mt-0.5">{highAnomalies[0].reason}</p>
          </div>
        </div>
      )}

      {/* Pending accountant access request banner */}
      {accessRequests.filter((r: any) => r.status === 'pending').map((r: any) => (
        <AccessRequestBanner key={r.id} request={r} />
      ))}

      {/* KPI cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 mb-5">
        <MetricCard
          label="Total Revenue" value={formatCurrency(revenue)}
          icon={TrendingUp} iconColor="text-primary" iconBg="bg-primary-light"
          sub={`YTD ${new Date().getFullYear()}`}
          sparklineData={revenueSparkline} sparklineColor="#0F6E56"
          accentClass="border-t-2 border-t-[#0F6E56]"
        />
        <MetricCard
          label="Total Expenses" value={formatCurrency(expenses)}
          icon={TrendingDown} iconColor="text-danger" iconBg="bg-danger-light"
          sub={`YTD ${new Date().getFullYear()}`}
          sparklineData={expensesSparkline} sparklineColor="#c0392b"
          accentClass="border-t-2 border-t-[#c0392b]"
        />
        <MetricCard
          label="Net Income" value={formatCurrency(netIncome)}
          icon={DollarSign}
          iconColor={netIncome >= 0 ? 'text-primary' : 'text-danger'}
          iconBg={netIncome >= 0 ? 'bg-primary-light' : 'bg-danger-light'}
          sub={netIncome >= 0 ? 'Profitable' : 'Loss'}
          sparklineData={netSparkline}
          sparklineColor={netIncome >= 0 ? '#0F6E56' : '#c0392b'}
          accentClass="border-t-2 border-t-[#185fa5]"
        />
        <MetricCard
          label="Pending Review" value={pendingCount.toString()}
          icon={Clock} iconColor="text-warning" iconBg="bg-warning-light"
          sub={pendingCount > 0 ? 'Needs classification' : 'All clear'}
          sparklineData={pendingSparkline} sparklineColor="#92620a"
          accentClass="border-t-2 border-t-[#92620a]"
        />
      </div>

      {/* Dashboard charts */}
      <DashboardCharts
        revenueData={sparklines?.revenue   ?? []}
        expensesData={sparklines?.expenses ?? []}
        netData={sparklines?.net           ?? []}
      />

      {/* Main content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* Left/main — transactions + anomalies */}
        <div className="col-span-1 lg:col-span-2 flex flex-col gap-4">
          <Card>
            <CardHeader className="flex-row items-center justify-between pb-3">
              <CardTitle>Recent Transactions</CardTitle>
              <a href="/transactions" className="text-xs text-primary hover:underline font-medium">View all →</a>
            </CardHeader>
            <CardContent className="p-0">
              {transactions.length === 0 ? (
                <EmptyState icon={RefreshCw} message="No transactions yet. Connect a bank to start importing." />
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {transactions.map((tx) => (
                        <TableRow key={tx.id}>
                          <TableCell className="text-muted-foreground whitespace-nowrap text-xs">
                            {new Date(tx.transaction_date).toLocaleDateString('en-CA', { month: 'short', day: 'numeric' })}
                          </TableCell>
                          <TableCell className="max-w-[160px] md:max-w-[240px] truncate">{tx.description}</TableCell>
                          <TableCell className={`whitespace-nowrap font-medium ${tx.amount >= 0 ? 'text-primary' : 'text-destructive'}`}>
                            {tx.amount >= 0 ? '+' : ''}{formatCurrency(tx.amount)}
                          </TableCell>
                          <TableCell>
                            <Badge variant={statusVariant(tx.status)}>
                              {tx.status.charAt(0).toUpperCase() + tx.status.slice(1)}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex-row items-center justify-between pb-3">
              <CardTitle className="flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-muted-foreground" />
                AI Anomaly Detection
              </CardTitle>
              {anomalies && (
                <span className="text-xs text-muted-foreground">
                  {anomalies.flags.length} flag{anomalies.flags.length !== 1 ? 's' : ''}
                </span>
              )}
            </CardHeader>
            <CardContent className="pt-0">
              {!anomalies && <EmptyState icon={ShieldAlert} message="Anomaly detection unavailable." compact />}
              {anomalies?.flags.length === 0 && (
                <div className="flex items-center gap-2 py-3 text-sm text-primary">
                  <div className="w-5 h-5 rounded-full bg-primary-light flex items-center justify-center">
                    <TrendingUp className="w-3 h-3 text-primary" />
                  </div>
                  No anomalies detected — your books look clean.
                </div>
              )}
              {anomalies && anomalies.flags.length > 0 && (
                <div className="flex flex-col gap-2">
                  {anomalies.flags.slice(0, 5).map((flag, i) => (
                    <div key={i} className={`flex items-start gap-3 rounded-lg border px-3 py-2.5 ${severityBadgeClass(flag.severity)}`}>
                      {severityIcon(flag.severity)}
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-medium truncate">{flag.entry_number} — {flag.description}</div>
                        <div className="text-xs mt-0.5 opacity-80">{flag.reason}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right — banks + P&L + HST Position */}
        <div className="flex flex-col gap-4">
          <Card>
            <CardHeader className="flex-row items-center justify-between pb-3">
              <CardTitle>Connected Banks</CardTitle>
              <a href="/banks" className="text-xs text-primary hover:underline font-medium">+ Add</a>
            </CardHeader>
            <CardContent className="pt-0">
              {banks.length === 0 ? (
                <EmptyState icon={Building2} message="No banks connected yet." compact />
              ) : (
                <div className="flex flex-col gap-3">
                  {banks.map((bank) => (
                    <div key={bank.id} className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-md bg-primary-light flex items-center justify-center text-primary text-[10px] font-bold flex-shrink-0">
                        {bank.institution_name.slice(0, 3).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-foreground truncate">{bank.institution_name}</div>
                        <div className="text-xs text-muted-foreground">
                          {bank.last_synced_at
                            ? `Synced ${new Date(bank.last_synced_at).toLocaleDateString('en-CA', { month: 'short', day: 'numeric' })}`
                            : 'Pending sync'}
                        </div>
                      </div>
                      <Badge variant={bank.status === 'active' ? 'classified' : 'destructive'}>
                        {bank.status === 'active' ? 'Live' : 'Error'}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3"><CardTitle>P&amp;L Summary</CardTitle></CardHeader>
            <CardContent className="pt-0">
              <div className="flex flex-col gap-2">
                <SummaryRow label="Revenue"  value={formatCurrency(revenue)}  valueClass="text-primary" />
                <SummaryRow label="Expenses" value={formatCurrency(expenses)} valueClass="text-destructive" />
                <div className="h-px bg-border my-1" />
                <SummaryRow
                  label="Net Income" value={formatCurrency(netIncome)} bold
                  valueClass={netIncome >= 0 ? 'text-primary font-semibold' : 'text-destructive font-semibold'}
                />
              </div>
              {trialBalance && !trialBalance.is_balanced && (
                <div className="mt-3 flex items-center gap-1.5 text-xs text-destructive">
                  <AlertCircle className="w-3 h-3" />Trial balance is not balanced
                </div>
              )}
            </CardContent>
          </Card>

          {/* Phase 9: HST Position Card — CA businesses only */}
          {showHstCard && hstPosition && (
            <HstPositionCard position={hstPosition} />
          )}
        </div>

      </div>
    </div>
  );
}

// ── Phase 9: HST Position Card ────────────────────────────────────────────────

function HstPositionCard({ position }: { position: HstPosition }) {
  const isOwing  = position.position_indicator === 'owing';
  const isRefund = position.position_indicator === 'refund';

  const accentClass = isOwing
    ? 'border-t-2 border-t-amber-500'
    : isRefund
    ? 'border-t-2 border-t-[#0F6E56]'
    : 'border-t-2 border-t-border';

  const amountColor = isOwing
    ? 'text-amber-600 dark:text-amber-400'
    : isRefund
    ? 'text-[#0F6E56] dark:text-emerald-400'
    : 'text-foreground';

  const badgeClass = isOwing
    ? 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-800'
    : isRefund
    ? 'bg-[#EDF7F2] text-[#0F6E56] border-[#C3E8D8] dark:bg-[#0F6E56]/10 dark:text-emerald-400 dark:border-[#0F6E56]/30'
    : 'bg-muted text-muted-foreground border-border';

  const badgeLabel = isOwing ? 'Owing' : isRefund ? 'Refund' : 'Nil';

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString('en-CA', { month: 'short', day: 'numeric' });

  return (
    <Card className={accentClass}>
      <CardHeader className="flex-row items-center justify-between pb-3">
        <CardTitle className="flex items-center gap-2 text-sm">
          <Receipt className="w-4 h-4 text-muted-foreground" />
          HST / GST Position
        </CardTitle>
        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${badgeClass}`}>
          {badgeLabel}
        </span>
      </CardHeader>
      <CardContent className="pt-0 flex flex-col gap-3">
        {/* Current quarter */}
        <p className="text-xs text-muted-foreground">
          {formatDate(position.period_start)} — {formatDate(position.period_end)}
        </p>

        {/* Key figures */}
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">HST Collected (L103)</span>
            <span className="text-xs font-medium text-foreground">
              ${position.total_output_tax.toFixed(2)}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">ITC Eligible (L106)</span>
            <span className="text-xs font-medium text-[#0F6E56]">
              −${position.total_itc_eligible.toFixed(2)}
            </span>
          </div>
          <div className="h-px bg-border" />
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-foreground">Net Tax (L109)</span>
            <span className={`text-sm font-semibold ${amountColor}`}>
              ${Math.abs(position.net_tax_owing).toFixed(2)}
              {isRefund && <span className="text-xs font-normal ml-1">CR</span>}
            </span>
          </div>
        </div>

        {/* Unposted warning */}
        {position.unposted_transaction_count > 0 && (
          <div className="flex items-start gap-1.5 text-xs text-amber-600 dark:text-amber-400">
            <AlertCircle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
            <span>
              {position.unposted_transaction_count} unposted transaction{position.unposted_transaction_count > 1 ? 's' : ''} — report may be incomplete
            </span>
          </div>
        )}

        {/* Link to full report */}
        <a
          href="/tax"
          className="flex items-center gap-1 text-xs text-primary hover:underline font-medium w-fit"
        >
          View full CRA report <ExternalLink className="w-3 h-3" />
        </a>
      </CardContent>
    </Card>
  );
}

// ── Shared sub-components ─────────────────────────────────────────────────────

function MetricCard({
  label, value, icon: Icon, iconColor, iconBg, sub, sparklineData, sparklineColor, accentClass,
}: {
  label: string; value: string; icon: React.ElementType; iconColor: string;
  iconBg: string; sub: string; sparklineData?: number[]; sparklineColor?: string;
  accentClass?: string;
}) {
  return (
    <Card className={accentClass}>
      <CardContent className="pt-4 pb-4">
        <div className="flex items-start justify-between mb-2">
          <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{label}</div>
          <div className={`w-8 h-8 rounded-lg ${iconBg} flex items-center justify-center flex-shrink-0`}>
            <Icon className={`w-4 h-4 ${iconColor}`} />
          </div>
        </div>
        <div className="text-2xl font-semibold text-foreground mb-1 tracking-tight">{value}</div>
        <div className="flex items-end justify-between">
          <div className="text-xs text-muted-foreground">{sub}</div>
          {sparklineData && sparklineData.length >= 2 && (
            <Sparkline data={sparklineData} color={sparklineColor} width={72} height={22} />
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function SummaryRow({ label, value, valueClass, bold }: {
  label: string; value: string; valueClass: string; bold?: boolean;
}) {
  return (
    <div className="flex items-center justify-between">
      <span className={`text-sm ${bold ? 'font-medium text-foreground' : 'text-muted-foreground'}`}>{label}</span>
      <span className={`text-sm ${valueClass}`}>{value}</span>
    </div>
  );
}

function EmptyState({ icon: Icon, message, compact }: {
  icon: React.ElementType; message: string; compact?: boolean;
}) {
  return (
    <div className={`flex flex-col items-center justify-center text-center ${compact ? 'py-4' : 'py-10'}`}>
      <Icon className="w-6 h-6 text-muted-foreground mb-2" />
      <p className="text-sm text-muted-foreground">{message}</p>
    </div>
  );
}


