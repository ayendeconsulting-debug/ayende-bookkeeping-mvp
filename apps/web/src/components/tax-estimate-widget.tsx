'use client';

import { TaxEstimateResult } from '@/types';
import { formatCurrency, cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle, CheckCircle, Clock } from 'lucide-react';

interface TaxEstimateWidgetProps {
  estimate: TaxEstimateResult | null;
}

function getCurrentQuarter(): number {
  return Math.ceil((new Date().getMonth() + 1) / 3);
}

export function TaxEstimateWidget({ estimate }: TaxEstimateWidgetProps) {
  if (!estimate) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-sm text-muted-foreground">
          No tax estimate available. Ensure you have posted transactions for this year.
        </CardContent>
      </Card>
    );
  }

  const currentQ = getCurrentQuarter();

  return (
    <div className="flex flex-col gap-6">
      {/* Annual summary */}
      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardContent className="pt-5">
            <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
              Annual Net Income ({estimate.year})
            </div>
            <div className="text-2xl font-semibold text-foreground">
              {formatCurrency(estimate.annual_net_income)}
            </div>
            <div className="text-xs text-muted-foreground mt-1">After business expenses</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
              Annual Tax Estimate
            </div>
            <div className="text-2xl font-semibold text-amber-600 dark:text-amber-400">
              {formatCurrency(estimate.annual_estimated_tax)}
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              {estimate.country === 'CA' ? 'Federal + CPP + HST/GST' : 'SE Tax + Federal Income Tax'}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quarter cards */}
      <div>
        <h2 className="text-sm font-semibold text-foreground mb-3">Quarterly Breakdown</h2>
        <div className="grid grid-cols-2 gap-4">
          {estimate.quarters.map((q) => {
            const dueDate   = new Date(q.due_date);
            const today     = new Date();
            const isPast    = dueDate < today;
            const isCurrent = q.quarter === currentQ;

            return (
              <Card key={q.quarter} className={cn(
                'relative overflow-hidden',
                isCurrent ? 'border-amber-300 dark:border-amber-700 ring-1 ring-amber-200 dark:ring-amber-800' : '',
                isPast ? 'opacity-70' : '',
              )}>
                {isCurrent && (
                  <div className="absolute top-0 right-0 bg-amber-400 text-white text-[10px] font-bold px-2 py-0.5 rounded-bl-md">
                    CURRENT
                  </div>
                )}
                <CardHeader className="pb-2 pt-4">
                  <CardTitle className="text-base flex items-center gap-2">
                    {isPast ? (
                      <CheckCircle className="w-4 h-4 text-muted-foreground" />
                    ) : isCurrent ? (
                      <Clock className="w-4 h-4 text-amber-500" />
                    ) : (
                      <div className="w-4 h-4 rounded-full border-2 border-muted-foreground/30" />
                    )}
                    {q.label}
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="mb-3">
                    <div className="text-xs text-muted-foreground mb-0.5">Net Income This Quarter</div>
                    <div className="text-lg font-semibold text-foreground">{formatCurrency(q.net_income)}</div>
                  </div>
                  <div className="mb-3">
                    <div className="text-xs text-muted-foreground mb-0.5">Estimated Tax</div>
                    <div className={cn('text-xl font-bold',
                      isCurrent ? 'text-amber-600 dark:text-amber-400'
                      : isPast ? 'text-muted-foreground' : 'text-foreground')}>
                      {formatCurrency(q.estimated_tax)}
                    </div>
                  </div>

                  {Object.keys(q.breakdown).length > 0 && (
                    <div className="border-t border-border pt-2 mt-2 flex flex-col gap-1">
                      {Object.entries(q.breakdown).map(([label, amount]) => (
                        <div key={label} className="flex justify-between text-xs">
                          <span className="text-muted-foreground">{label}</span>
                          <span className="font-medium text-foreground">{formatCurrency(amount)}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className={cn('mt-3 text-xs font-medium',
                    isPast ? 'text-muted-foreground' : isCurrent ? 'text-amber-600 dark:text-amber-400' : 'text-muted-foreground')}>
                    {isPast ? 'Due date passed' : `Due ${dueDate.toLocaleDateString('en-CA', { month: 'long', day: 'numeric' })}`}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Disclaimer */}
      <div className="flex items-start gap-2 bg-amber-50 dark:bg-[#494C4F] border border-amber-100 dark:border-[#FBFB47]/40 rounded-xl px-4 py-3">
        <AlertCircle className="w-4 h-4 text-amber-500 dark:text-[#FBFB47] flex-shrink-0 mt-0.5" />
        <p className="text-xs text-amber-700 dark:text-[#FBFB47] leading-relaxed">{estimate.disclaimer}</p>
      </div>
    </div>
  );
}
