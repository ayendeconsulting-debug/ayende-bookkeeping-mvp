'use client';

import { NetWorthResult } from '@/types';
import { formatCurrency, cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, TrendingDown, PiggyBank } from 'lucide-react';

interface NetWorthTrackerProps {
  netWorth: NetWorthResult | null;
}

export function NetWorthTracker({ netWorth }: NetWorthTrackerProps) {
  if (!netWorth) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-sm text-gray-400">
          Connect a bank account to calculate your net worth.
        </CardContent>
      </Card>
    );
  }

  const isPositive = netWorth.net_worth >= 0;

  return (
    <div className="flex flex-col gap-4">
      {/* Net worth hero card */}
      <Card className={cn('border-2', isPositive ? 'border-primary/20' : 'border-red-200')}>
        <CardContent className="pt-6 pb-6 text-center">
          <div className={cn(
            'w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-3',
            isPositive ? 'bg-primary-light' : 'bg-red-50',
          )}>
            <PiggyBank className={cn('w-7 h-7', isPositive ? 'text-primary' : 'text-red-500')} />
          </div>
          <p className="text-sm font-medium text-gray-500 mb-1">Total Net Worth</p>
          <p className={cn('text-4xl font-bold', isPositive ? 'text-primary' : 'text-red-500')}>
            {formatCurrency(netWorth.net_worth)}
          </p>
          <div className="flex justify-center gap-6 mt-4 text-sm">
            <div className="text-center">
              <p className="text-gray-400 text-xs mb-0.5">Total Assets</p>
              <p className="font-semibold text-primary">{formatCurrency(netWorth.total_assets)}</p>
            </div>
            <div className="w-px bg-gray-200" />
            <div className="text-center">
              <p className="text-gray-400 text-xs mb-0.5">Total Liabilities</p>
              <p className="font-semibold text-danger">{formatCurrency(netWorth.total_liabilities)}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 gap-4">
        {/* Assets */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-primary">
              <TrendingUp className="w-4 h-4" />
              Assets
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            {netWorth.plaid_assets.length > 0 && (
              <div className="mb-4">
                <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-2">
                  Connected Accounts
                </p>
                <div className="flex flex-col gap-2">
                  {netWorth.plaid_assets.map((acc, i) => (
                    <AccountRow
                      key={i}
                      name={acc.name}
                      sub={acc.subtype}
                      amount={Number(acc.current_balance)}
                      positive
                    />
                  ))}
                </div>
              </div>
            )}
            {netWorth.coa_assets.length > 0 && (
              <div>
                <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-2">
                  Other Assets
                </p>
                <div className="flex flex-col gap-2">
                  {netWorth.coa_assets
                    .filter((a) => Number(a.balance) !== 0)
                    .map((acc, i) => (
                      <AccountRow
                        key={i}
                        name={acc.account_name}
                        sub={acc.account_subtype ?? undefined}
                        amount={Number(acc.balance)}
                        positive
                      />
                    ))}
                </div>
              </div>
            )}
            {netWorth.plaid_assets.length === 0 && netWorth.coa_assets.length === 0 && (
              <p className="text-sm text-gray-400 text-center py-4">No assets found.</p>
            )}
            <div className="border-t border-gray-100 mt-3 pt-3 flex justify-between">
              <span className="text-sm font-semibold text-gray-700">Total</span>
              <span className="text-sm font-bold text-primary">{formatCurrency(netWorth.total_assets)}</span>
            </div>
          </CardContent>
        </Card>

        {/* Liabilities */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-danger">
              <TrendingDown className="w-4 h-4" />
              Liabilities
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            {netWorth.plaid_liabilities.length > 0 && (
              <div className="mb-4">
                <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-2">
                  Connected Accounts
                </p>
                <div className="flex flex-col gap-2">
                  {netWorth.plaid_liabilities.map((acc, i) => (
                    <AccountRow
                      key={i}
                      name={acc.name}
                      sub={acc.subtype}
                      amount={Math.abs(Number(acc.current_balance))}
                      positive={false}
                    />
                  ))}
                </div>
              </div>
            )}
            {netWorth.coa_liabilities.length > 0 && (
              <div>
                <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-2">
                  Other Liabilities
                </p>
                <div className="flex flex-col gap-2">
                  {netWorth.coa_liabilities
                    .filter((a) => Number(a.balance) !== 0)
                    .map((acc, i) => (
                      <AccountRow
                        key={i}
                        name={acc.account_name}
                        sub={acc.account_subtype ?? undefined}
                        amount={Math.abs(Number(acc.balance))}
                        positive={false}
                      />
                    ))}
                </div>
              </div>
            )}
            {netWorth.plaid_liabilities.length === 0 && netWorth.coa_liabilities.length === 0 && (
              <p className="text-sm text-gray-400 text-center py-4">No liabilities found.</p>
            )}
            <div className="border-t border-gray-100 mt-3 pt-3 flex justify-between">
              <span className="text-sm font-semibold text-gray-700">Total</span>
              <span className="text-sm font-bold text-danger">{formatCurrency(netWorth.total_liabilities)}</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function AccountRow({
  name, sub, amount, positive,
}: {
  name: string; sub?: string; amount: number; positive: boolean;
}) {
  return (
    <div className="flex items-center justify-between">
      <div className="min-w-0">
        <p className="text-sm text-gray-800 truncate">{name}</p>
        {sub && <p className="text-xs text-gray-400 capitalize">{sub}</p>}
      </div>
      <span className={cn('text-sm font-medium ml-4 flex-shrink-0', positive ? 'text-primary' : 'text-danger')}>
        {formatCurrency(amount)}
      </span>
    </div>
  );
}
