import {
  TrendingUp, TrendingDown, Minus,
  AlertTriangle, Receipt, Calendar,
} from 'lucide-react';
import { ClientOverview } from '@/app/(accountant)/accountant/clients/[id]/dashboard/actions';

interface ClientSummaryCardsProps {
  overview: ClientOverview;
  currency: string;
}

function fmt(amount: number, currency: string) {
  return new Intl.NumberFormat('en-CA', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function ClientSummaryCards({ overview, currency }: ClientSummaryCardsProps) {
  const {
    revenueMtd,
    expensesMtd,
    netIncomeMtd,
    uncategorisedCount,
    outstandingHst,
    lastTransactionDate,
  } = overview;

  const netPositive = netIncomeMtd >= 0;

  const cards = [
    {
      label: 'Revenue MTD',
      value: fmt(revenueMtd, currency),
      icon: TrendingUp,
      iconBg: 'bg-emerald-50 dark:bg-emerald-950/40',
      iconColor: 'text-emerald-600 dark:text-emerald-400',
      valuColor: 'text-emerald-700 dark:text-emerald-400',
      borderAccent: 'border-t-emerald-500',
      sub: 'Month to date',
    },
    {
      label: 'Expenses MTD',
      value: fmt(expensesMtd, currency),
      icon: TrendingDown,
      iconBg: 'bg-red-50 dark:bg-red-950/40',
      iconColor: 'text-red-500 dark:text-red-400',
      valuColor: 'text-red-600 dark:text-red-400',
      borderAccent: 'border-t-red-400',
      sub: 'Month to date',
    },
    {
      label: 'Net Income MTD',
      value: fmt(Math.abs(netIncomeMtd), currency),
      icon: netPositive ? TrendingUp : Minus,
      iconBg: netPositive
        ? 'bg-emerald-50 dark:bg-emerald-950/40'
        : 'bg-amber-50 dark:bg-amber-950/40',
      iconColor: netPositive
        ? 'text-emerald-600 dark:text-emerald-400'
        : 'text-amber-600 dark:text-amber-400',
      valuColor: netPositive
        ? 'text-emerald-700 dark:text-emerald-400'
        : 'text-amber-600 dark:text-amber-400',
      borderAccent: netPositive ? 'border-t-emerald-500' : 'border-t-amber-400',
      sub: netPositive ? 'Profit' : 'Net loss',
    },
    {
      label: 'Uncategorised',
      value: uncategorisedCount.toString(),
      icon: AlertTriangle,
      iconBg: uncategorisedCount > 0
        ? 'bg-amber-50 dark:bg-amber-950/40'
        : 'bg-[#EDF7F2] dark:bg-[#0F6E56]/20',
      iconColor: uncategorisedCount > 0
        ? 'text-amber-600 dark:text-amber-400'
        : 'text-[#0F6E56] dark:text-[#4abe94]',
      valuColor: uncategorisedCount > 0
        ? 'text-amber-600 dark:text-amber-400'
        : 'text-[#0F6E56] dark:text-[#4abe94]',
      borderAccent: uncategorisedCount > 0 ? 'border-t-amber-400' : 'border-t-[#0F6E56]',
      sub: uncategorisedCount > 0 ? 'Need attention' : 'All classified',
    },
    {
      label: 'Outstanding HST',
      value: fmt(outstandingHst, currency),
      icon: Receipt,
      iconBg: outstandingHst > 0
        ? 'bg-amber-50 dark:bg-amber-950/40'
        : 'bg-[#EDF7F2] dark:bg-[#0F6E56]/20',
      iconColor: outstandingHst > 0
        ? 'text-amber-600 dark:text-amber-400'
        : 'text-[#0F6E56] dark:text-[#4abe94]',
      valuColor: outstandingHst > 0
        ? 'text-amber-600 dark:text-amber-400'
        : 'text-[#1a1814] dark:text-[#f0ede8]',
      borderAccent: outstandingHst > 0 ? 'border-t-amber-400' : 'border-t-[#0F6E56]',
      sub: outstandingHst > 0 ? 'Tax payable balance' : 'No HST owing',
    },
    {
      label: 'Last Transaction',
      value: lastTransactionDate
        ? new Date(lastTransactionDate).toLocaleDateString('en-CA', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
          })
        : 'None yet',
      icon: Calendar,
      iconBg: 'bg-[#f0ede8] dark:bg-[#2e2c28]',
      iconColor: 'text-[#888070] dark:text-[#7a7268]',
      valuColor: 'text-[#1a1814] dark:text-[#f0ede8]',
      borderAccent: 'border-t-[#c8c0b0]',
      sub: 'Most recent import',
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <div
            key={card.label}
            className={`
              bg-white dark:bg-[#242220]
              rounded-xl border border-[#e5e1d8] dark:border-[#3a3730]
              border-t-2 ${card.borderAccent}
              p-4 shadow-sm
            `}
          >
            <div className="flex items-start justify-between gap-2 mb-3">
              <p className="text-xs font-medium uppercase tracking-wide text-[#888070] dark:text-[#7a7268]">
                {card.label}
              </p>
              <div className={`w-7 h-7 rounded-md flex items-center justify-center flex-shrink-0 ${card.iconBg}`}>
                <Icon className={`w-3.5 h-3.5 ${card.iconColor}`} />
              </div>
            </div>
            <p className={`text-xl font-bold tabular-nums leading-tight ${card.valuColor}`}>
              {card.value}
            </p>
            <p className="text-xs text-[#aaa098] dark:text-[#605850] mt-1">{card.sub}</p>
          </div>
        );
      })}
    </div>
  );
}
