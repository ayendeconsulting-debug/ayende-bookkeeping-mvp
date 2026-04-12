'use client';

import { useState } from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { ClientOverview } from '@/app/(accountant)/accountant/clients/[id]/dashboard/actions';
import { ClientListItem } from '@/app/(accountant)/accountant/clients/actions';
import { ClientOverviewCard } from '@/components/client-overview-card';
import {
  ArrowLeftRight, TrendingUp, Scale, ClipboardList,
  BookOpen, Receipt, AlertTriangle, Clock,
  ChevronRight, ExternalLink,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

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

// Quick action rows for the overview tab
function QuickActions({ businessId }: { businessId: string }) {
  const actions = [
    {
      label: 'Transactions',
      desc: 'View, classify, and post transactions',
      icon: ArrowLeftRight,
      href: '/transactions',
      color: 'text-[#0F6E56] dark:text-[#4abe94]',
      bg: 'bg-[#EDF7F2] dark:bg-[#0F6E56]/20',
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
      <h3 className="text-xs font-semibold uppercase tracking-wide text-[#888070] dark:text-[#7a7268] mb-3">
        Quick Actions
      </h3>
      {actions.map((action) => {
        const Icon = action.icon;
        return (
          <Link
            key={action.label}
            href={action.href}
            className="flex items-center gap-3 p-3 rounded-lg border border-[#e5e1d8] dark:border-[#3a3730] bg-white dark:bg-[#242220] hover:bg-[#faf9f7] dark:hover:bg-[#2e2c28] transition-colors group"
          >
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${action.bg}`}>
              <Icon className={`w-4 h-4 ${action.color}`} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-[#1a1814] dark:text-[#f0ede8]">{action.label}</p>
              <p className="text-xs text-[#888070] dark:text-[#7a7268] truncate">{action.desc}</p>
            </div>
            <ChevronRight className="w-4 h-4 text-[#c8c0b0] dark:text-[#605850] group-hover:text-[#4A4438] dark:group-hover:text-[#c8c0b0] transition-colors flex-shrink-0" />
          </Link>
        );
      })}
    </div>
  );
}

// Reports tab content
function ReportsTab() {
  const reports = [
    { label: 'Income Statement',  icon: TrendingUp,    href: '/reports/income-statement', desc: 'P&L for any date range' },
    { label: 'Balance Sheet',     icon: Scale,         href: '/reports/balance-sheet',    desc: 'Point-in-time snapshot' },
    { label: 'Trial Balance',     icon: ClipboardList, href: '/reports/trial-balance',    desc: 'Debit / credit verification' },
    { label: 'General Ledger',    icon: BookOpen,      href: '/reports/general-ledger',   desc: 'Full transaction history by account' },
  ];

  return (
    <div className="space-y-3">
      <p className="text-sm text-[#888070] dark:text-[#7a7268]">
        All reports are generated from posted journal entries only.
      </p>
      <div className="grid gap-2">
        {reports.map((r) => {
          const Icon = r.icon;
          return (
            <Link
              key={r.label}
              href={r.href}
              className="flex items-center gap-3 p-4 rounded-xl border border-[#e5e1d8] dark:border-[#3a3730] bg-white dark:bg-[#242220] hover:bg-[#faf9f7] dark:hover:bg-[#2e2c28] hover:border-[#0F6E56]/40 transition-all group"
            >
              <div className="w-9 h-9 rounded-lg bg-[#EDF7F2] dark:bg-[#0F6E56]/20 flex items-center justify-center flex-shrink-0">
                <Icon className="w-4 h-4 text-[#0F6E56] dark:text-[#4abe94]" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-[#1a1814] dark:text-[#f0ede8]">{r.label}</p>
                <p className="text-xs text-[#888070] dark:text-[#7a7268]">{r.desc}</p>
              </div>
              <ExternalLink className="w-3.5 h-3.5 text-[#c8c0b0] dark:text-[#605850] group-hover:text-[#0F6E56] dark:group-hover:text-[#4abe94] transition-colors flex-shrink-0" />
            </Link>
          );
        })}
      </div>
    </div>
  );
}

// HST tab content
function HstTab({ overview, currency }: { overview: ClientOverview; currency: string }) {
  const fmt = (n: number) =>
    new Intl.NumberFormat('en-CA', { style: 'currency', currency, minimumFractionDigits: 2 }).format(n);

  return (
    <div className="space-y-4">
      {/* Balance card */}
      <div className={cn(
        'rounded-xl border p-5',
        overview.outstandingHst > 0
          ? 'border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30'
          : 'border-[#e5e1d8] dark:border-[#3a3730] bg-white dark:bg-[#242220]',
      )}>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-[#888070] dark:text-[#7a7268] mb-1">
              Outstanding HST / GST Balance
            </p>
            <p className={cn(
              'text-3xl font-bold tabular-nums',
              overview.outstandingHst > 0
                ? 'text-amber-700 dark:text-amber-400'
                : 'text-[#1a1814] dark:text-[#f0ede8]',
            )}>
              {fmt(overview.outstandingHst)}
            </p>
          </div>
          <div className={cn(
            'w-12 h-12 rounded-xl flex items-center justify-center',
            overview.outstandingHst > 0
              ? 'bg-amber-100 dark:bg-amber-900/40'
              : 'bg-[#EDF7F2] dark:bg-[#0F6E56]/20',
          )}>
            <Receipt className={cn(
              'w-6 h-6',
              overview.outstandingHst > 0
                ? 'text-amber-600 dark:text-amber-400'
                : 'text-[#0F6E56] dark:text-[#4abe94]',
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

      {/* Link to full HST report */}
      <Link
        href="/reports/hst"
        className="flex items-center justify-between p-4 rounded-xl border border-[#e5e1d8] dark:border-[#3a3730] bg-white dark:bg-[#242220] hover:bg-[#faf9f7] dark:hover:bg-[#2e2c28] transition-colors group"
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-amber-50 dark:bg-amber-950/40 flex items-center justify-center">
            <Receipt className="w-4 h-4 text-amber-600 dark:text-amber-400" />
          </div>
          <div>
            <p className="text-sm font-medium text-[#1a1814] dark:text-[#f0ede8]">Open Full HST Report</p>
            <p className="text-xs text-[#888070] dark:text-[#7a7268]">Periods, ITCs, and remittance summary</p>
          </div>
        </div>
        <ExternalLink className="w-4 h-4 text-[#c8c0b0] group-hover:text-[#0F6E56] dark:group-hover:text-[#4abe94] transition-colors" />
      </Link>
    </div>
  );
}

// Audit log tab — placeholder for Phase 18
function AuditTab() {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="w-12 h-12 rounded-xl bg-[#f0ede8] dark:bg-[#2e2c28] flex items-center justify-center mb-4">
        <Clock className="w-6 h-6 text-[#888070] dark:text-[#7a7268]" />
      </div>
      <h3 className="text-base font-semibold text-[#1a1814] dark:text-[#f0ede8] mb-1">
        Audit Log Coming Soon
      </h3>
      <p className="text-sm text-[#888070] dark:text-[#7a7268] max-w-xs">
        Full activity audit trail — every classification, post, and journal entry change — is planned for Phase 18.
      </p>
    </div>
  );
}

export function ClientDashboardTabs({ overview, client }: ClientDashboardTabsProps) {
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const currency = client.country === 'CA' ? 'CAD' : 'USD';

  return (
    <div className="space-y-5">
      {/* Tab bar */}
      <div className="flex gap-0.5 bg-[#f0ede8] dark:bg-[#2e2c28] rounded-lg p-1 w-fit">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              'px-4 py-1.5 rounded-md text-sm font-medium transition-all',
              activeTab === tab.id
                ? 'bg-white dark:bg-[#242220] text-[#1a1814] dark:text-[#f0ede8] shadow-sm'
                : 'text-[#888070] dark:text-[#7a7268] hover:text-[#4A4438] dark:hover:text-[#c8c0b0]',
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Left: quick actions */}
          <div className="lg:col-span-2">
            <QuickActions businessId={overview.businessId} />
          </div>
          {/* Right: client info card */}
          <div>
            <ClientOverviewCard client={client} />
          </div>
        </div>
      )}

      {activeTab === 'reports' && <ReportsTab />}

      {activeTab === 'hst' && (
        <HstTab overview={overview} currency={currency} />
      )}

      {activeTab === 'audit' && <AuditTab />}
    </div>
  );
}
