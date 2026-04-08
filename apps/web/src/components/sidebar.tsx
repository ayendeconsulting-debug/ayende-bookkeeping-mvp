'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { BusinessMode } from '@/types';
import { BusinessSwitcher } from '@/components/business-switcher';
import { FirmPortalLink } from '@/components/firm-portal-link';
import {
  LayoutDashboard, ArrowLeftRight, Building2, BookOpen, TrendingUp, Scale,
  ClipboardList, Receipt, Filter, Sparkles, Settings, FileText,
  ArrowRightLeft, RefreshCw, Users, Car, Calculator, Tag, PieChart, Target,
  Landmark, Bell, X,
} from 'lucide-react';

interface SidebarProps {
  mode?: string;
  isMobileOpen?: boolean;
  onClose?: () => void;
}

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
  { href: '/reports/hst',              label: 'HST / GST Report', icon: Receipt },
];
const businessSettingsItems = [
  { href: '/accounts', label: 'Chart of Accounts',   icon: BookOpen },
  { href: '/tax',      label: 'Tax Codes',            icon: Receipt },
  { href: '/rules',    label: 'Classification Rules', icon: Filter },
  { href: '/ai',       label: 'AI Assistant',         icon: Sparkles },
  { href: '/settings', label: 'Settings',             icon: Settings },
];
const freelancerItems = [
  { href: '/freelancer/dashboard',  label: 'Dashboard',       icon: LayoutDashboard },
  { href: '/freelancer/mileage',    label: 'Mileage Tracker', icon: Car },
  { href: '/freelancer/tax',        label: 'Tax Estimate',    icon: Calculator },
  { href: '/freelancer/categories', label: 'Categories',      icon: Tag },
];
const freelancerMainItems = [
  { href: '/transactions', label: 'Transactions',  icon: ArrowLeftRight },
  { href: '/invoices',     label: 'Invoices',      icon: FileText },
  { href: '/recurring',    label: 'Recurring',     icon: RefreshCw },
  { href: '/banks',        label: 'Bank Accounts', icon: Building2 },
];
const freelancerSettingsItems = [
  { href: '/accounts', label: 'Chart of Accounts', icon: BookOpen },
  { href: '/tax',      label: 'Tax Codes',          icon: Receipt },
  { href: '/ai',       label: 'AI Assistant',       icon: Sparkles },
  { href: '/settings', label: 'Settings',           icon: Settings },
];
const personalItems = [
  { href: '/personal/dashboard',  label: 'My Dashboard',      icon: LayoutDashboard },
  { href: '/personal/budget',     label: 'Budget',             icon: PieChart },
  { href: '/personal/goals',      label: 'Savings Goals',      icon: Target },
  { href: '/personal/networth',   label: 'Net Worth',          icon: Landmark },
  { href: '/personal/recurring',  label: 'Recurring Payments', icon: RefreshCw },
  { href: '/personal/reminders',  label: 'Upcoming Payments',  icon: Bell },
];
const personalMainItems     = [{ href: '/banks', label: 'Bank Accounts', icon: Building2 }];
const personalSettingsItems = [
  { href: '/ai',       label: 'AI Assistant', icon: Sparkles },
  { href: '/settings', label: 'Settings',     icon: Settings },
];

