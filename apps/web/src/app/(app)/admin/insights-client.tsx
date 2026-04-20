'use client';

import { useState, useEffect } from 'react';
import {
  Loader2, Users, DollarSign, Activity, Target,
  TrendingUp, TrendingDown, Zap, Building2, CreditCard,
  LinkIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ── Types ───────────────────────────────────────────────────────────────────
interface InsightsData {
  users: {
    total: number;
    active: number;
    trialing: number;
    past_due: number;
    cancelled: number;
    trialToPaidRate: number;
    churnRate: number;
    signupsOverTime: { date: string; count: number }[];
  };
  revenue: {
    mrrCents: number;
    arrCents: number;
    arpu: number;
    paymentFailureRate: number;
    planBreakdown: { plan: string; mrr: number; count: number }[];
  };
  engagement: {
    activeBizCount: number;
    classifiedThisMonth: number;
    plaidConnections: number;
    aiCallsThisMonth: number;
    aiGlobalCap: number;
  };
  funnel: {
    totalLeads: number;
    leadsByStatus: { status: string; count: number }[];
    leadsByType: { type: string; count: number }[];
    campaignsSent: number;
    emailsSent: number;
    emailsSkipped: number;
    leadToSignupRate: number;
    referralSummary: {
      totalPartners: number;
      totalSignups: number;
      totalConversions: number;
      totalCommissionAccrued: number;
    };
  };
}

const RANGES = [
  { value: '7d',  label: '7d' },
  { value: '30d', label: '30d' },
  { value: '90d', label: '90d' },
  { value: '12mo', label: '12mo' },
  { value: 'all', label: 'All' },
];

const PLAN_COLORS: Record<string, string> = {
  starter:    '#6b7280',
  pro:        '#3b82f6',
  accountant: '#10b981',
};

const PLAN_BG: Record<string, string> = {
  starter:    'bg-gray-100 dark:bg-gray-800',
  pro:        'bg-blue-50 dark:bg-blue-900/20',
  accountant: 'bg-green-50 dark:bg-green-900/20',
};

const STATUS_COLORS: Record<string, string> = {
  new:       'bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400',
  contacted: 'bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400',
  nurturing: 'bg-purple-50 text-purple-700 dark:bg-purple-900/20 dark:text-purple-400',
  converted: 'bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400',
  lost:      'bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400',
};

// ── Helpers ─────────────────────────────────────────────────────────────────
function fmtCurrency(cents: number): string {
  return '$' + (cents / 100).toLocaleString('en-CA', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtNumber(n: number): string {
  return n.toLocaleString('en-CA');
}

// ── Stat Card ───────────────────────────────────────────────────────────────
function StatCard({
  label, value, sub, icon: Icon, accent,
}: {
  label: string;
  value: string;
  sub?: string;
  icon?: typeof Users;
  accent?: boolean;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-4 space-y-1">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
        {Icon && <Icon className={cn('w-4 h-4', accent ? 'text-primary' : 'text-muted-foreground/50')} />}
      </div>
      <p className={cn('text-xl font-bold', accent ? 'text-primary' : 'text-foreground')}>{value}</p>
      {sub && <p className="text-[11px] text-muted-foreground">{sub}</p>}
    </div>
  );
}

// ── Bar Chart (SVG) ─────────────────────────────────────────────────────────
function BarChart({ data, height = 120 }: { data: { date: string; count: number }[]; height?: number }) {
  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center py-8 text-xs text-muted-foreground">
        No signup data for this range.
      </div>
    );
  }

  const maxCount = Math.max(...data.map((d) => d.count), 1);
  const barWidth = Math.max(6, Math.min(32, Math.floor((600 - data.length * 2) / data.length)));
  const chartWidth = data.length * (barWidth + 2);

  return (
    <div className="overflow-x-auto">
      <svg
        viewBox={`0 0 ${chartWidth} ${height}`}
        width={chartWidth}
        height={height}
        className="block mx-auto"
      >
        {data.map((d, i) => {
          const barH = Math.max(2, (d.count / maxCount) * (height - 20));
          const x = i * (barWidth + 2);
          const y = height - barH - 16;
          return (
            <g key={i}>
              <rect
                x={x}
                y={y}
                width={barWidth}
                height={barH}
                rx={2}
                className="fill-primary/70"
              />
              <title>{d.date}: {d.count}</title>
              {barWidth >= 18 && data.length <= 31 && (
                <text
                  x={x + barWidth / 2}
                  y={height - 3}
                  textAnchor="middle"
                  className="fill-muted-foreground"
                  fontSize={7}
                >
                  {d.date.slice(5)}
                </text>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}

// ── Plan Breakdown Bars ─────────────────────────────────────────────────────
function PlanBreakdown({ data }: { data: { plan: string; mrr: number; count: number }[] }) {
  const totalMrr = data.reduce((s, d) => s + d.mrr, 0);
  if (totalMrr === 0) {
    return <p className="text-xs text-muted-foreground text-center py-4">No active subscriptions with revenue data.</p>;
  }
  return (
    <div className="space-y-2">
      {data.map((d) => {
        const pct = totalMrr > 0 ? (d.mrr / totalMrr) * 100 : 0;
        return (
          <div key={d.plan} className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium text-foreground capitalize">{d.plan}</span>
              <span className="text-muted-foreground">
                {fmtCurrency(d.mrr)} · {d.count} sub{d.count !== 1 ? 's' : ''}
              </span>
            </div>
            <div className="h-2 rounded-full bg-muted overflow-hidden">
              <div
                className="h-full rounded-full transition-all"
                style={{ width: `${pct}%`, backgroundColor: PLAN_COLORS[d.plan] ?? '#6b7280' }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── AI Usage Bar ────────────────────────────────────────────────────────────
function AiCapBar({ used, cap }: { used: number; cap: number }) {
  const pct = cap > 0 ? Math.min(100, (used / cap) * 100) : 0;
  return (
    <div className="space-y-1">
      <div className="h-2 rounded-full bg-muted overflow-hidden">
        <div
          className={cn('h-full rounded-full transition-all', pct > 80 ? 'bg-amber-500' : 'bg-primary')}
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="text-[10px] text-muted-foreground">{used} / {cap} calls ({pct.toFixed(0)}%)</p>
    </div>
  );
}

// ── Main Component ──────────────────────────────────────────────────────────
export function InsightsClient() {
  const [data, setData] = useState<InsightsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState('30d');
  const [error, setError] = useState('');

  useEffect(() => {
    setLoading(true);
    setError('');
    fetch(`/api/proxy/admin/insights?range=${range}`)
      .then((r) => { if (!r.ok) throw new Error('Failed to load'); return r.json(); })
      .then((d) => setData(d))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [range]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 gap-2 text-muted-foreground">
        <Loader2 className="w-5 h-5 animate-spin" />
        <span className="text-sm">Loading insights…</span>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="text-center py-16">
        <p className="text-sm text-destructive">{error || 'Failed to load insights.'}</p>
      </div>
    );
  }

  const { users, revenue, engagement, funnel } = data;

  return (
    <div className="space-y-8">
      {/* ── User Metrics ── */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <Users className="w-4 h-4 text-primary" />
            User Metrics
          </h3>
          <div className="flex gap-0.5 rounded-lg border border-border p-0.5 bg-muted/30">
            {RANGES.map((r) => (
              <button
                key={r.value}
                onClick={() => setRange(r.value)}
                className={cn(
                  'px-2.5 py-1 text-[11px] font-medium rounded-md transition-colors',
                  range === r.value
                    ? 'bg-card text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground',
                )}
              >
                {r.label}
              </button>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard label="Total Users" value={fmtNumber(users.total)} icon={Users} accent />
          <StatCard label="Active" value={fmtNumber(users.active)} sub={`${users.trialing} trialing · ${users.past_due} past due`} />
          <StatCard label="Trial → Paid" value={`${users.trialToPaidRate}%`} icon={TrendingUp} />
          <StatCard label="Monthly Churn" value={`${users.churnRate}%`} icon={TrendingDown} />
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-xs font-medium text-muted-foreground mb-3">Signups Over Time</p>
          <BarChart data={users.signupsOverTime} />
        </div>
      </section>

      {/* ── Revenue Metrics ── */}
      <section className="space-y-4">
        <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <DollarSign className="w-4 h-4 text-primary" />
          Revenue Metrics
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard label="MRR" value={fmtCurrency(revenue.mrrCents)} icon={DollarSign} accent />
          <StatCard label="ARR" value={fmtCurrency(revenue.arrCents)} />
          <StatCard label="ARPU" value={fmtCurrency(revenue.arpu)} sub="per subscriber / month" />
          <StatCard label="Payment Failure" value={`${revenue.paymentFailureRate}%`} icon={CreditCard} />
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-xs font-medium text-muted-foreground mb-3">Revenue by Plan</p>
          <PlanBreakdown data={revenue.planBreakdown} />
        </div>
      </section>

      {/* ── Engagement Metrics ── */}
      <section className="space-y-4">
        <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <Activity className="w-4 h-4 text-primary" />
          Engagement
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard label="Active Businesses" value={fmtNumber(engagement.activeBizCount)} icon={Building2} accent />
          <StatCard label="Classified (Month)" value={fmtNumber(engagement.classifiedThisMonth)} />
          <StatCard label="Plaid Connections" value={fmtNumber(engagement.plaidConnections)} icon={LinkIcon} />
          <div className="rounded-xl border border-border bg-card p-4 space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-muted-foreground">AI Calls (Month)</p>
              <Zap className="w-4 h-4 text-primary" />
            </div>
            <p className="text-xl font-bold text-foreground">{fmtNumber(engagement.aiCallsThisMonth)}</p>
            <AiCapBar used={engagement.aiCallsThisMonth} cap={engagement.aiGlobalCap} />
          </div>
        </div>
      </section>

      {/* ── Funnel & Campaign Metrics ── */}
      <section className="space-y-4">
        <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <Target className="w-4 h-4 text-primary" />
          Funnel &amp; Campaigns
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard label="Total Leads" value={fmtNumber(funnel.totalLeads)} icon={Users} accent />
          <StatCard label="Campaigns Sent" value={fmtNumber(funnel.campaignsSent)} sub={`${fmtNumber(funnel.emailsSent)} emails · ${fmtNumber(funnel.emailsSkipped)} skipped`} />
          <StatCard label="Lead → Signup" value={`${funnel.leadToSignupRate}%`} icon={TrendingUp} />
          <StatCard label="Referral Partners" value={fmtNumber(funnel.referralSummary.totalPartners)} sub={`${funnel.referralSummary.totalSignups} signups · ${funnel.referralSummary.totalConversions} converted`} />
        </div>

        {/* Lead status chips */}
        {funnel.leadsByStatus.length > 0 && (
          <div className="rounded-xl border border-border bg-card p-4">
            <p className="text-xs font-medium text-muted-foreground mb-3">Leads by Status</p>
            <div className="flex flex-wrap gap-2">
              {funnel.leadsByStatus.map((l) => (
                <span
                  key={l.status}
                  className={cn('text-xs font-semibold px-2.5 py-1 rounded-full capitalize', STATUS_COLORS[l.status] ?? 'bg-muted text-muted-foreground')}
                >
                  {l.status}: {l.count}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Referral commissions summary */}
        {funnel.referralSummary.totalCommissionAccrued > 0 && (
          <div className="rounded-xl border border-border bg-card p-4">
            <p className="text-xs font-medium text-muted-foreground mb-1">Commission Accrued (all time)</p>
            <p className="text-lg font-bold text-foreground">
              {fmtCurrency(funnel.referralSummary.totalCommissionAccrued * 100)}
            </p>
          </div>
        )}
      </section>
    </div>
  );
}
