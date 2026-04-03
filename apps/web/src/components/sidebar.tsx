'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { BusinessMode } from '@/types';
import { BusinessSwitcher } from '@/components/business-switcher';
import {
  LayoutDashboard, ArrowLeftRight, Building2, BookOpen, TrendingUp, Scale,
  ClipboardList, Receipt, Filter, Sparkles, Settings, FileText,
  ArrowRightLeft, RefreshCw, Users, Car, Calculator, Tag, PieChart, Target,
  Landmark, Bell, X,
} from 'lucide-react';

interface SidebarProps {
  mode?:         BusinessMode;
  isMobileOpen?: boolean;
  onClose?:      () => void;
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
const personalMainItems     = [{ href: '/banks',    label: 'Bank Accounts', icon: Building2 }];
const personalSettingsItems = [
  { href: '/ai',       label: 'AI Assistant', icon: Sparkles },
  { href: '/settings', label: 'Settings',     icon: Settings },
];

export function Sidebar({ mode = 'business', isMobileOpen = false, onClose }: SidebarProps) {
  const pathname = usePathname();

  const isActive = (href: string, exact = false) =>
    exact ? pathname === href : pathname === href || pathname.startsWith(href + '/');

  return (
    <>
      {/* Mobile backdrop */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      <aside
        className={cn(
          'w-[210px] h-screen flex flex-col border-r border-border bg-card flex-shrink-0',
          isMobileOpen
            ? 'fixed inset-y-0 left-0 z-50 flex'
            : 'hidden md:flex',
        )}
      >
        {/* Logo */}
        <div className="px-4 py-5 border-b border-border relative">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-md bg-[#0F6E56] flex items-center justify-center flex-shrink-0">
              <svg viewBox="0 0 16 16" fill="white" className="w-4 h-4">
                <path d="M2 12 L8 4 L14 12 Z" />
              </svg>
            </div>
            <div>
              <div className="text-sm font-semibold text-foreground leading-tight">Ayende</div>
              <div className="text-[10px] text-muted-foreground uppercase tracking-wider leading-tight">
                {mode === 'freelancer' ? 'Freelancer' : mode === 'personal' ? 'Personal' : 'Bookkeeping'}
              </div>
            </div>
          </div>
          {/* Close button — mobile only */}
          <button
            onClick={onClose}
            className="md:hidden absolute top-3 right-3 w-8 h-8 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-md hover:bg-accent transition-colors"
            aria-label="Close menu"
          >
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>

        {/* Business switcher — replaces static org button */}
        <BusinessSwitcher />

        {/* Nav */}
        <nav className="flex-1 px-2 py-3 overflow-y-auto flex flex-col gap-0.5">

          {mode === 'personal' && (
            <>
              <NavSection label="Personal Finance" />
              {personalItems.map((item) => (
                <NavItem key={item.href} {...item} active={isActive(item.href)} onClose={onClose} />
              ))}
              <NavSection label="Accounts" />
              {personalMainItems.map((item) => (
                <NavItem key={item.href} {...item} active={isActive(item.href)} onClose={onClose} />
              ))}
              <NavSection label="Settings" />
              {personalSettingsItems.map((item) => (
                <NavItem key={item.href} {...item} active={isActive(item.href)} onClose={onClose} />
              ))}
            </>
          )}

          {mode === 'freelancer' && (
            <>
              <NavSection label="Freelancer" />
              {freelancerItems.map((item) => (
                <NavItem key={item.href} {...item} active={isActive(item.href)} onClose={onClose} />
              ))}
              <NavSection label="Main" />
              {freelancerMainItems.map((item) => (
                <NavItem key={item.href} {...item} active={isActive(item.href)} onClose={onClose} />
              ))}
              <NavSection label="Settings" />
              {freelancerSettingsItems.map((item) => (
                <NavItem key={item.href} {...item} active={isActive(item.href)} onClose={onClose} />
              ))}
            </>
          )}

          {mode === 'business' && (
            <>
              <NavSection label="Main" />
              {businessNavItems.map((item) => (
                <NavItem key={item.href} {...item} active={isActive(item.href)} onClose={onClose} />
              ))}
              <NavSection label="Reports" />
              {reportItems.map((item) => (
                <NavItem key={item.href} {...item} active={pathname === item.href} onClose={onClose} />
              ))}
              <NavSection label="Settings" />
              {businessSettingsItems.map((item) => (
                <NavItem key={item.href} {...item} active={isActive(item.href)} onClose={onClose} />
              ))}
            </>
          )}

        </nav>
      </aside>
    </>
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

function NavItem({ href, label, icon: Icon, active, onClose }: {
  href: string; label: string; icon: React.ElementType; active: boolean; onClose?: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onClose}
      className={cn(
        'flex items-center gap-2.5 px-2.5 py-2 min-h-[44px] rounded-md text-sm transition-colors',
        active
          ? 'bg-[#EDF7F2] text-[#0F6E56] font-medium dark:bg-primary/20 dark:text-primary'
          : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
      )}
    >
      <Icon className="w-4 h-4 flex-shrink-0" />
      <span className="truncate">{label}</span>
    </Link>
  );
}