export function Sidebar({ mode = 'business', isMobileOpen = false, onClose }: SidebarProps) {
  const pathname = usePathname();
  const isActive = (href: string) => pathname === href || pathname.startsWith(href + '/');

  return (
    <>
      {isMobileOpen && (
        <div className="fixed inset-0 z-40 bg-black/60 md:hidden" onClick={onClose} aria-hidden="true" />
      )}
      <aside
        className={cn(
          'w-[210px] h-screen flex flex-col flex-shrink-0',
          'border-r border-[#e5e1d8] dark:border-[#3a3730]',
          'bg-white dark:bg-[#242220]',
          'shadow-[1px_0_6px_rgba(0,0,0,0.06)] dark:shadow-[1px_0_10px_rgba(0,0,0,0.4)]',
          isMobileOpen ? 'fixed inset-y-0 left-0 z-50 flex' : 'hidden md:flex',
        )}
      >
        <div className="px-4 py-5 border-b border-[#e5e1d8] dark:border-[#3a3730] relative flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-md bg-[#0F6E56] flex items-center justify-center flex-shrink-0">
              <svg viewBox="0 0 16 16" className="w-4 h-4">
                <rect x="1"   y="10" width="3" height="5"  rx="0.5" fill="white" opacity="0.5"/>
                <rect x="6.5" y="7"  width="3" height="8"  rx="0.5" fill="white" opacity="0.75"/>
                <rect x="12"  y="3"  width="3" height="12" rx="0.5" fill="white"/>
              </svg>
            </div>
            <div>
              <div className="text-sm font-semibold leading-tight text-[#1a1814] dark:text-[#f0ede8]">Tempo</div>
              <div className="text-[10px] uppercase tracking-wider leading-tight text-[#888070] dark:text-[#7a7268]">
                {mode === 'freelancer' ? 'Freelancer' : mode === 'personal' ? 'Personal' : 'Bookkeeping'}
              </div>
            </div>
          </div>
          <button onClick={onClose}
            className="md:hidden absolute top-4 right-3 w-9 h-9 flex items-center justify-center rounded-lg bg-[#f0ede8] dark:bg-[#2e2c28] hover:bg-[#e5e1d8] dark:hover:bg-[#38362f] transition-colors"
            aria-label="Close menu">
            <X className="w-4 h-4 text-[#4A4438] dark:text-[#c8c0b0]" />
          </button>
        </div>
        <BusinessSwitcher />
        <nav className="flex-1 px-2 py-3 overflow-y-auto flex flex-col gap-0.5">
          {mode === 'personal' && (<>
            <NavSection label="Personal Finance" />
            {personalItems.map((i) => <NavItem key={i.href} {...i} active={isActive(i.href)} onClose={onClose} />)}
            <NavSection label="Accounts" />
            {personalMainItems.map((i) => <NavItem key={i.href} {...i} active={isActive(i.href)} onClose={onClose} />)}
            <NavSection label="Settings" />
            {personalSettingsItems.map((i) => <NavItem key={i.href} {...i} active={isActive(i.href)} onClose={onClose} />)}
          </>)}
          {mode === 'freelancer' && (<>
            <NavSection label="Freelancer" />
            {freelancerItems.map((i) => <NavItem key={i.href} {...i} active={isActive(i.href)} onClose={onClose} />)}
            <NavSection label="Main" />
            {freelancerMainItems.map((i) => <NavItem key={i.href} {...i} active={isActive(i.href)} onClose={onClose} />)}
            <NavSection label="Settings" />
            {freelancerSettingsItems.map((i) => <NavItem key={i.href} {...i} active={isActive(i.href)} onClose={onClose} />)}
          </>)}
          {mode === 'business' && (<>
            <NavSection label="Main" />
            {businessNavItems.map((i) => <NavItem key={i.href} {...i} active={isActive(i.href)} onClose={onClose} />)}
            <NavSection label="Reports" />
            {reportItems.map((i) => <NavItem key={i.href} {...i} active={pathname === i.href} onClose={onClose} />)}
            <NavSection label="Settings" />
            {businessSettingsItems.map((i) => <NavItem key={i.href} {...i} active={isActive(i.href)} onClose={onClose} />)}
          </>)}
        </nav>
        <FirmPortalLink onClose={onClose} />
      </aside>
    </>
  );
}

function NavSection({ label }: { label: string }) {
  return (
    <div className="px-2 pt-3 pb-1">
      <span className="text-[10px] font-semibold uppercase tracking-wider text-[#aaa098] dark:text-[#605850]">{label}</span>
    </div>
  );
}

function NavItem({ href, label, icon: Icon, active, onClose }: {
  href: string; label: string; icon: React.ElementType; active: boolean; onClose?: () => void;
}) {
  return (
    <Link href={href} onClick={onClose}
      className={cn(
        'flex items-center gap-2.5 px-2.5 py-2 min-h-[44px] rounded-md text-sm transition-colors',
        active
          ? 'bg-[#EDF7F2] text-[#0F6E56] font-semibold dark:bg-[#0F6E56]/20 dark:text-[#4abe94]'
          : 'text-[#4A4438] dark:text-[#c8c0b0] hover:bg-[#f0ede8] dark:hover:bg-[#2e2c28] hover:text-[#1a1814] dark:hover:text-[#f0ede8]',
      )}>
      <Icon className="w-4 h-4 flex-shrink-0" />
      <span className="truncate">{label}</span>
    </Link>
  );
}
