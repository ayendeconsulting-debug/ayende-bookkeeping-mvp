'use client';

import { Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { RawTransaction } from '@/types';

const SOURCE_LABELS: Record<string, string> = {
  rule_learned:    'Learned',
  rule_manual:     'Rule',
  rule_mcc:        'MCC',
  rule_vendor:     'Vendor',
  rule_recurrence: 'Recurring',
  ai:              'AI',
};

const CONFIDENCE_STYLES: Record<string, string> = {
  high:   'text-emerald-600 bg-emerald-50 border-emerald-200 dark:bg-emerald-950/40 dark:border-emerald-800',
  medium: 'text-amber-600 bg-amber-50 border-amber-200 dark:bg-amber-950/40 dark:border-amber-800',
  low:    'text-slate-500 bg-slate-50 border-slate-200 dark:bg-slate-800/40 dark:border-slate-700',
};

interface SmartMatchChipProps {
  tx: RawTransaction;
  className?: string;
}

export function SmartMatchChip({ tx, className }: SmartMatchChipProps) {
  if (tx.smart_match_status !== 'suggested' || !tx.smart_match_source) return null;

  const label      = SOURCE_LABELS[tx.smart_match_source] ?? tx.smart_match_source;
  const confidence = tx.smart_match_confidence ?? 'medium';
  const style      = CONFIDENCE_STYLES[confidence] ?? CONFIDENCE_STYLES.medium;

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 mt-0.5 px-1.5 py-0.5 rounded border text-[10px] font-medium leading-none',
        style,
        className,
      )}
      title={tx.smart_match_reasoning ?? 'Smart Match suggestion'}
    >
      <Sparkles className="w-2.5 h-2.5 flex-shrink-0" />
      Smart Match {'\u00b7'} {label}
    </span>
  );
}