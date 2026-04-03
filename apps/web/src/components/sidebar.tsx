'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useOrganization } from '@clerk/nextjs';
import { cn } from '@/lib/utils';
import { BusinessMode } from '@/types';
import {
  LayoutDashboard, ArrowLeftRight, Building2, BookOpen, TrendingUp, Scale,
  ClipboardList, Receipt, Filter, Sparkles, Settings, ChevronDown, FileText,
  ArrowRightLeft, RefreshCw, Users, Car, Calculator, Tag, PieChart, Target,
  Landmark, Bell,
} from 'lucide-react';

interface SidebarProps {
  mode?: BusinessMode;
}

// ── Business Mode nav ──────────────────────────────────────────────────────
const businessNavItems = [
  { href: '/dashboard',    label: 'Dashboard',     icon: LayoutDashboard },
  { href: '/transactions', label: 'Transactions',  icon: ArrowLeftRight },
  { href: '/invoices',     label: 'Invoices',      icon: FileText },
  { href: '/ar-ap',        label: 'AR / AP',       icon: ArrowRightLeft },
  { href: '/recurring',    label: 'Recurring',     icon: RefreshCw },
  { href: '/payroll',      label: 'Payroll',       icon: Users },
  { href: '/banks',        label: 'Bank Accounts', icon: Building2 },
];

const reportItems = [
  { href: '/reports/income-statement', label: 'Income Statement', icon: TrendingUp },
  { href: '/reports/balance-sheet',    label: 'Balance Sheet',    icon: Scale },
  { href: '/reports/trial-balance',    label: 'Trial Balance',    icon: ClipboardList },
  { href: '/reports/general-ledger',   label: 'General Ledger',   icon: BookOpen },
];

const businessSettingsItems = [
  { href: '/accounts',  label: 'Chart of Accounts',   icon: BookOpen },
  { href: '/tax',       label: 'Tax Codes',            icon: Receipt },
  { href: '/rules',     label: 'Classification Rules', icon: Filter },
  { href: '/ai',        label: 'AI Assistant',         icon: Sparkles },
  { href: '/settings',  label: 'Settings',             icon: Settings },
];

// ── Freelancer Mode nav ────────────────────────────────────────────────────
const freelancerItems = [
  { href: '/freelancer/dashboard',  label: 'Dashboard',       icon: LayoutDashboard },
  { href: '/freelancer/mileage',    label: 'Mileage Tracker', icon: Car },
  { href: '/freelancer/tax',        label: 'Tax Estimate',    icon: Calculator },
  { href: '/freelancer/categories', label: 'Categories',      icon: Tag },
];

const freelancerMainItems = [
  { href: '/transactions', label: 'Transactions',  icon: ArrowLeftRight },
  { href: '/invoices',     label: 'Invoices',      icon: FileText },
  { href: '/banks',        label: 'Bank Accounts', icon: Building2 },
];

const freelancerSettingsItems = [
  { href: '/tax',       label: 'Tax Codes',    icon: Receipt },
  { href: '/ai',        label: 'AI Assistant', icon: Sparkles },
  { href: '/settings',  label: 'Settings',     icon: Settings },
];

// ── Personal Mode nav ──────────────────────────────────────────────────────
const personalItems = [
  { href: '/personal/dashboard',  label: 'My Dashboard',      icon: LayoutDashboard },
  { href: '/personal/budget',     label: 'Budget',             icon: PieChart },
  { href: '/personal/goals',      label: 'Savings Goals',      icon: Target },
  { href: '/personal/networth',   label: 'Net Worth',          icon: Landmark },
  { href: '/personal/recurring',  label: 'Recurring Payments', icon: RefreshCw },
  { href: '/personal/reminders',  label: 'Upcoming Payments',  icon: Bell },
];

const personalMainItems = [
  { href: '/banks', label: 'Bank Accounts', icon: Building2 },
];

const personalSettingsItems = [
  { href: '/ai',       label: 'AI Assistant', icon: Sparkles },
  { href: '/settings', label: 'Settings',     icon: Settings },
];

