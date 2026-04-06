'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import {
  ArrowLeftRight, BarChart2, Receipt,
  AlertTriangle, Sparkles,
} from 'lucide-react';

interface ClientQuickActionsProps {
  businessId: string;
  contextReady?: boolean;
}

export function ClientQuickActions({ businessId, contextReady = false }: ClientQuickActionsProps) {
  const actions = [
    {
      label: 'Transactions',
      icon: ArrowLeftRight,
      href: '/transactions',
      enabled: contextReady,
      description: 'View and classify transactions',
    },
    {
      label: 'Reports',
      icon: BarChart2,
      href: '/reports',
      enabled: contextReady,
      description: 'Income Statement & Balance Sheet',
    },
    {
      label: 'HST Report',
      icon: Receipt,
      href: '/tax',
      enabled: contextReady,
      description: 'CRA remittance summary',
    },
    {
      label: 'Anomaly Scan',
      icon: AlertTriangle,
      href: null,
      enabled: false,
      description: 'Run AI anomaly detection (Step 8)',
    },
    {
      label: 'Year-End',
      icon: Sparkles,
      href: null,
      enabled: false,
      description: 'AI year-end assistant (Step 8)',
    },
  ];

  return (
    <div className="flex flex-wrap gap-2">
      {actions.map((action) => {
        const Icon = action.icon;

        if (action.enabled && action.href) {
          return (
            <Button
              key={action.label}
              variant="outline"
              size="sm"
              className="flex items-center gap-1.5"
              asChild
            >
              <Link href={action.href}>
                <Icon className="w-3.5 h-3.5" />
                {action.label}
              </Link>
            </Button>
          );
        }

        return (
          <Button
            key={action.label}
            variant="outline"
            size="sm"
            className="flex items-center gap-1.5"
            disabled
            title={action.enabled ? action.description : action.description}
          >
            <Icon className="w-3.5 h-3.5" />
            {action.label}
          </Button>
        );
      })}
    </div>
  );
}
