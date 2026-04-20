'use client';

import { useState, useEffect } from 'react';
import {
  Loader2, Users, DollarSign, Activity, Target,
  TrendingUp, TrendingDown, Zap, Building2, CreditCard,
  LinkIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ── Types ───────────────────────────────────────────────────────────────
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

const STATUS_COLORS: Record<string, string> = {
  new:       'bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400',
  contacted: 'bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400',
  nurturing: 'bg-purple-50 text-purple-700 dark:bg-purple-900/20 dark:text-purple-400',
  converted: 'bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400',
  lost:      'bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400',
};

// ── Color schemes for stat cards ────────────────────────────────────────
type CardColor = 'green' | 'blue' | 'amber' | 'purple' | 'red' | 'default';

const CARD_STYLES: Record<CardColor, {
  border: string; valueCls: string; iconCls: string; stripCls: string;
}> = {
  green:   { border: 'border-emerald-200 dark:border-emerald-800/40', valueCls: 'text-emerald-700 dark:text-emerald-400', iconCls: 'text-emerald-500', stripCls: 'bg-emerald-500' },
  blue:    { border: 'border-blue-200 dark:border-blue-800/40',       valueCls: 'text-blue-700 dark:text-blue-400',       iconCls: 'text-blue-500',    stripCls: 'bg-blue-500' },
  amber:   { border: 'border-amber-200 dark:border-amber-800/40',     valueCls: 'text-amber-700 dark:text-amber-400',     iconCls: 'text-amber-500',   stripCls: 'bg-amber-500' },
  purple:  { border: 'border-purple-200 dark:border-purple-800/40',   valueCls: 'text-purple-700 dark:text-purple-400',   iconCls: 'text-purple-500',  stripCls: 'bg-purple-500' },
  red:     { border: 'border-red-200 dark:border-red-800/40',         valueCls: 'text-red-600 dark:text-red-400',         iconCls: 'text-red-500',     stripCls: 'bg-red-500' },
  default: { border: 'border-border',                                  valueCls: 'text-foreground',                        iconCls: 'text-muted-foreground/60', stripCls: 'bg-muted-foreground/30' },
};

// ── Helpers ──────────────────────────────────────────────────────────────
function fmtCurrency(cents: number): string {
  return '$' + (cents / 100).toLocaleString('en-CA', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtNumber(n: number): string {
  return n.toLocaleString('en-CA');
}

// ── Stat Card (polished) ────────────────────────────────────────────────
function StatCard({
  label, value, sub, icon: Icon, color = 'default',
}: {
  label: string;
  value: string;
  sub?: string;
  icon?: typeof Users;
  color?: CardColor;
}) {
  const s = CARD_STYLES[color];
  return (
    <div className={cn(
      'relative rounded-xl border bg-card p-4 space-y-1.5 shadow-sm overflow-hidden',
      'hover:shadow-md transition-shadow',
      s.border,
    )}>
      {/* Accent strip */}
      <div className={cn('absolute left-0 top-0 bottom-0 w-1 rounded-l-xl', s.stripCls)} />
      <div className="flex items-center justify-between pl-2">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
        {Icon && <Icon className={cn('w-4 h-4', s.iconCls)} />}
      </div>
      <p className={cn('text-2xl font-extrabold pl-2 tracking-tight', s.valueCls)}>{value}</p>
      {sub && <p className="text-[11px] text-muted-foreground pl-2">{sub}</p>}
    </div>
  );
}

// ── Bar Chart (SVG, gradient bars) ──────────────────────────────────────
function BarChart({ data, height = 130 }: { data: { date: string; count: number }[]; height?: number }) {
  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center py-8 text-xs text-muted-foreground">
        No signup data for this range.
      </div>
    );
  }

  const maxCount = Math.max(...data.map((d) => d.count), 1);
  const barWidth = Math.max(8, Math.min(36, Math.floor((600 - data.length * 3) / data.length)));
  const gap = 3;
  const chartWidth = data.length * (barWidth + gap);

  return (
    <div className="overflow-x-auto">
      <svg
        viewBox={`0 0 ${chartWidth} ${height}`}
        width={chartWidth}
        height={height}
        className="block mx-auto"
      >
        <defs>
          <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#059669" stopOpacity={0.9} />
            <stop offset="100%" stopColor="#10b981" stopOpacity={0.5} />
          </linearGradient>
        </defs>
        {data.map((d, i) => {
          const barH = Math.max(3, (d.count / maxCount) * (height - 22));
          const x = i * (barWidth + gap);
          const y = height - barH - 18;
          return (
            <g key={i}>
              <rect x={x} y={y} width={barWidth} height={barH} rx={3} fill="url(#barGrad)" />
              <title>{d.date}: {d.count}</title>
              {barWidth >= 18 && data.length <= 31 && (
                <text x={x + barWidth / 2} y={height - 4} textAnchor="middle"
                  className="fill-muted-foreground" fontSize={7}>
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

// ── Plan Breakdown Bars ─────────────────────────────────────────────────
function PlanBreakdown({ data }: { data: { plan: string; mrr: number; count: number }[] }) {
  const totalMrr = data.reduce((s, d) => s + d.mrr, 0);
  if (totalMrr === 0) {
    return <p className="text-xs text-muted-foreground text-center py-4">No active subscriptions with revenue data.</p>;
  }
  return (
    <div className="space-y-3">
      {data.map((d) => {
        const pct = totalMrr > 0 ? (d.mrr / totalMrr) * 100 : 0;
        return (
          <div key={d.plan} className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-foreground capitalize">{d.plan}</span>
              <span className="text-muted-foreground font-medium">
                {fmtCurrency(d.mrr)} · {d.count} sub{d.count !== 1 ? 's' : ''}
              </span>
            </div>
            <div className="h-2.5 rounded-full bg-muted overflow-hidden">
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

// ── AI Usage Bar ────────────────────────────────────────────────────────
function AiCapBar({ used, cap }: { used: number; cap: number }) {
  const pct = cap > 0 ? Math.min(100, (used / cap) * 100) : 0;
  return (
    <div className="space-y-1">
      <div className="h-2.5 rounded-full bg-muted overflow-hidden">
        <div
          className={cn('h-full rounded-full transition-all', pct > 80 ? 'bg-amber-500' : 'bg-emerald-500')}
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="text-[10px] text-muted-foreground font-medium">{used} / {cap} calls ({pct.toFixed(0)}%)</p>
    </div>
  );
}

// ── Section Header ──────────────────────────────────────────────────────
function SectionHeader({ icon: Icon, label, children }: {
  icon: typeof Users; label: string; children?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between">
      <h3 className="text-base font-bold text-foreground flex items-center gap-2.5">
        <span className="w-7 h-7 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center">
          <Icon className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
        </span>
        {label}
      </h3>
      {children}
    </div>
  );
}

// ── Main Component ──────────────────────────────────────────────────────
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
    <div className="space-y-10">
      {/* ── User Metrics ── */}
      <section className="space-y-4">
        <SectionHeader icon={Users} label="User Metrics">
          <div className="flex gap-0.5 rounded-lg border border-border p-0.5 bg-muted/40 shadow-sm">
            {RANGES.map((r) => (
              <button
                key={r.value}
                onClick={() => setRange(r.value)}
                className={cn(
                  'px-3 py-1.5 text-[11px] font-bold rounded-md transition-all',
                  range === r.value
                    ? 'bg-white dark:bg-card text-emerald-700 dark:text-emerald-400 shadow-sm'
                    : 'text-muted-foreground hover:text-foreground',
                )}
              >
                {r.label}
              </button>
            ))}
          </div>
        </SectionHeader>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard label="Total Users" value={fmtNumber(users.total)} icon={Users} color="green" />
          <StatCard label="Active" value={fmtNumber(users.active)}
            sub={`${users.trialing} trialing · ${users.past_due} past due`} color="blue" />
          <StatCard label="Trial → Paid" value={`${users.trialToPaidRate}%`} icon={TrendingUp} color="purple" />
          <StatCard label="Monthly Churn" value={`${users.churnRate}%`} icon={TrendingDown}
            color={users.churnRate > 5 ? 'red' : 'default'} />
        </div>
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-4">Signups Over Time</p>
          <BarChart data={users.signupsOverTime} />
        </div>
      </section>

      {/* ── Revenue Metrics ── */}
      <section className="space-y-4">
        <SectionHeader icon={DollarSign} label="Revenue Metrics" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard label="MRR" value={fmtCurrency(revenue.mrrCents)} icon={DollarSign} color="green" />
          <StatCard label="ARR" value={fmtCurrency(revenue.arrCents)} color="blue" />
          <StatCard label="ARPU" value={fmtCurrency(revenue.arpu)} sub="per subscriber / month" color="purple" />
          <StatCard label="Payment Failure" value={`${revenue.paymentFailureRate}%`} icon={CreditCard}
            color={revenue.paymentFailureRate > 5 ? 'red' : 'amber'} />
        </div>
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-4">Revenue by Plan</p>
          <PlanBreakdown data={revenue.planBreakdown} />
        </div>
      </section>

      {/* ── Engagement Metrics ── */}
      <section className="space-y-4">
        <SectionHeader icon={Activity} label="Engagement" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard label="Active Businesses" value={fmtNumber(engagement.activeBizCount)} icon={Building2} color="green" />
          <StatCard label="Classified (Month)" value={fmtNumber(engagement.classifiedThisMonth)} color="blue" />
          <StatCard label="Plaid Connections" value={fmtNumber(engagement.plaidConnections)} icon={LinkIcon} color="purple" />
          {/* AI card with usage bar */}
          <div className={cn(
            'relative rounded-xl border bg-card p-4 space-y-2 shadow-sm overflow-hidden',
            'hover:shadow-md transition-shadow border-amber-200 dark:border-amber-800/40',
          )}>
            <div className="absolute left-0 top-0 bottom-0 w-1 rounded-l-xl bg-amber-500" />
            <div className="flex items-center justify-between pl-2">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">AI Calls (Month)</p>
              <Zap className="w-4 h-4 text-amber-500" />
            </div>
            <p className="text-2xl font-extrabold text-amber-700 dark:text-amber-400 pl-2 tracking-tight">
              {fmtNumber(engagement.aiCallsThisMonth)}
            </p>
            <div className="pl-2">
              <AiCapBar used={engagement.aiCallsThisMonth} cap={engagement.aiGlobalCap} />
            </div>
          </div>
        </div>
      </section>

      {/* ── Funnel & Campaign Metrics ── */}
      <section className="space-y-4">
        <SectionHeader icon={Target} label="Funnel & Campaigns" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard label="Total Leads" value={fmtNumber(funnel.totalLeads)} icon={Users} color="green" />
          <StatCard label="Campaigns Sent" value={fmtNumber(funnel.campaignsSent)}
            sub={`${fmtNumber(funnel.emailsSent)} emails · ${fmtNumber(funnel.emailsSkipped)} skipped`} color="blue" />
          <StatCard label="Lead → Signup" value={`${funnel.leadToSignupRate}%`} icon={TrendingUp} color="purple" />
          <StatCard label="Referral Partners" value={fmtNumber(funnel.referralSummary.totalPartners)}
            sub={`${funnel.referralSummary.totalSignups} signups · ${funnel.referralSummary.totalConversions} converted`} color="amber" />
        </div>

        {/* Lead status chips */}
        {funnel.leadsByStatus.length > 0 && (
          <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">Leads by Status</p>
            <div className="flex flex-wrap gap-2">
              {funnel.leadsByStatus.map((l) => (
                <span
                  key={l.status}
                  className={cn('text-xs font-bold px-3 py-1.5 rounded-full capitalize', STATUS_COLORS[l.status] ?? 'bg-muted text-muted-foreground')}
                >
                  {l.status}: {l.count}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Referral commissions summary */}
        {funnel.referralSummary.totalCommissionAccrued > 0 && (
          <div className="rounded-xl border border-emerald-200 dark:border-emerald-800/40 bg-card p-5 shadow-sm">
            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1">Commission Accrued (all time)</p>
            <p className="text-2xl font-extrabold text-emerald-700 dark:text-emerald-400">
              {fmtCurrency(funnel.referralSummary.totalCommissionAccrued * 100)}
            </p>
          </div>
        )}
      </section>
    </div>
  );
}