export function Sidebar({ mode = 'business' }: SidebarProps) {
  const pathname = usePathname();
  const { organization } = useOrganization();

  const isActive = (href: string, exact = false) =>
    exact ? pathname === href : pathname === href || pathname.startsWith(href + '/');

  return (
    // bg-card: white in light, dark navy in dark — border-border responds automatically
    <aside className="w-[220px] h-screen flex flex-col border-r border-border bg-card flex-shrink-0">

      {/* Logo */}
      <div className="px-4 py-5 border-b border-border">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-md bg-[#0F6E56] flex items-center justify-center flex-shrink-0">
            <svg viewBox="0 0 16 16" fill="white" className="w-4 h-4"><path d="M2 12 L8 4 L14 12 Z" /></svg>
          </div>
          <div>
            <div className="text-sm font-semibold text-foreground leading-tight">Ayende</div>
            <div className="text-[10px] text-muted-foreground uppercase tracking-wider leading-tight">
              {mode === 'freelancer' ? 'Freelancer' : mode === 'personal' ? 'Personal' : 'Bookkeeping'}
            </div>
          </div>
        </div>
      </div>

      {/* Org switcher */}
      <div className="px-2 py-2 border-b border-border">
        <button className="w-full flex items-center gap-2 px-2 py-2 rounded-md hover:bg-accent transition-colors text-left">
          <div className="w-6 h-6 rounded bg-[#0F6E56] flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0">
            {organization?.name?.slice(0, 2).toUpperCase() ?? 'AB'}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-xs font-medium text-foreground truncate">
              {organization?.name ?? 'My Business'}
            </div>
            <div className="text-[10px] text-muted-foreground">Owner</div>
          </div>
          <ChevronDown className="w-3 h-3 text-muted-foreground flex-shrink-0" />
        </button>
      </div>

      <nav className="flex-1 px-2 py-3 overflow-y-auto flex flex-col gap-0.5">

        {/* ── PERSONAL MODE ── */}
        {mode === 'personal' && (
          <>
            <NavSection label="Personal Finance" />
            {personalItems.map((item) => (
              <NavItem key={item.href} {...item} active={isActive(item.href)} />
            ))}
            <NavSection label="Accounts" />
            {personalMainItems.map((item) => (
              <NavItem key={item.href} {...item} active={isActive(item.href)} />
            ))}
            <NavSection label="Settings" />
            {personalSettingsItems.map((item) => (
              <NavItem key={item.href} {...item} active={isActive(item.href)} />
            ))}
          </>
        )}

        {/* ── FREELANCER MODE ── */}
        {mode === 'freelancer' && (
          <>
            <NavSection label="Freelancer" />
            {freelancerItems.map((item) => (
              <NavItem key={item.href} {...item} active={isActive(item.href)} />
            ))}
            <NavSection label="Main" />
            {freelancerMainItems.map((item) => (
              <NavItem key={item.href} {...item} active={isActive(item.href)} />
            ))}
            <NavSection label="Settings" />
            {freelancerSettingsItems.map((item) => (
              <NavItem key={item.href} {...item} active={isActive(item.href)} />
            ))}
          </>
        )}

        {/* ── BUSINESS MODE ── */}
        {mode === 'business' && (
          <>
            <NavSection label="Main" />
            {businessNavItems.map((item) => (
              <NavItem key={item.href} {...item} active={isActive(item.href)} />
            ))}
            <NavSection label="Reports" />
            {reportItems.map((item) => (
              <NavItem key={item.href} {...item} active={pathname === item.href} />
            ))}
            <NavSection label="Settings" />
            {businessSettingsItems.map((item) => (
              <NavItem key={item.href} {...item} active={isActive(item.href)} />
            ))}
          </>
        )}

      </nav>
    </aside>
  );
}

function NavSection({ label }: { label: string }) {
  return (
    <div className="px-2 pt-3 pb-1">
      <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
        {label}
      </span>
    </div>
  );
}

function NavItem({ href, label, icon: Icon, active }: {
  href: string; label: string; icon: React.ElementType; active: boolean;
}) {
  return (
    <Link
      href={href}
      className={cn(
        'flex items-center gap-2.5 px-2.5 py-1.5 rounded-md text-sm transition-colors',
        active
          // Light: teal tint bg + teal text. Dark: primary/20 tint + primary text
          ? 'bg-[#E1F5EE] text-[#0F6E56] font-medium dark:bg-primary/20 dark:text-primary'
          : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
      )}
    >
      <Icon className="w-4 h-4 flex-shrink-0" />
      <span className="truncate">{label}</span>
    </Link>
  );
}
