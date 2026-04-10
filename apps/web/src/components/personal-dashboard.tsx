'use client';

import Link from 'next/link';
import {
  BudgetCategoryWithSpending, SavingsGoalWithProgress,
  NetWorthResult, PersonalCashflow, Business,
  ConfirmedRecurring, UpcomingRemindersResult,
} from '@/types';
import { formatCurrency, cn } from '@/lib/utils';
import { UpcomingRemindersWidget } from '@/components/upcoming-reminders-widget';
import { AlertCircle, ChevronRight } from 'lucide-react';

interface PersonalDashboardProps {
  budgetCategories:   BudgetCategoryWithSpending[];
  savingsGoals:       SavingsGoalWithProgress[];
  netWorth:           NetWorthResult | null;
  cashflow:           PersonalCashflow | null;
  business:           Business | null;
  confirmedRecurring: ConfirmedRecurring[];
  upcomingReminders:  UpcomingRemindersResult | null;
}

function calcMonthlyEquivalent(amount: number, frequency: string): number {
  switch (frequency) {
    case 'weekly':    return amount * 4.33;
    case 'monthly':   return amount;
    case 'quarterly': return amount / 3;
    case 'annually':  return amount / 12;
    default:          return amount;
  }
}

export function PersonalDashboard({
  budgetCategories, savingsGoals, netWorth,
  cashflow, business, confirmedRecurring, upcomingReminders,
}: PersonalDashboardProps) {
  const moneyIn  = Number(cashflow?.money_in  ?? 0);
  const moneyOut = Number(cashflow?.money_out ?? 0);

  const totalMonthlyTarget    = budgetCategories.reduce((s, c) => s + (c.monthly_target ?? 0), 0);
  const totalSpent            = budgetCategories.reduce((s, c) => s + c.spent_this_month, 0);
  const overBudgetCount       = budgetCategories.filter((c) => c.over_budget).length;
  const activeGoals           = savingsGoals.filter((g) => g.status === 'active');
  const totalMonthlyRecurring = confirmedRecurring.reduce(
    (s, c) => s + calcMonthlyEquivalent(c.amount, c.frequency), 0,
  );
  const dueSoonItems = upcomingReminders?.reminders.filter((r) => r.is_due_soon) ?? [];
  const monthName    = new Date().toLocaleDateString('en-CA', { month: 'long', year: 'numeric' });

  return (
    <div className="p-4 md:p-6 max-w-screen-xl mx-auto">

      {/* Page header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-[#f0ede8]">
          {business?.name ?? 'My Finances'}
        </h1>
        <p className="text-sm text-gray-500 dark:text-[#a09888] mt-0.5">
          {new Date().toLocaleDateString('en-CA', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </p>
      </div>

      {/* Alerts */}
      {upcomingReminders?.balance_warning && (
        <div className="mb-4 flex items-start gap-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl px-4 py-3">
          <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
          <p className="text-sm font-medium text-red-700 dark:text-red-400 flex-1">
            Balance may be insufficient — {formatCurrency(upcomingReminders.total_due_7_days)} due in 7 days.
          </p>
          <Link href="/personal/reminders" className="text-xs text-red-600 underline flex-shrink-0">Review</Link>
        </div>
      )}
      {overBudgetCount > 0 && (
        <div className="mb-4 flex items-start gap-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl px-4 py-3">
          <AlertCircle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
          <p className="text-sm font-medium text-amber-700 dark:text-amber-400 flex-1">
            {overBudgetCount} budget {overBudgetCount === 1 ? 'category is' : 'categories are'} over target.
          </p>
          <Link href="/personal/budget" className="text-xs text-amber-600 underline flex-shrink-0">Review</Link>
        </div>
      )}

      {/* ── Hero money flow ── */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        <div className="rounded-2xl bg-white dark:bg-[#222019] border border-gray-100 dark:border-[#3a3730] p-4 md:p-5">
          <p className="text-xs font-medium text-gray-400 dark:text-[#7a7060] uppercase tracking-wider mb-2">Money in</p>
          <p className="text-3xl font-bold text-[#0F6E56] tabular-nums">{formatCurrency(moneyIn)}</p>
          <p className="text-xs text-gray-400 dark:text-[#7a7060] mt-1">{monthName}</p>
        </div>
        <div className="rounded-2xl bg-white dark:bg-[#222019] border border-gray-100 dark:border-[#3a3730] p-4 md:p-5">
          <p className="text-xs font-medium text-gray-400 dark:text-[#7a7060] uppercase tracking-wider mb-2">Money out</p>
          <p className="text-3xl font-bold text-[#c0392b] tabular-nums">{formatCurrency(moneyOut)}</p>
          <p className="text-xs text-gray-400 dark:text-[#7a7060] mt-1">{monthName}</p>
        </div>
      </div>

      {/* ── Net worth hero ── */}
      {netWorth && (
        <Link href="/personal/networth" className="block mb-6">
          <div className="rounded-2xl bg-white dark:bg-[#222019] border border-gray-100 dark:border-[#3a3730] p-4 md:p-5 hover:border-primary/30 transition-colors">
            <div className="flex items-center justify-between mb-1">
              <p className="text-xs font-medium text-gray-400 dark:text-[#7a7060] uppercase tracking-wider">Net worth</p>
              <ChevronRight className="w-4 h-4 text-gray-300 dark:text-[#7a7060]" />
            </div>
            <p className={cn('text-4xl font-bold tabular-nums mb-3', netWorth.net_worth >= 0 ? 'text-[#0F6E56]' : 'text-[#c0392b]')}>
              {formatCurrency(netWorth.net_worth)}
            </p>
            <div className="flex gap-6">
              <div>
                <p className="text-xs text-gray-400 dark:text-[#7a7060] mb-0.5">Assets</p>
                <p className="text-sm font-semibold text-[#0F6E56]">{formatCurrency(netWorth.total_assets)}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400 dark:text-[#7a7060] mb-0.5">Liabilities</p>
                <p className="text-sm font-semibold text-[#c0392b]">{formatCurrency(netWorth.total_liabilities)}</p>
              </div>
              {netWorth.plaid_assets.length > 0 && (
                <div>
                  <p className="text-xs text-gray-400 dark:text-[#7a7060] mb-0.5">Accounts</p>
                  <p className="text-sm font-semibold text-gray-700 dark:text-[#c8c0b0]">
                    {netWorth.plaid_assets.length + netWorth.plaid_liabilities.length} connected
                  </p>
                </div>
              )}
            </div>
          </div>
        </Link>
      )}

      {/* ── Main grid ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* Left — budget + recurring */}
        <div className="col-span-1 lg:col-span-2 flex flex-col gap-4">

          {/* Budget vs Actual */}
          <div className="rounded-2xl bg-white dark:bg-[#222019] border border-gray-100 dark:border-[#3a3730] p-4 md:p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-base font-semibold text-gray-900 dark:text-[#f0ede8]">Budget — {monthName}</h2>
                {totalMonthlyTarget > 0 && (
                  <p className="text-sm text-gray-400 dark:text-[#7a7060] mt-0.5">
                    {formatCurrency(totalSpent)} of {formatCurrency(totalMonthlyTarget)} spent
                  </p>
                )}
              </div>
              <Link href="/personal/budget" className="text-xs text-[#0F6E56] font-medium flex items-center gap-0.5 hover:underline">
                Manage <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>
            {budgetCategories.length === 0 ? (
              <div className="py-8 text-center text-sm text-gray-400 dark:text-[#7a7060]">
                <Link href="/personal/budget" className="text-[#0F6E56] underline">Set up your budget</Link>
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                {budgetCategories.slice(0, 8).map((cat) => (
                  <EmmaBudgetBar key={cat.id} category={cat} />
                ))}
                {budgetCategories.length > 8 && (
                  <Link href="/personal/budget" className="text-xs text-gray-400 hover:text-[#0F6E56] text-center pt-1">
                    +{budgetCategories.length - 8} more →
                  </Link>
                )}
              </div>
            )}
          </div>

          {/* Recurring payments */}
          {confirmedRecurring.length > 0 && (
            <div className="rounded-2xl bg-white dark:bg-[#222019] border border-gray-100 dark:border-[#3a3730] p-4 md:p-5">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-base font-semibold text-gray-900 dark:text-[#f0ede8]">Recurring payments</h2>
                  <p className="text-sm text-gray-400 dark:text-[#7a7060] mt-0.5">{formatCurrency(totalMonthlyRecurring)}/mo total</p>
                </div>
                <Link href="/personal/recurring" className="text-xs text-[#0F6E56] font-medium flex items-center gap-0.5 hover:underline">
                  See all <ChevronRight className="w-3.5 h-3.5" />
                </Link>
              </div>
              <div className="flex flex-col divide-y divide-gray-50 dark:divide-[#2a2720]">
                {confirmedRecurring.slice(0, 5).map((item) => (
                  <div key={item.key} className="flex items-center justify-between py-2.5">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-gray-100 dark:bg-[#2a2720] flex items-center justify-center flex-shrink-0">
                        <span className="text-xs font-bold text-gray-500 dark:text-[#a09888]">
                          {item.merchant.slice(0, 2).toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900 dark:text-[#f0ede8]">{item.merchant}</p>
                        <p className="text-xs text-gray-400 dark:text-[#7a7060] capitalize">{item.frequency}</p>
                      </div>
                    </div>
                    <span className="text-sm font-semibold text-[#c0392b]">-{formatCurrency(item.amount)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right column */}
        <div className="flex flex-col gap-4">

          {/* Savings Goals */}
          <div className="rounded-2xl bg-white dark:bg-[#222019] border border-gray-100 dark:border-[#3a3730] p-4 md:p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-semibold text-gray-900 dark:text-[#f0ede8]">Savings goals</h2>
              <Link href="/personal/goals" className="text-xs text-[#0F6E56] font-medium flex items-center gap-0.5 hover:underline">
                Manage <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>
            {activeGoals.length === 0 ? (
              <div className="py-4 text-center text-sm text-gray-400 dark:text-[#7a7060]">
                <Link href="/personal/goals" className="text-[#0F6E56] underline">Add a savings goal</Link>
              </div>
            ) : (
              <div className="flex flex-col gap-5">
                {activeGoals.slice(0, 3).map((goal) => (
                  <EmmaGoalCard key={goal.id} goal={goal} />
                ))}
              </div>
            )}
          </div>

          {/* Upcoming Payments */}
          <div className="rounded-2xl bg-white dark:bg-[#222019] border border-gray-100 dark:border-[#3a3730] p-4 md:p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <h2 className="text-base font-semibold text-gray-900 dark:text-[#f0ede8]">Upcoming</h2>
                {dueSoonItems.length > 0 && (
                  <span className="text-[10px] font-bold text-amber-600 bg-amber-50 dark:bg-amber-900/30 dark:text-amber-400 border border-amber-100 dark:border-amber-800 px-1.5 py-0.5 rounded-full">
                    {dueSoonItems.length} due soon
                  </span>
                )}
              </div>
              <Link href="/personal/reminders" className="text-xs text-[#0F6E56] font-medium flex items-center gap-0.5 hover:underline">
                View all <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>
            <UpcomingRemindersWidget data={upcomingReminders} compact />
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Sub-components ─────────────────────────────────────────────────── */

function EmmaBudgetBar({ category }: { category: BudgetCategoryWithSpending }) {
  const pct       = category.percentage_spent ?? 0;
  const hasTarget = category.monthly_target != null;
  const isOver    = category.over_budget;
  const isWarn    = !isOver && pct >= 80;
  const barColor  = isOver ? 'bg-red-400' : isWarn ? 'bg-amber-400' : 'bg-[#0F6E56]';

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: category.color ?? '#0F6E56' }} />
          <span className="text-sm font-medium text-gray-800 dark:text-[#f0ede8] truncate">{category.name}</span>
          {isOver && <span className="text-[10px] font-bold text-red-500 uppercase flex-shrink-0">Over</span>}
          {isWarn && <span className="text-[10px] font-bold text-amber-500 uppercase flex-shrink-0">Almost</span>}
        </div>
        <div className="text-sm font-medium flex-shrink-0 ml-3">
          <span className={isOver ? 'text-red-500' : 'text-gray-700 dark:text-[#c8c0b0]'}>
            {formatCurrency(category.spent_this_month)}
          </span>
          {hasTarget && (
            <span className="text-gray-400 dark:text-[#7a7060] text-xs">
              {' '}/ {formatCurrency(category.monthly_target!)}
            </span>
          )}
        </div>
      </div>
      {hasTarget && (
        <div className="h-3 bg-gray-100 dark:bg-[#2a2720] rounded-full overflow-hidden">
          <div className={cn('h-full rounded-full transition-all', barColor)}
            style={{ width: `${Math.min(100, pct)}%` }} />
        </div>
      )}
    </div>
  );
}

function EmmaGoalCard({ goal }: { goal: SavingsGoalWithProgress }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-gray-800 dark:text-[#f0ede8] truncate">{goal.name}</span>
        <span className="text-sm font-bold text-[#0F6E56] flex-shrink-0 ml-2">
          {goal.percentage_complete.toFixed(0)}%
        </span>
      </div>
      <div className="h-3 bg-gray-100 dark:bg-[#2a2720] rounded-full overflow-hidden mb-2">
        <div className="h-full bg-[#0F6E56] rounded-full transition-all"
          style={{ width: `${goal.percentage_complete}%` }} />
      </div>
      <div className="flex justify-between text-xs text-gray-400 dark:text-[#7a7060]">
        <span>{formatCurrency(Number(goal.current_amount))} saved</span>
        <span>Goal: {formatCurrency(Number(goal.target_amount))}</span>
      </div>
    </div>
  );
}
