import { TrendingUp, TrendingDown, Minus, AlertTriangle, Receipt, Calendar } from 'lucide-react';
import { ClientOverview } from '@/app/(accountant)/accountant/clients/[id]/dashboard/actions';
import { cn } from '@/lib/utils';

interface ClientSummaryCardsProps {
  overview: ClientOverview;
  currency: string;
}

function fmt(amount: number, currency: string) {
  return new Intl.NumberFormat('en-CA', { style: 'currency', currency, minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount);
}

export function ClientSummaryCards({ overview, currency }: ClientSummaryCardsProps) {
  const { revenueMtd, expensesMtd, netIncomeMtd, uncategorisedCount, outstandingHst, lastTransactionDate } = overview;
  const netPositive = netIncomeMtd >= 0;

  const cards = [
    {
      label: 'Revenue MTD',
      value: fmt(revenueMtd, currency),
      icon: TrendingUp,
      iconBg: 'bg-emerald-50 dark:bg-emerald-950/40',
      iconColor: 'text-emerald-600 dark:text-emerald-400',
      valueColor: 'text-emerald-700 dark:text-emerald-400',
      borderAccent: 'border-t-emerald-500',
      sub: 'Month to date',
    },
    {
      label: 'Expenses MTD',
      value: fmt(expensesMtd, currency),
      icon: TrendingDown,
      iconBg: 'bg-red-50 dark:bg-red-950/40',
      iconColor: 'text-red-500 dark:text-red-400',
      valueColor: 'text-red-600 dark:text-red-400',
      borderAccent: 'border-t-red-400',
      sub: 'Month to date',
    },
    {
      label: 'Net Income MTD',
      value: fmt(Math.abs(netIncomeMtd), currency),
      icon: netPositive ? TrendingUp : Minus,
      iconBg: netPositive ? 'bg-emerald-50 dark:bg-emerald-950/40' : 'bg-amber-50 dark:bg-amber-950/40',
      iconColor: netPositive ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400',
      valueColor: netPositive ? 'text-emerald-700 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400',
      borderAccent: netPositive ? 'border-t-emerald-500' : 'border-t-amber-400',
      sub: netPositive ? 'Profit' : 'Net loss',
    },
    {
      label: 'Uncategorised',
      value: uncategorisedCount.toString(),
      icon: AlertTriangle,
      iconBg: uncategorisedCount > 0 ? 'bg-amber-50 dark:bg-amber-950/40' : 'bg-primary-light dark:bg-primary/20',
      iconColor: uncategorisedCount > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-primary',
      valueColor: uncategorisedCount > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-primary',
      borderAccent: uncategorisedCount > 0 ? 'border-t-amber-400' : 'border-t-primary',
      sub: uncategorisedCount > 0 ? 'Need attention' : 'All classified',
    },
    {
      label: 'Outstanding HST',
      value: fmt(outstandingHst, currency),
      icon: Receipt,
      iconBg: outstandingHst > 0 ? 'bg-amber-50 dark:bg-amber-950/40' : 'bg-primary-light dark:bg-primary/20',
      iconColor: outstandingHst > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-primary',
      valueColor: outstandingHst > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-foreground',
      borderAccent: outstandingHst > 0 ? 'border-t-amber-400' : 'border-t-primary',
      sub: outstandingHst > 0 ? 'Tax payable balance' : 'No HST owing',
    },
    {
      label: 'Last Transaction',
      value: lastTransactionDate
        ? new Date(lastTransactionDate).toLocaleDateString('en-CA', { month: 'short', day: 'numeric', year: 'numeric' })
        : 'None yet',
      icon: Calendar,
      iconBg: 'bg-muted',
      iconColor: 'text-muted-foreground',
      valueColor: 'text-foreground',
      borderAccent: 'border-t-border',
      sub: 'Most recent import',
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <div key={card.label} className={`bg-card rounded-xl border border-border border-t-2 ${card.borderAccent} p-4 shadow-sm`}>
            <div className="flex items-start justify-between gap-2 mb-3">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{card.label}</p>
              <div className={`w-7 h-7 rounded-md flex items-center justify-center flex-shrink-0 ${card.iconBg}`}>
                <Icon className={`w-3.5 h-3.5 ${card.iconColor}`} />
              </div>
            </div>
            <p className={`text-xl font-bold tabular-nums leading-tight ${card.valueColor}`}>{card.value}</p>
            <p className="text-xs text-muted-foreground mt-1">{card.sub}</p>
          </div>
        );
      })}
    </div>
  );
}
