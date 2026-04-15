'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { ClientOverview, getClientAuditLog } from '@/app/(accountant)/accountant/clients/[id]/dashboard/actions';
import { ClientListItem } from '@/app/(accountant)/accountant/clients/actions';
import { ClientOverviewCard } from '@/components/client-overview-card';
import {
  ArrowLeftRight, TrendingUp, Scale, ClipboardList,
  BookOpen, Receipt, AlertTriangle, Clock,
  ChevronRight, ExternalLink, Loader2,
} from 'lucide-react';

interface ClientDashboardTabsProps {
  overview: ClientOverview;
  client: ClientListItem;
}

type Tab = 'overview' | 'reports' | 'hst' | 'audit';

const TABS: { id: Tab; label: string }[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'reports',  label: 'Reports' },
  { id: 'hst',      label: 'HST / Tax' },
  { id: 'audit',    label: 'Audit Log' },
];

function ActionBadge({ action }: { action: string }) {
  const cfg: Record<string, string> = {
    classify:      'bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400',
    post:          'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400',
    unclassify:    'bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400',
    bulk_classify: 'bg-purple-50 text-purple-700 dark:bg-purple-900/20 dark:text-purple-400',
    bulk_post:     'bg-teal-50 text-teal-700 dark:bg-teal-900/20 dark:text-teal-400',
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${cfg[action] ?? 'bg-muted text-muted-foreground'}`}>
      {action.replace(/_/g, ' ')}
    </span>
  );
}

function QuickActions({ businessId }: { businessId: string }) {
  const actions = [
    {
      label: 'Transactions',
      desc: 'View, classify, and post transactions',
      icon: ArrowLeftRight,
      href: '/transactions',
      color: 'text-primary',
      bg: 'bg-primary-light dark:bg-primary/20',
    },
    {
      label: 'Income Statement',
      desc: 'Revenue vs expenses for any date range',
      icon: TrendingUp,
      href: '/reports/income-statement',
      color: 'text-blue-600 dark:text-blue-400',
      bg: 'bg-blue-50 dark:bg-blue-950/40',
    },
    {
      label: 'Balance Sheet',
      desc: 'Assets, liabilities, and equity snapshot',
      icon: Scale,
      href: '/reports/balance-sheet',
      color: 'text-violet-600 dark:text-violet-400',
      bg: 'bg-violet-50 dark:bg-violet-950/40',
    },
    {
      label: 'HST / GST Report',
      desc: 'CRA remittance summary and ITC',
      icon: Receipt,
      href: '/reports/hst',
      color: 'text-amber-600 dark:text-amber-400',
      bg: 'bg-amber-50 dark:bg-amber-950/40',
    },
  ];

  return (
    <div className="space-y-2">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">
        Quick Actions
      </h3>
      {actions.map((action) => {
        const Icon = action.icon;
        return (
          <Link
            key={action.label}
            href={action.href}
            className="flex items-center gap-3 p-3 rounded-lg border border-border bg-card hover:bg-muted transition-colors group"
          >
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${action.bg}`}>
              <Icon className={`w-4 h-4 ${action.color}`} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground">{action.label}</p>
              <p className="text-xs text-muted-foreground truncate">{action.desc}</p>
            </div>
            <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors flex-shrink-0" />
          </Link>
        );
      })}
    </div>
  );
}

function ReportsTab() {
  const reports = [
    { label: 'Income Statement',  icon: TrendingUp,    href: '/reports/income-statement', desc: 'P&L for any date range' },
    { label: 'Balance Sheet',     icon: Scale,         href: '/reports/balance-sheet',    desc: 'Point-in-time snapshot' },
    { label: 'Trial Balance',     icon: ClipboardList, href: '/reports/trial-balance',    desc: 'Debit / credit verification' },
    { label: 'General Ledger',    icon: BookOpen,      href: '/reports/general-ledger',   desc: 'Full transaction history by account' },
  ];

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        All reports are generated from posted journal entries only.
      </p>
      <div className="grid gap-2">
        {reports.map((r) => {
          const Icon = r.icon;
          return (
            <Link
              key={r.label}
              href={r.href}
              className="flex items-center gap-3 p-4 rounded-xl border border-border bg-card hover:bg-muted hover:border-primary/40 transition-all group"
            >
              <div className="w-9 h-9 rounded-lg bg-primary-light dark:bg-primary/20 flex items-center justify-center flex-shrink-0">
                <Icon className="w-4 h-4 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-foreground">{r.label}</p>
                <p className="text-xs text-muted-foreground">{r.desc}</p>
              </div>
              <ExternalLink className="w-3.5 h-3.5 text-muted-foreground group-hover:text-primary transition-colors flex-shrink-0" />
            </Link>
          );
        })}
      </div>
    </div>
  );
}

