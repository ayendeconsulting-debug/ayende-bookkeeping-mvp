'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  Users, Settings, CreditCard, LayoutDashboard,
  ArrowLeftRight, Building2,
} from 'lucide-react';

interface Firm {
  id: string;
  name: string;
  subdomain: string;
  logo_url: string | null;
  brand_colour: string | null;
}

interface AccountantSidebarProps {
  firm: Firm;
  onClose?: () => void;
}

const navItems = [
  { href: '/accountant/clients',  label: 'My Clients',   icon: Users },
  { href: '/accountant/settings', label: 'Firm Settings', icon: Settings },
  { href: '/accountant/team',     label: 'Team',          icon: Building2 },
  { href: '/accountant/billing',  label: 'Billing',       icon: CreditCard },
];

export function AccountantSidebar({ firm, onClose }: AccountantSidebarProps) {
  const pathname = usePathname();

  return (
    <div className="flex flex-col h-full">
      {/* Firm header */}
      <div className="flex items-center gap-3 px-4 py-5 border-b border-border">
        {firm.logo_url ? (
          <img
            src={firm.logo_url}
            alt={firm.name}
            className="w-8 h-8 rounded object-contain"
          />
        ) : (
          <div
            className="w-8 h-8 rounded flex items-center justify-center text-white text-sm font-bold"
            style={{ backgroundColor: firm.brand_colour ?? '#1B3A5C' }}
          >
            {firm.name.charAt(0).toUpperCase()}
          </div>
        )}
        <div className="flex flex-col min-w-0">
          <span className="text-sm font-semibold text-foreground truncate">{firm.name}</span>
          <span className="text-xs text-muted-foreground truncate">Firm Portal</span>
        </div>
      </div>

      {/* Nav items */}
      <nav className="flex-1 overflow-y-auto py-4 px-2">
        <ul className="space-y-0.5">
          {navItems.map(({ href, label, icon: Icon }) => {
            const active = pathname === href || pathname.startsWith(href + '/');
            return (
              <li key={href}>
                <Link
                  href={href}
                  onClick={onClose}
                  className={cn(
                    'flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors',
                    active
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:text-foreground hover:bg-accent',
                  )}
                >
                  <Icon size={16} />
                  {label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Footer — switch to client app */}
      <div className="px-2 py-4 border-t border-border space-y-1">
        <Link
          href="/dashboard"
          onClick={onClose}
          className="flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
        >
          <ArrowLeftRight size={16} />
          Switch to Client App
        </Link>
      </div>
    </div>
  );
}
