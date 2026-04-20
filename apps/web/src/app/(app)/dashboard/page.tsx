import { AccessRequestBanner } from '@/components/access-request-banner';
import { AnomalyCard } from '@/components/anomaly-card';
import { ReferralAttributor } from '@/components/referral-attributor';
import { getAccessRequests } from '@/app/(app)/settings/actions';
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

interface AnomalyFlag { journal_entry_id: string; entry_number: string; description: string; severity: 'high' | 'medium' | 'low'; reason: string; }
interface SparklinePoint { date: string; value: number; }
interface SparklineData { revenue: SparklinePoint[]; expenses: SparklinePoint[]; net: SparklinePoint[]; pending: SparklinePoint[]; }
interface HstPosition { period_start: string; period_end: string; total_output_tax: number; total_itc_eligible: number; net_tax_owing: number; position_indicator: 'owing' | 'refund' | 'nil'; unposted_transaction_count: number; }

async function getMyBusiness(): Promise<Business | null> { try { return await apiGet<Business>('/businesses/me'); } catch { return null; } }
async function getTrialBalance(): Promise<TrialBalance | null> {
  try { const today = new Date(); return await apiGet(`/reports/trial-balance?startDate=${today.getFullYear()}-01-01&endDate=${today.toISOString().split('T')[0]}`); } catch { return null; }
}
async function getRecentTransactions(): Promise<RawTransaction[]> {
  try { const data = await apiGet<{ data: RawTransaction[]; total: number }>('/classification/raw?limit=8'); return data?.data ?? []; } catch { return []; }
}
async function getConnectedBanks(): Promise<PlaidItem[]> { try { return await apiGet('/plaid/items'); } catch { return []; } }
async function getSparklineData(): Promise<SparklineData | null> { try { return await apiGet<SparklineData>('/reports/sparkline'); } catch { return null; } }
async function getHstPosition(): Promise<HstPosition | null> { try { return await apiGet<HstPosition>('/tax/hst/position'); } catch { return null; } }

function deriveMetrics(tb: TrialBalance | null) {
  if (!tb) return { revenue: 0, expenses: 0, netIncome: 0 };
  const revenue  = tb.lines.filter((l) => l.account_type === 'revenue').reduce((s, l) => s + (l.total_credits - l.total_debits), 0);
  const expenses = tb.lines.filter((l) => l.account_type === 'expense').reduce((s, l) => s + (l.total_debits - l.total_credits), 0);
  return { revenue, expenses, netIncome: revenue - expenses };
}
function statusVariant(s: string): 'pending' | 'classified' | 'posted' | 'review' {
  return ({ pending: 'pending', classified: 'classified', posted: 'posted', ignored: 'review' } as Record<string, 'pending' | 'classified' | 'posted' | 'review'>)[s] ?? 'pending';
}

