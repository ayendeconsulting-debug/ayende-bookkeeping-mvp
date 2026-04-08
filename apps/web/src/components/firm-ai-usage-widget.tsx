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

  const barColor = isBlocked
    ? 'bg-red-500'
    : isWarning
    ? 'bg-amber-500'
    : 'bg-green-500';

  const borderColor = isBlocked
    ? 'border-red-200'
    : isWarning
    ? 'border-amber-200'
    : 'border-gray-200';

  const bgColor = isBlocked
    ? 'bg-red-50'
    : isWarning
    ? 'bg-amber-50'
    : 'bg-white';

  return (
    <div className={cn('rounded-xl border px-5 py-4', borderColor, bgColor)}>
      <div className="flex items-start justify-between gap-4">
        {/* Left: label + progress */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className={cn(
              'w-4 h-4 flex-shrink-0',
              isBlocked ? 'text-red-500' : isWarning ? 'text-amber-500' : 'text-primary',
            )} />
            <span className="text-sm font-medium text-gray-900">Firm AI Usage</span>
            <span className="text-xs text-gray-400">— current billing month</span>
          </div>

          {/* Progress bar */}
          <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
            <div
              className={cn('h-2 rounded-full transition-all', barColor)}
              style={{ width: `${Math.min(percentage, 100)}%` }}
            />
          </div>

          {/* Status message */}
          {isBlocked && (
            <div className="flex items-center gap-1.5 text-xs text-red-600 font-medium">
              <XCircle className="w-3.5 h-3.5 flex-shrink-0" />
              AI limit reached — all client businesses are blocked from new AI features.{' '}
              <a href="/accountant/billing" className="underline hover:no-underline">
                Upgrade your plan
              </a>
            </div>
          )}
          {isWarning && (
            <div className="flex items-center gap-1.5 text-xs text-amber-700 font-medium">
              <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
              Approaching your firm AI limit — consider upgrading soon.
            </div>
          )}
          {isHealthy && (
            <p className="text-xs text-gray-500">
              AI features available across all client businesses.
            </p>
          )}
        </div>

        {/* Right: count */}
        <div className="flex-shrink-0 text-right">
          <span className={cn(
            'text-2xl font-bold tabular-nums',
            isBlocked ? 'text-red-600' : isWarning ? 'text-amber-600' : 'text-gray-900',
          )}>
            {used}
          </span>
          <span className="text-sm text-gray-400"> / {cap}</span>
          <p className="text-xs text-gray-400 mt-0.5">calls used</p>
        </div>
      </div>
    </div>
  );
}
