'use client';

import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
  ArrowLeftRight, BarChart2, Receipt,
  AlertTriangle, Sparkles,
} from 'lucide-react';

interface ClientQuickActionsProps {
  businessId: string;
  // Step 7b will enable navigation — for now buttons are placeholders
  contextReady?: boolean;
}

export function ClientQuickActions({ businessId, contextReady = false }: ClientQuickActionsProps) {
  const router = useRouter();

  const actions = [
    {
      label: 'Transactions',
      icon: ArrowLeftRight,
      href: `/transactions`,
      enabled: contextReady,
      description: 'View and classify transactions',
    },
    {
      label: 'Reports',
      icon: BarChart2,
      href: `/reports`,
      enabled: contextReady,
      description: 'Income Statement & Balance Sheet',
    },
    {
      label: 'HST Report',
      icon: Receipt,
      href: `/tax`,
      enabled: contextReady,
      description: 'CRA remittance summary',
    },
    {
      label: 'Anomaly Scan',
      icon: AlertTriangle,
      href: null,
      enabled: false,
      description: 'Run AI anomaly detection',
    },
    {
      label: 'Year-End',
      icon: Sparkles,
      href: null,
      enabled: false,
      description: 'AI year-end assistant',
    },
  ];

  return (
    <div className="flex flex-wrap gap-2">
      {actions.map((action) => (
        <Button
          key={action.label}
          variant="outline"
          size="sm"
          className="flex items-center gap-1.5"
          disabled={!action.enabled}
          title={action.enabled ? action.description : 'Coming in Step 7b'}
          onClick={() => {
            if (action.href && action.enabled) {
              router.push(action.href);
            }
          }}
        >
          <action.icon className="w-3.5 h-3.5" />
          {action.label}
        </Button>
      ))}
    </div>
  );
}
