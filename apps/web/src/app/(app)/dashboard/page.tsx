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
  AlertCircle, ShieldAlert, AlertTriangle, Info,
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
  if (s === 'high')   return 'bg-red-50   text-red-600   border-red-100';
  if (s === 'medium') return 'bg-amber-50 text-amber-600 border-amber-100';
  return 'bg-blue-50 text-blue-600 border-blue-100';
}

export default async function DashboardPage() {
  const [business, trialBalance, transactions, banks, anomalies, sparklines] = await Promise.all([
    getMyBusiness(), getTrialBalance(), getRecentTransactions(),
    getConnectedBanks(), getAnomalies(), getSparklineData(),
  ]);

  if (business?.mode === 'freelancer') redirect('/freelancer/dashboard');
  if (business?.mode === 'personal')   redirect('/personal/dashboard');

  const { revenue, expenses, netIncome } = deriveMetrics(trialBalance);
  const pendingCount   = transactions.filter((t) => t.status === 'pending').length;
  const highAnomalies  = anomalies?.flags.filter((f) => f.severity === 'high') ?? [];

  const revenueSparkline  = sparklines?.revenue.map((p) => p.value)  ?? [];
  const expensesSparkline = sparklines?.expenses.map((p) => p.value) ?? [];
  const netSparkline      = sparklines?.net.map((p) => p.value)      ?? [];
  const pendingSparkline  = sparklines?.pending.map((p) => p.value)  ?? [];

  return (
    <div className="p-6 max-w-screen-xl mx-auto">
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-foreground">Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          {new Date().toLocaleDateString('en-CA', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </p>
      </div>

      {highAnomalies.length > 0 && (
        <div className="mb-5 flex items-start gap-3 bg-red-50 dark:bg-destructive/10 border border-red-200 dark:border-destructive/30 rounded-xl px-4 py-3">
          <ShieldAlert className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-red-700 dark:text-destructive">
              {highAnomalies.length} high-severity anomal{highAnomalies.length > 1 ? 'ies' : 'y'} detected
            </p>
            <p className="text-xs text-red-500 mt-0.5">{highAnomalies[0].reason}</p>
          </div>
        </div>
      )}

      {/* Metric cards with sparklines */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <MetricCard
          label="Total Revenue" value={formatCurrency(revenue)}
          icon={TrendingUp} iconColor="text-primary" iconBg="bg-primary-light"
          sub={`YTD ${new Date().getFullYear()}`}
          sparklineData={revenueSparkline} sparklineColor="#0F6E56"
        />
        <MetricCard
          label="Total Expenses" value={formatCurrency(expenses)}
          icon={TrendingDown} iconColor="text-danger" iconBg="bg-danger-light"
          sub={`YTD ${new Date().getFullYear()}`}
          sparklineData={expensesSparkline} sparklineColor="#ef4444"
        />
        <MetricCard
          label="Net Income" value={formatCurrency(netIncome)}
          icon={DollarSign}
          iconColor={netIncome >= 0 ? 'text-primary' : 'text-danger'}
          iconBg={netIncome >= 0 ? 'bg-primary-light' : 'bg-danger-light'}
          sub={netIncome >= 0 ? 'Profitable' : 'Loss'}
          sparklineData={netSparkline}
          sparklineColor={netIncome >= 0 ? '#0F6E56' : '#ef4444'}
        />
        <MetricCard
          label="Pending Review" value={pendingCount.toString()}
          icon={Clock} iconColor="text-warning" iconBg="bg-warning-light"
          sub={pendingCount > 0 ? 'Needs classification' : 'All clear'}
          sparklineData={pendingSparkline} sparklineColor="#f59e0b"
        />
      </div>

      {/* Dashboard charts — Revenue vs Expenses bar + Net Income line.
          DashboardCharts is a client component; renders nothing if < 2 data points. */}
      <DashboardCharts
        revenueData={sparklines?.revenue   ?? []}
        expensesData={sparklines?.expenses ?? []}
        netData={sparklines?.net           ?? []}
      />

      {/* Main content grid */}
      <div className="grid grid-cols-3 gap-4">
        <div className="col-span-2 flex flex-col gap-4">
          <Card>
            <CardHeader className="flex-row items-center justify-between pb-3">
              <CardTitle>Recent Transactions</CardTitle>
              <a href="/transactions" className="text-xs text-primary hover:underline font-medium">View all →</a>
            </CardHeader>
            <CardContent className="p-0">
              {transactions.length === 0 ? (
                <EmptyState icon={RefreshCw} message="No transactions yet. Connect a bank to start importing." />
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead><TableHead>Description</TableHead>
                      <TableHead>Amount</TableHead><TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {transactions.map((tx) => (
                      <TableRow key={tx.id}>
                        <TableCell className="text-muted-foreground whitespace-nowrap">
                          {new Date(tx.transaction_date).toLocaleDateString('en-CA', { month: 'short', day: 'numeric' })}
                        </TableCell>
                        <TableCell className="max-w-[240px] truncate">{tx.description}</TableCell>
                        <TableCell className={tx.amount >= 0 ? 'text-primary font-medium' : 'text-destructive font-medium'}>
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
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex-row items-center justify-between pb-3">
              <CardTitle className="flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-muted-foreground" />AI Anomaly Detection
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
        </div>
      </div>
    </div>
  );
}

function MetricCard({
  label, value, icon: Icon, iconColor, iconBg, sub, sparklineData, sparklineColor,
}: {
  label: string; value: string; icon: React.ElementType; iconColor: string;
  iconBg: string; sub: string; sparklineData?: number[]; sparklineColor?: string;
}) {
  return (
    <Card>
      <CardContent className="pt-5">
        <div className="flex items-start justify-between mb-2">
          <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{label}</div>
          <div className={`w-8 h-8 rounded-lg ${iconBg} flex items-center justify-center flex-shrink-0`}>
            <Icon className={`w-4 h-4 ${iconColor}`} />
          </div>
        </div>
        <div className="text-2xl font-semibold text-foreground mb-1">{value}</div>
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
