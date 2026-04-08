'use client';

import { useState } from 'react';
import Link from 'next/link';
import { AlertCircle, AlertTriangle, Info, X } from 'lucide-react';

export type AlertSeverity = 'info' | 'warning' | 'danger';

export interface AlertState {
  type: string;
  severity: AlertSeverity;
  message: string;
  ctaLabel: string;
  ctaUrl: string;
}

interface AlertBannerProps {
  alerts: AlertState[];
}

const severityStyles: Record<AlertSeverity, { banner: string; cta: string }> = {
  danger: {
    banner: 'bg-red-50 dark:bg-red-950/40 border-red-200 dark:border-red-900 text-red-700 dark:text-red-400',
    cta:    'bg-red-600 hover:bg-red-700 text-white',
  },
  warning: {
    banner: 'bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-900 text-amber-700 dark:text-amber-400',
    cta:    'bg-amber-600 hover:bg-amber-700 text-white',
  },
  info: {
    banner: 'bg-blue-50 dark:bg-blue-950/40 border-blue-200 dark:border-blue-900 text-blue-700 dark:text-blue-400',
    cta:    'bg-blue-600 hover:bg-blue-700 text-white',
  },
};

function SeverityIcon({ severity }: { severity: AlertSeverity }) {
  const cls = 'w-4 h-4 flex-shrink-0';
  if (severity === 'danger')  return <AlertCircle  className={cls} />;
  if (severity === 'warning') return <AlertTriangle className={cls} />;
  return <Info className={cls} />;
}

export function AlertBanner({ alerts }: AlertBannerProps) {
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  const visible = alerts.filter((a) => !dismissed.has(a.type));
  if (visible.length === 0) return null;

  function dismiss(type: string) {
    setDismissed((prev) => new Set([...prev, type]));
  }

  return (
    <div>
      {visible.map((alert) => {
        const styles = severityStyles[alert.severity];
        return (
          <div
            key={alert.type}
            className={`flex items-center gap-3 px-4 py-3 text-sm border-b ${styles.banner}`}
          >
            <SeverityIcon severity={alert.severity} />
            <span className="flex-1">{alert.message}</span>
            <Link
              href={alert.ctaUrl}
              className={`flex-shrink-0 text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors ${styles.cta}`}
            >
              {alert.ctaLabel}
            </Link>
            <button
              onClick={() => dismiss(alert.type)}
              className="flex-shrink-0 ml-1 p-1 rounded hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
              aria-label="Dismiss alert"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        );
      })}
    </div>
  );
}