function HstTab({ overview, currency }: { overview: ClientOverview; currency: string }) {
  const fmt = (n: number) =>
    new Intl.NumberFormat('en-CA', { style: 'currency', currency, minimumFractionDigits: 2 }).format(n);

  return (
    <div className="space-y-4">
      <div className={cn(
        'rounded-xl border p-5',
        overview.outstandingHst > 0
          ? 'border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30'
          : 'border-border bg-card',
      )}>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-1">
              Outstanding HST / GST Balance
            </p>
            <p className={cn(
              'text-3xl font-bold tabular-nums',
              overview.outstandingHst > 0
                ? 'text-amber-700 dark:text-amber-400'
                : 'text-foreground',
            )}>
              {fmt(overview.outstandingHst)}
            </p>
          </div>
          <div className={cn(
            'w-12 h-12 rounded-xl flex items-center justify-center',
            overview.outstandingHst > 0
              ? 'bg-amber-100 dark:bg-amber-900/40'
              : 'bg-primary-light dark:bg-primary/20',
          )}>
            <Receipt className={cn(
              'w-6 h-6',
              overview.outstandingHst > 0
                ? 'text-amber-600 dark:text-amber-400'
                : 'text-primary',
            )} />
          </div>
        </div>
        {overview.outstandingHst > 0 && (
          <p className="text-xs text-amber-700 dark:text-amber-400 mt-2 flex items-center gap-1">
            <AlertTriangle className="w-3.5 h-3.5" />
            Tax payable balance — review HST periods before remittance
          </p>
        )}
      </div>

      <Link
        href="/reports/hst"
        className="flex items-center justify-between p-4 rounded-xl border border-border bg-card hover:bg-muted transition-colors group"
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-amber-50 dark:bg-amber-950/40 flex items-center justify-center">
            <Receipt className="w-4 h-4 text-amber-600 dark:text-amber-400" />
          </div>
          <div>
            <p className="text-sm font-medium text-foreground">Open Full HST Report</p>
            <p className="text-xs text-muted-foreground">Periods, ITCs, and remittance summary</p>
          </div>
        </div>
        <ExternalLink className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
      </Link>
    </div>
  );
}

function AuditTab({ businessId }: { businessId: string }) {
  const [logs, setLogs] = useState<any[] | null>(null);
  const [total, setTotal] = useState(0);
  const [isPending, startTransition] = useTransition();
  const [loaded, setLoaded] = useState(false);

  if (!loaded && !isPending) {
    setLoaded(true);
    startTransition(async () => {
      const result = await getClientAuditLog(businessId);
      setLogs(result.data ?? []);
      setTotal(result.total ?? 0);
    });
  }

  if (isPending || logs === null) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  if (logs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center mb-4">
          <Clock className="w-6 h-6 text-muted-foreground" />
        </div>
        <h3 className="text-base font-semibold text-foreground mb-1">No activity yet</h3>
        <p className="text-sm text-muted-foreground max-w-xs">
          Classify or post transactions to start building an audit trail for this client.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">
        {total} action{total !== 1 ? 's' : ''} recorded for this client.
      </p>
      <div className="rounded-xl border border-border overflow-hidden bg-card">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Time</th>
              <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Action</th>
              <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Entity</th>
              <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">User</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {logs.map((log: any) => (
              <tr key={log.id} className="hover:bg-muted transition-colors">
                <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                  {new Date(log.created_at).toLocaleString('en-CA', {
                    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
                  })}
                </td>
                <td className="px-4 py-3">
                  <ActionBadge action={log.action} />
                </td>
                <td className="px-4 py-3">
                  <span className="text-foreground">{log.entity_type}</span>
                  <span className="ml-2 font-mono text-xs text-muted-foreground">
                    {String(log.entity_id).slice(0, 8)}&hellip;
                  </span>
                </td>
                <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                  {String(log.user_id).slice(0, 16)}&hellip;
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function ClientDashboardTabs({ overview, client }: ClientDashboardTabsProps) {
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const currency = client.country === 'CA' ? 'CAD' : 'USD';

  return (
    <div className="space-y-5">
      {/* Tab bar */}
      <div className="flex gap-0.5 bg-muted rounded-lg p-1 w-fit">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              'px-4 py-1.5 rounded-md text-sm font-medium transition-all',
              activeTab === tab.id
                ? 'bg-card text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div className="lg:col-span-2">
            <QuickActions businessId={overview.businessId} />
          </div>
          <div>
            <ClientOverviewCard client={client} />
          </div>
        </div>
      )}

      {activeTab === 'reports' && <ReportsTab />}
      {activeTab === 'hst' && <HstTab overview={overview} currency={currency} />}
      {activeTab === 'audit' && <AuditTab businessId={overview.businessId} />}
    </div>
  );
}
