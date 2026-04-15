'use client';

import { NetWorthResult } from '@/types';
import { formatCurrency, cn } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';

interface NetWorthTrackerProps {
  netWorth: NetWorthResult | null;
}

export function NetWorthTracker({ netWorth }: NetWorthTrackerProps) {
  if (!netWorth) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-sm text-muted-foreground">
          Connect a bank account to calculate your net worth.
        </CardContent>
      </Card>
    );
  }

  const isPositive = netWorth.net_worth >= 0;

  const chequingAccounts  = netWorth.plaid_assets.filter((a) => a.subtype === 'checking' || a.subtype === 'current');
  const savingsAccounts   = netWorth.plaid_assets.filter((a) => a.subtype === 'savings');
  const otherBankAccounts = netWorth.plaid_assets.filter(
    (a) => a.subtype !== 'checking' && a.subtype !== 'current' && a.subtype !== 'savings',
  );
  const creditCards = netWorth.plaid_liabilities.filter(
    (a) => a.subtype === 'credit card' || a.type === 'credit',
  );
  const otherLiabilities = netWorth.plaid_liabilities.filter(
    (a) => a.subtype !== 'credit card' && a.type !== 'credit',
  );

  return (
    <div className="flex flex-col gap-4">
      {/* Hero net worth */}
      <div className="rounded-2xl bg-card border border-border p-6">
        <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-2">Total net worth</p>
        <p className={cn('text-5xl font-bold tabular-nums mb-4', isPositive ? 'text-primary' : 'text-destructive')}>
          {formatCurrency(netWorth.net_worth)}
        </p>
        <div className="flex gap-8 text-sm">
          <div>
            <p className="text-muted-foreground text-xs mb-1">Total assets</p>
            <p className="font-bold text-primary text-lg">{formatCurrency(netWorth.total_assets)}</p>
          </div>
          <div className="w-px bg-border" />
          <div>
            <p className="text-muted-foreground text-xs mb-1">Total liabilities</p>
            <p className="font-bold text-destructive text-lg">{formatCurrency(netWorth.total_liabilities)}</p>
          </div>
        </div>
      </div>

      {/* Account groups */}
      <div className="rounded-2xl bg-card border border-border divide-y divide-border overflow-hidden">
        {chequingAccounts.length > 0 && (
          <AccountGroup label="Current accounts"
            total={chequingAccounts.reduce((s, a) => s + Number(a.current_balance), 0)}
            accounts={chequingAccounts.map((a) => ({ name: a.name, sub: a.subtype, amount: Number(a.current_balance), positive: true }))}
            positive />
        )}
        {savingsAccounts.length > 0 && (
          <AccountGroup label="Savings accounts"
            total={savingsAccounts.reduce((s, a) => s + Number(a.current_balance), 0)}
            accounts={savingsAccounts.map((a) => ({ name: a.name, sub: a.subtype, amount: Number(a.current_balance), positive: true }))}
            positive />
        )}
        {otherBankAccounts.length > 0 && (
          <AccountGroup label="Other accounts"
            total={otherBankAccounts.reduce((s, a) => s + Number(a.current_balance), 0)}
            accounts={otherBankAccounts.map((a) => ({ name: a.name, sub: a.subtype, amount: Number(a.current_balance), positive: true }))}
            positive />
        )}
        {netWorth.coa_assets.filter((a) => Number(a.balance) !== 0).length > 0 && (
          <AccountGroup label="Other assets"
            total={netWorth.coa_assets.reduce((s, a) => s + Number(a.balance), 0)}
            accounts={netWorth.coa_assets.filter((a) => Number(a.balance) !== 0)
              .map((a) => ({ name: a.account_name, sub: a.account_subtype ?? undefined, amount: Number(a.balance), positive: true }))}
            positive />
        )}
        {creditCards.length > 0 && (
          <AccountGroup label="Credit cards"
            total={-creditCards.reduce((s, a) => s + Math.abs(Number(a.current_balance)), 0)}
            accounts={creditCards.map((a) => ({ name: a.name, sub: 'Credit card', amount: Math.abs(Number(a.current_balance)), positive: false }))}
            positive={false} />
        )}
        {otherLiabilities.length > 0 && (
          <AccountGroup label="Other liabilities"
            total={-otherLiabilities.reduce((s, a) => s + Math.abs(Number(a.current_balance)), 0)}
            accounts={otherLiabilities.map((a) => ({ name: a.name, sub: a.subtype, amount: Math.abs(Number(a.current_balance)), positive: false }))}
            positive={false} />
        )}
        {netWorth.coa_liabilities.filter((a) => Number(a.balance) !== 0).length > 0 && (
          <AccountGroup label="Other liabilities (CoA)"
            total={-netWorth.coa_liabilities.reduce((s, a) => s + Math.abs(Number(a.balance)), 0)}
            accounts={netWorth.coa_liabilities.filter((a) => Number(a.balance) !== 0)
              .map((a) => ({ name: a.account_name, sub: a.account_subtype ?? undefined, amount: Math.abs(Number(a.balance)), positive: false }))}
            positive={false} />
        )}
      </div>
    </div>
  );
}

function AccountGroup({ label, total, accounts, positive }: {
  label: string;
  total: number;
  accounts: { name: string; sub?: string; amount: number; positive: boolean }[];
  positive: boolean;
}) {
  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{label}</p>
        <span className={cn('text-sm font-bold', positive ? 'text-primary' : 'text-destructive')}>
          {positive ? '' : '-'}{formatCurrency(Math.abs(total))}
        </span>
      </div>
      <div className="flex flex-col gap-0">
        {accounts.map((acc, i) => (
          <div key={i} className="flex items-center justify-between py-2.5 border-b border-border last:border-0">
            <div className="flex items-center gap-3 min-w-0">
              <div className={cn(
                'w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold',
                positive ? 'bg-primary-light text-primary' : 'bg-red-50 dark:bg-red-900/20 text-destructive',
              )}>
                {acc.name.slice(0, 2).toUpperCase()}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-foreground truncate">{acc.name}</p>
                {acc.sub && <p className="text-xs text-muted-foreground capitalize">{acc.sub}</p>}
              </div>
            </div>
            <span className={cn('text-sm font-semibold ml-4 flex-shrink-0', positive ? 'text-primary' : 'text-destructive')}>
              {positive ? '' : '-'}{formatCurrency(acc.amount)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
