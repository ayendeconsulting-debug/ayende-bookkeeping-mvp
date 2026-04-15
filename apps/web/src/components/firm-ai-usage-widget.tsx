'use client';

import { Sparkles, AlertTriangle, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { FirmAiUsage } from '@/app/(accountant)/accountant/clients/actions';

interface FirmAiUsageWidgetProps {
  usage: FirmAiUsage;
}

export function FirmAiUsageWidget({ usage }: FirmAiUsageWidgetProps) {
  const { used, cap, percentage } = usage;

  const isBlocked = percentage >= 100;
  const isWarning = percentage >= 80 && !isBlocked;
  const isHealthy = percentage < 80;

  const barColor    = isBlocked ? 'bg-red-500' : isWarning ? 'bg-amber-500' : 'bg-green-500';
  const borderColor = isBlocked ? 'border-red-200 dark:border-red-800' : isWarning ? 'border-amber-200 dark:border-amber-800' : 'border-border';
  const bgColor     = isBlocked ? 'bg-red-50 dark:bg-red-900/20' : isWarning ? 'bg-amber-50 dark:bg-amber-900/20' : 'bg-card';

  return (
    <div className={cn('rounded-xl border px-5 py-4', borderColor, bgColor)}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className={cn('w-4 h-4 flex-shrink-0', isBlocked ? 'text-red-500' : isWarning ? 'text-amber-500' : 'text-primary')} />
            <span className="text-sm font-medium text-foreground">Firm AI Usage</span>
            <span className="text-xs text-muted-foreground">— current billing month</span>
          </div>

          <div className="w-full bg-muted rounded-full h-2 mb-2">
            <div className={cn('h-2 rounded-full transition-all', barColor)} style={{ width: `${Math.min(percentage, 100)}%` }} />
          </div>

          {isBlocked && (
            <div className="flex items-center gap-1.5 text-xs text-red-600 dark:text-red-400 font-medium">
              <XCircle className="w-3.5 h-3.5 flex-shrink-0" />
              AI limit reached — all client businesses are blocked from new AI features.{' '}
              <a href="/accountant/billing" className="underline hover:no-underline">Upgrade your plan</a>
            </div>
          )}
          {isWarning && (
            <div className="flex items-center gap-1.5 text-xs text-amber-700 dark:text-amber-400 font-medium">
              <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
              Approaching your firm AI limit — consider upgrading soon.
            </div>
          )}
          {isHealthy && <p className="text-xs text-muted-foreground">AI features available across all client businesses.</p>}
        </div>

        <div className="flex-shrink-0 text-right">
          <span className={cn('text-2xl font-bold tabular-nums', isBlocked ? 'text-red-600 dark:text-red-400' : isWarning ? 'text-amber-600 dark:text-amber-400' : 'text-foreground')}>
            {used}
          </span>
          <span className="text-sm text-muted-foreground"> / {cap}</span>
          <p className="text-xs text-muted-foreground mt-0.5">calls used</p>
        </div>
      </div>
    </div>
  );
}
