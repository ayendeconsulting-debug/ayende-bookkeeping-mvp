'use client';

import Link from 'next/link';
import {
  BudgetCategoryWithSpending,
  SavingsGoalWithProgress,
  NetWorthResult,
  IncomeStatement,
  Business,
} from '@/types';
import { formatCurrency, cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  TrendingDown,
  TrendingUp,
  PiggyBank,
  Wallet,
  AlertCircle,
  ArrowRight,
  Target,
} from 'lucide-react';

interface PersonalDashboardProps {
  budgetCategories: BudgetCategoryWithSpending[];
  savingsGoals: SavingsGoalWithProgress[];
  netWorth: NetWorthResult | null;
  monthlyStatement: IncomeStatement | null;
  business: Business | null;
}

export function PersonalDashboard({
  budgetCategories,
  savingsGoals,
  netWorth,
  monthlyStatement,
  business,
}: PersonalDashboardProps) {
  const moneyIn = Number(monthlyStatement?.total_revenue ?? 0);
  const moneyOut = Number(monthlyStatement?.total_expenses ?? 0);

  const totalMonthlyTarget = budgetCategories.reduce(
    (s, c) => s + (c.monthly_target ?? 0),
    0,
  );
  const totalSpent = budgetCategories.reduce((s, c) => s + c.spent_this_month, 0);
  const remainingBudget = Math.max(0, totalMonthlyTarget - totalSpent);

  const overBudgetCount = budgetCategories.filter((c) => c.over_budget).length;
  const activeGoals = savingsGoals.filter((g) => g.status === 'active');

  const monthName = new Date().toLocaleDateString('en-CA', {
    month: 'long',
    year: 'numeric',
  });

  return (
    <div className="p-6 max-w-screen-xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-gray-900">
          {business?.name ?? 'My Finances'}
        </h1>
        <p className="text-sm text-gray-500 mt-0.5">
          {new Date().toLocaleDateString('en-CA', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          })}
        </p>
      </div>

      {/* Over-budget alert */}
      {overBudgetCount > 0 && (
        <div className="mb-5 flex items-center gap-3 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
          <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
          <p className="text-sm font-medium text-red-700">
            {overBudgetCount} budget{' '}
            {overBudgetCount === 1 ? 'category is' : 'categories are'} over target this month.
          </p>
          <Link href="/personal/budget" className="ml-auto text-xs text-red-600 underline">
            Review
          </Link>
        </div>
      )}

      {/* Metric cards */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <MetricCard
          label="Money In"
          value={formatCurrency(moneyIn)}
          icon={TrendingUp}
          iconColor="text-primary"
          iconBg="bg-primary-light"
          sub={monthName}
        />
        <MetricCard
          label="Money Out"
          value={formatCurrency(moneyOut)}
          icon={TrendingDown}
          iconColor="text-danger"
          iconBg="bg-danger-light"
          sub={monthName}
        />
        <MetricCard
          label="Remaining Budget"
          value={totalMonthlyTarget > 0 ? formatCurrency(remainingBudget) : '—'}
          icon={Wallet}
          iconColor={remainingBudget > 0 ? 'text-primary' : 'text-danger'}
          iconBg={remainingBudget > 0 ? 'bg-primary-light' : 'bg-danger-light'}
          sub={
            totalMonthlyTarget > 0
              ? `of ${formatCurrency(totalMonthlyTarget)} budgeted`
              : 'Set budgets to track'
          }
        />
        <MetricCard
          label="Net Worth"
          value={netWorth ? formatCurrency(netWorth.net_worth) : '—'}
          icon={PiggyBank}
          iconColor="text-blue-600"
          iconBg="bg-blue-50"
          sub={
            netWorth
              ? `${formatCurrency(netWorth.total_assets)} assets`
              : 'Connect a bank to calculate'
          }
        />
      </div>

      {/* Main grid */}
      <div className="grid grid-cols-3 gap-4">
        {/* Budget vs Actual — 2 cols */}
        <div className="col-span-2 flex flex-col gap-4">
          <Card>
            <CardHeader className="flex-row items-center justify-between pb-3">
              <CardTitle>Budget vs Actual — {monthName}</CardTitle>
              <Link
                href="/personal/budget"
                className="text-xs text-primary hover:underline font-medium"
              >
                Manage →
              </Link>
            </CardHeader>
            <CardContent className="pt-0">
              {budgetCategories.length === 0 ? (
                <div className="py-8 text-center text-sm text-gray-400">
                  No budget categories yet.{' '}
                  <Link href="/personal/budget" className="text-primary underline">
                    Set up your budget
                  </Link>
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  {budgetCategories.slice(0, 8).map((cat) => (
                    <BudgetBar key={cat.id} category={cat} />
                  ))}
                  {budgetCategories.length > 8 && (
                    <Link
                      href="/personal/budget"
                      className="text-xs text-gray-400 hover:text-primary text-center pt-1"
                    >
                      +{budgetCategories.length - 8} more categories →
                    </Link>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right column */}
        <div className="flex flex-col gap-4">
          {/* Savings Goals */}
          <Card>
            <CardHeader className="flex-row items-center justify-between pb-3">
              <CardTitle className="flex items-center gap-2">
                <Target className="w-4 h-4 text-gray-400" />
                Savings Goals
              </CardTitle>
              <Link
                href="/personal/goals"
                className="text-xs text-primary hover:underline font-medium"
              >
                Manage →
              </Link>
            </CardHeader>
            <CardContent className="pt-0">
              {activeGoals.length === 0 ? (
                <div className="py-4 text-center text-sm text-gray-400">
                  <Link href="/personal/goals" className="text-primary underline">
                    Add a savings goal
                  </Link>
                </div>
              ) : (
                <div className="flex flex-col gap-4">
                  {activeGoals.slice(0, 3).map((goal) => (
                    <GoalCard key={goal.id} goal={goal} />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Quick links */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="pt-0 flex flex-col gap-2">
              <QuickLink href="/transactions" label="Review transactions" sub="See recent activity" />
              <QuickLink href="/personal/budget" label="Update budget" sub="Set monthly targets" />
              <QuickLink href="/personal/goals" label="Log a deposit" sub="Track goal progress" />
              <QuickLink href="/personal/networth" label="Net worth" sub="Full assets & liabilities" />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

/* ── Sub-components ──────────────────────────────────────────────────────────── */

function MetricCard({
  label, value, icon: Icon, iconColor, iconBg, sub,
}: {
  label: string; value: string; icon: React.ElementType;
  iconColor: string; iconBg: string; sub: string;
}) {
  return (
    <Card>
      <CardContent className="pt-5">
        <div className="flex items-start justify-between mb-3">
          <div className="text-xs font-medium text-gray-500 uppercase tracking-wider">{label}</div>
          <div className={`w-8 h-8 rounded-lg ${iconBg} flex items-center justify-center`}>
            <Icon className={`w-4 h-4 ${iconColor}`} />
          </div>
        </div>
        <div className="text-2xl font-semibold text-gray-900 mb-1">{value}</div>
        <div className="text-xs text-gray-400">{sub}</div>
      </CardContent>
    </Card>
  );
}

function BudgetBar({ category }: { category: BudgetCategoryWithSpending }) {
  const pct = category.percentage_spent ?? 0;
  const hasTarget = category.monthly_target !== null && category.monthly_target !== undefined;

  return (
    <div>
      <div className="flex justify-between items-center mb-1">
        <div className="flex items-center gap-2">
          <div
            className="w-2.5 h-2.5 rounded-full flex-shrink-0"
            style={{ backgroundColor: category.color }}
          />
          <span className="text-sm text-gray-700">{category.name}</span>
          {category.over_budget && (
            <span className="text-[10px] font-bold text-red-500 uppercase tracking-wide">
              Over
            </span>
          )}
        </div>
        <div className="text-xs text-gray-500">
          {formatCurrency(category.spent_this_month)}
          {hasTarget && (
            <span className="text-gray-400"> / {formatCurrency(category.monthly_target!)}</span>
          )}
        </div>
      </div>
      {hasTarget && (
        <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
          <div
            className={cn(
              'h-full rounded-full transition-all',
              category.over_budget ? 'bg-red-400' : pct >= 80 ? 'bg-amber-400' : 'bg-primary',
            )}
            style={{ width: `${Math.min(100, pct)}%` }}
          />
        </div>
      )}
    </div>
  );
}

function GoalCard({ goal }: { goal: SavingsGoalWithProgress }) {
  return (
    <div>
      <div className="flex justify-between items-center mb-1.5">
        <span className="text-sm font-medium text-gray-800">{goal.name}</span>
        <span className="text-xs font-semibold text-primary">
          {goal.percentage_complete.toFixed(0)}%
        </span>
      </div>
      <div className="h-2 bg-gray-100 rounded-full overflow-hidden mb-1">
        <div
          className="h-full bg-primary rounded-full transition-all"
          style={{ width: `${goal.percentage_complete}%` }}
        />
      </div>
      <div className="flex justify-between text-xs text-gray-400">
        <span>{formatCurrency(Number(goal.current_amount))}</span>
        <span>{formatCurrency(Number(goal.target_amount))}</span>
      </div>
    </div>
  );
}

function QuickLink({ href, label, sub }: { href: string; label: string; sub: string }) {
  return (
    <Link
      href={href}
      className="flex items-center justify-between px-3 py-2.5 rounded-lg border border-gray-100 hover:border-primary/30 hover:bg-primary-light/30 transition-colors group"
    >
      <div>
        <div className="text-sm font-medium text-gray-900 group-hover:text-primary">{label}</div>
        <div className="text-xs text-gray-400">{sub}</div>
      </div>
      <ArrowRight className="w-4 h-4 text-gray-300 group-hover:text-primary transition-colors" />
    </Link>
  );
}
