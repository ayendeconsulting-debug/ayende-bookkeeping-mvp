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
        <CardContent className="py-12 text-center text-sm text-gray-400">
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
            <div className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">
              Annual Net Income ({estimate.year})
            </div>
            <div className="text-2xl font-semibold text-gray-900">
              {formatCurrency(estimate.annual_net_income)}
            </div>
            <div className="text-xs text-gray-400 mt-1">After business expenses</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <div className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">
              Annual Tax Estimate
            </div>
            <div className="text-2xl font-semibold text-amber-600">
              {formatCurrency(estimate.annual_estimated_tax)}
            </div>
            <div className="text-xs text-gray-400 mt-1">
              {estimate.country === 'CA' ? 'Federal + CPP + HST/GST' : 'SE Tax + Federal Income Tax'}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quarter cards */}
      <div>
        <h2 className="text-sm font-semibold text-gray-700 mb-3">Quarterly Breakdown</h2>
        <div className="grid grid-cols-2 gap-4">
          {estimate.quarters.map((q) => {
            const dueDate = new Date(q.due_date);
            const today = new Date();
            const isPast = dueDate < today;
            const isCurrent = q.quarter === currentQ;
            const isFuture = !isPast && !isCurrent;

            return (
              <Card
                key={q.quarter}
                className={cn(
                  'relative overflow-hidden',
                  isCurrent ? 'border-amber-300 ring-1 ring-amber-200' : '',
                  isPast ? 'opacity-70' : '',
                )}
              >
                {isCurrent && (
                  <div className="absolute top-0 right-0 bg-amber-400 text-white text-[10px] font-bold px-2 py-0.5 rounded-bl-md">
                    CURRENT
                  </div>
                )}
                <CardHeader className="pb-2 pt-4">
                  <CardTitle className="text-base flex items-center gap-2">
                    {isPast ? (
                      <CheckCircle className="w-4 h-4 text-gray-400" />
                    ) : isCurrent ? (
                      <Clock className="w-4 h-4 text-amber-500" />
                    ) : (
                      <div className="w-4 h-4 rounded-full border-2 border-gray-200" />
                    )}
                    {q.label}
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="mb-3">
                    <div className="text-xs text-gray-500 mb-0.5">Net Income This Quarter</div>
                    <div className="text-lg font-semibold text-gray-900">
                      {formatCurrency(q.net_income)}
                    </div>
                  </div>
                  <div className="mb-3">
                    <div className="text-xs text-gray-500 mb-0.5">Estimated Tax</div>
                    <div
                      className={cn(
                        'text-xl font-bold',
                        isCurrent ? 'text-amber-600' : isPast ? 'text-gray-500' : 'text-gray-800',
                      )}
                    >
                      {formatCurrency(q.estimated_tax)}
                    </div>
                  </div>

                  {/* Breakdown */}
                  {Object.keys(q.breakdown).length > 0 && (
                    <div className="border-t border-gray-100 pt-2 mt-2 flex flex-col gap-1">
                      {Object.entries(q.breakdown).map(([label, amount]) => (
                        <div key={label} className="flex justify-between text-xs">
                          <span className="text-gray-500">{label}</span>
                          <span className="font-medium text-gray-700">{formatCurrency(amount)}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  <div
                    className={cn(
                      'mt-3 text-xs font-medium',
                      isPast ? 'text-gray-400' : isCurrent ? 'text-amber-600' : 'text-gray-500',
                    )}
                  >
                    {isPast ? 'Due date passed' : `Due ${dueDate.toLocaleDateString('en-CA', { month: 'long', day: 'numeric' })}`}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Disclaimer */}
      <div className="flex items-start gap-2 bg-amber-50 border border-amber-100 rounded-xl px-4 py-3">
        <AlertCircle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
        <p className="text-xs text-amber-700 leading-relaxed">{estimate.disclaimer}</p>
      </div>
    </div>
  );
}