export default async function DashboardPage() {
  const [business, trialBalance, transactions, banks, sparklines, hstPosition, accessRequests] = await Promise.all([
    getMyBusiness(), getTrialBalance(), getRecentTransactions(),
    getConnectedBanks(), getSparklineData(), getHstPosition(), getAccessRequests(),
  ]);

  if (business?.mode === 'freelancer') redirect('/freelancer/dashboard');
  if (business?.mode === 'personal')   redirect('/personal/dashboard');

  const { revenue, expenses, netIncome } = deriveMetrics(trialBalance);
  const pendingCount  = transactions.filter((t) => t.status === 'pending').length;
  const highAnomalies: any[] = [];

  const revenueSparkline  = sparklines?.revenue.map((p) => p.value)  ?? [];
  const expensesSparkline = sparklines?.expenses.map((p) => p.value) ?? [];
  const netSparkline      = sparklines?.net.map((p) => p.value)      ?? [];
  const pendingSparkline  = sparklines?.pending.map((p) => p.value)  ?? [];

  const showHstCard = !!((business as any)?.country === 'CA' && (business as any)?.province_code && hstPosition);

  return (
    <div className="p-4 md:p-6 max-w-screen-xl mx-auto">
      <ReferralAttributor />

      <div className="mb-5">
        <h1 className="text-2xl font-extrabold text-foreground">Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          {new Date().toLocaleDateString('en-CA', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </p>
      </div>

      {highAnomalies.length > 0 && (
        <div className="mb-5 flex items-start gap-3 bg-accent-red-muted border border-accent-red/20 rounded-xl px-4 py-3">
          <ShieldAlert className="w-5 h-5 text-accent-red flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-accent-red">{highAnomalies.length} high-severity anomal{highAnomalies.length > 1 ? 'ies' : 'y'} detected</p>
            <p className="text-xs text-accent-red/70 mt-0.5">{highAnomalies[0].reason}</p>
          </div>
        </div>
      )}

      {accessRequests.filter((r: any) => r.status === 'pending').map((r: any) => (
        <AccessRequestBanner key={r.id} request={r} />
      ))}

      {/* KPI cards with left accent strips */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 mb-5">
        <MetricCard label="Total Revenue" value={formatCurrency(revenue)} icon={TrendingUp} sub={`YTD ${new Date().getFullYear()}`} sparklineData={revenueSparkline} sparklineColor="#1D9E75" accentColor="teal" />
        <MetricCard label="Total Expenses" value={formatCurrency(expenses)} icon={TrendingDown} sub={`YTD ${new Date().getFullYear()}`} sparklineData={expensesSparkline} sparklineColor="#D85A30" accentColor="coral" />
        <MetricCard label="Net Income" value={formatCurrency(netIncome)} icon={DollarSign} sub={netIncome >= 0 ? 'Profitable' : 'Loss'} sparklineData={netSparkline} sparklineColor="#534AB7" accentColor="purple" />
        <MetricCard label="Pending Review" value={pendingCount.toString()} icon={Clock} sub={pendingCount > 0 ? 'Needs classification' : 'All clear'} sparklineData={pendingSparkline} sparklineColor="#BA7517" accentColor="amber" />
      </div>

      <DashboardCharts revenueData={sparklines?.revenue ?? []} expensesData={sparklines?.expenses ?? []} netData={sparklines?.net ?? []} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="col-span-1 lg:col-span-2 flex flex-col gap-4">
          <Card>
            <CardHeader className="flex-row items-center justify-between pb-3">
              <CardTitle>Recent Transactions</CardTitle>
              <a href="/transactions" className="text-xs text-accent-teal hover:underline font-medium">View all &rarr;</a>
            </CardHeader>
            <CardContent className="p-0">
              {transactions.length === 0 ? (
                <EmptyState icon={RefreshCw} message="No transactions yet. Connect a bank to start importing." />
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader><TableRow><TableHead>Date</TableHead><TableHead>Description</TableHead><TableHead>Amount</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
                    <TableBody>
                      {transactions.map((tx) => (
                        <TableRow key={tx.id}>
                          <TableCell className="text-muted-foreground whitespace-nowrap text-xs">{new Date(tx.transaction_date).toLocaleDateString('en-CA', { month: 'short', day: 'numeric' })}</TableCell>
                          <TableCell className="max-w-[160px] md:max-w-[240px] truncate">{tx.description}</TableCell>
                          <TableCell className={`whitespace-nowrap font-medium ${tx.amount >= 0 ? 'text-accent-teal' : 'text-foreground'}`}>{tx.amount >= 0 ? '+' : ''}{formatCurrency(tx.amount)}</TableCell>
                          <TableCell><Badge variant={statusVariant(tx.status)}>{tx.status.charAt(0).toUpperCase() + tx.status.slice(1)}</Badge></TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
          <AnomalyCard />
        </div>

        <div className="flex flex-col gap-4">
          <Card>
            <CardHeader className="flex-row items-center justify-between pb-3">
              <CardTitle>Connected Banks</CardTitle>
              <a href="/banks" className="text-xs text-accent-teal hover:underline font-medium">+ Add</a>
            </CardHeader>
            <CardContent className="pt-0">
              {banks.length === 0 ? <EmptyState icon={Building2} message="No banks connected yet." compact /> : (
                <div className="flex flex-col gap-3">
                  {banks.map((bank) => (
                    <div key={bank.id} className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-md bg-accent-teal-muted flex items-center justify-center text-accent-teal text-[10px] font-bold flex-shrink-0">{bank.institution_name.slice(0, 3).toUpperCase()}</div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-foreground truncate">{bank.institution_name}</div>
                        <div className="text-xs text-muted-foreground">{bank.last_synced_at ? `Synced ${new Date(bank.last_synced_at).toLocaleDateString('en-CA', { month: 'short', day: 'numeric' })}` : 'Pending sync'}</div>
                      </div>
                      <Badge variant={bank.status === 'active' ? 'classified' : 'destructive'}>{bank.status === 'active' ? 'Live' : 'Error'}</Badge>
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
                <SummaryRow label="Revenue"  value={formatCurrency(revenue)}  valueClass="text-accent-teal" />
                <SummaryRow label="Expenses" value={formatCurrency(expenses)} valueClass="text-accent-coral" />
                <div className="h-px bg-border my-1" />
                <SummaryRow label="Net Income" value={formatCurrency(netIncome)} bold valueClass={netIncome >= 0 ? 'text-accent-teal font-semibold' : 'text-accent-red font-semibold'} />
              </div>
              {trialBalance && !trialBalance.is_balanced && (
                <div className="mt-3 flex items-center gap-1.5 text-xs text-accent-red"><AlertCircle className="w-3 h-3" />Trial balance is not balanced</div>
              )}
            </CardContent>
          </Card>

          {showHstCard && hstPosition && <HstPositionCard position={hstPosition} />}
        </div>
      </div>
    </div>
  );
}

function HstPositionCard({ position }: { position: HstPosition }) {
  const isOwing  = position.position_indicator === 'owing';
  const isRefund = position.position_indicator === 'refund';
  const formatDate = (d: string) => new Date(d).toLocaleDateString('en-CA', { month: 'short', day: 'numeric' });

  return (
    <Card className={isOwing ? 'border-l-3 border-l-accent-amber' : isRefund ? 'border-l-3 border-l-accent-teal' : ''} style={{ borderLeftWidth: '3px' }}>
      <CardHeader className="flex-row items-center justify-between pb-3">
        <CardTitle className="flex items-center gap-2 text-sm"><Receipt className="w-4 h-4 text-muted-foreground" />HST / GST Position</CardTitle>
        <Badge variant={isOwing ? 'warning' : isRefund ? 'default' : 'secondary'}>
          {isOwing ? 'Owing' : isRefund ? 'Refund' : 'Nil'}
        </Badge>
      </CardHeader>
      <CardContent className="pt-0 flex flex-col gap-3">
        <p className="text-xs text-muted-foreground">{formatDate(position.period_start)} &ndash; {formatDate(position.period_end)}</p>
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">HST Collected (L103)</span>
            <span className="text-xs font-medium text-foreground">${position.total_output_tax.toFixed(2)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">ITC Eligible (L106)</span>
            <span className="text-xs font-medium text-accent-teal">&minus;${position.total_itc_eligible.toFixed(2)}</span>
          </div>
          <div className="h-px bg-border" />
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-foreground">Net Tax (L109)</span>
            <span className={`text-sm font-semibold ${isOwing ? 'text-accent-amber' : isRefund ? 'text-accent-teal' : 'text-foreground'}`}>${Math.abs(position.net_tax_owing).toFixed(2)}{isRefund && <span className="text-xs font-normal ml-1">CR</span>}</span>
          </div>
        </div>
        {position.unposted_transaction_count > 0 && (
          <div className="flex items-start gap-1.5 text-xs text-accent-amber">
            <AlertCircle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
            <span>{position.unposted_transaction_count} unposted transaction{position.unposted_transaction_count > 1 ? 's' : ''} &mdash; report may be incomplete</span>
          </div>
        )}
        <a href="/tax" className="flex items-center gap-1 text-xs text-accent-teal hover:underline font-medium w-fit">View full CRA report <ExternalLink className="w-3 h-3" /></a>
      </CardContent>
    </Card>
  );
}

/* Accent color map for metric cards */
const ACCENT_MAP: Record<string, { border: string; value: string; iconBg: string; iconText: string }> = {
  teal:   { border: 'var(--de-accent-teal)',   value: 'text-accent-teal',   iconBg: 'bg-accent-teal-muted',   iconText: 'text-accent-teal' },
  coral:  { border: 'var(--de-accent-coral)',  value: 'text-accent-coral',  iconBg: 'bg-accent-coral-muted',  iconText: 'text-accent-coral' },
  purple: { border: 'var(--de-accent-purple)', value: 'text-accent-purple', iconBg: 'bg-accent-purple-muted', iconText: 'text-accent-purple' },
  amber:  { border: 'var(--de-accent-amber)',  value: 'text-accent-amber',  iconBg: 'bg-accent-amber-muted',  iconText: 'text-accent-amber' },
  blue:   { border: 'var(--de-accent-blue)',   value: 'text-accent-blue',   iconBg: 'bg-accent-blue-muted',   iconText: 'text-accent-blue' },
  red:    { border: 'var(--de-accent-red)',    value: 'text-accent-red',    iconBg: 'bg-accent-red-muted',    iconText: 'text-accent-red' },
};

function MetricCard({ label, value, icon: Icon, sub, sparklineData, sparklineColor, accentColor }: {
  label: string; value: string; icon: React.ElementType;
  sub: string; sparklineData?: number[]; sparklineColor?: string; accentColor?: string;
}) {
  const a = ACCENT_MAP[accentColor ?? 'teal'];
  return (
    <Card style={{ borderLeft: `3px solid ${a.border}`, borderRadius: '0 0.75rem 0.75rem 0' }}>
      <CardContent className="pt-4 pb-4">
        <div className="flex items-start justify-between mb-2">
          <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{label}</div>
          <div className={`w-8 h-8 rounded-lg ${a.iconBg} flex items-center justify-center flex-shrink-0`}><Icon className={`w-4 h-4 ${a.iconText}`} /></div>
        </div>
        <div className={`text-2xl font-bold ${a.value} mb-1 tracking-tight`}>{value}</div>
        <div className="flex items-end justify-between">
          <div className="text-xs text-muted-foreground">{sub}</div>
          {sparklineData && sparklineData.length >= 2 && <Sparkline data={sparklineData} color={sparklineColor} width={72} height={22} />}
        </div>
      </CardContent>
    </Card>
  );
}

function SummaryRow({ label, value, valueClass, bold }: { label: string; value: string; valueClass: string; bold?: boolean; }) {
  return (
    <div className="flex items-center justify-between">
      <span className={`text-sm ${bold ? 'font-medium text-foreground' : 'text-muted-foreground'}`}>{label}</span>
      <span className={`text-sm ${valueClass}`}>{value}</span>
    </div>
  );
}

function EmptyState({ icon: Icon, message, compact }: { icon: React.ElementType; message: string; compact?: boolean; }) {
  return (
    <div className={`flex flex-col items-center justify-center text-center ${compact ? 'py-4' : 'py-10'}`}>
      <Icon className="w-6 h-6 text-muted-foreground mb-2" />
      <p className="text-sm text-muted-foreground">{message}</p>
    </div>
  );
}
