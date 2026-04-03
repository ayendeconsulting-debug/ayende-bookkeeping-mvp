'use client';

import Link from 'next/link';
import { IncomeStatement, TaxEstimateResult, Invoice, Business } from '@/types';
import { formatCurrency, cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  TrendingUp,
  TrendingDown,
  Calculator,
  FileText,
  Car,
  ArrowRight,
  AlertCircle,
} from 'lucide-react';

interface FreelancerDashboardProps {
  ytdStatement: IncomeStatement | null;
  monthlyStatement: IncomeStatement | null;
  taxEstimate: TaxEstimateResult | null;
  invoices: Invoice[];
  business: Business | null;
}

function getCurrentQuarter(): number {
  return Math.ceil((new Date().getMonth() + 1) / 3);
}

export function FreelancerDashboard({
  ytdStatement,
  monthlyStatement,
  taxEstimate,
  invoices,
  business,
}: FreelancerDashboardProps) {
  const currentQ = getCurrentQuarter();
  const currentQEstimate = taxEstimate?.quarters.find((q) => q.quarter === currentQ);

  const outstandingInvoices = invoices.filter(
    (inv) => inv.status === 'sent' || inv.status === 'overdue' || inv.status === 'partially_paid',
  );
  const outstandingTotal = outstandingInvoices.reduce((s, inv) => s + Number(inv.balance_due), 0);

  const monthlyIncome = Number(monthlyStatement?.total_revenue ?? 0);
  const monthlyExpenses = Number(monthlyStatement?.total_expenses ?? 0);
  const ytdIncome = Number(ytdStatement?.total_revenue ?? 0);
  const ytdExpenses = Number(ytdStatement?.total_expenses ?? 0);
  const ytdNetProfit = ytdIncome - ytdExpenses;

  const country = business?.country ?? 'CA';
  const unit = country === 'US' ? 'miles' : 'km';

  return (
    <div className="p-6 max-w-screen-xl mx-auto">
      {/* Page header */}
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-gray-900">
          {business?.name ?? 'My Business'}
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

      {/* Metric cards */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <MetricCard
          label="This Month Income"
          value={formatCurrency(monthlyIncome)}
          icon={TrendingUp}
          iconColor="text-primary"
          iconBg="bg-primary-light"
          sub={new Date().toLocaleDateString('en-CA', { month: 'long', year: 'numeric' })}
        />
        <MetricCard
          label="This Month Expenses"
          value={formatCurrency(monthlyExpenses)}
          icon={TrendingDown}
          iconColor="text-danger"
          iconBg="bg-danger-light"
          sub="Business expenses only"
        />
        <MetricCard
          label={`Q${currentQ} Tax Estimate`}
          value={formatCurrency(currentQEstimate?.estimated_tax ?? 0)}
          icon={Calculator}
          iconColor="text-amber-600"
          iconBg="bg-amber-50"
          sub={
            currentQEstimate
              ? `Due ${new Date(currentQEstimate.due_date).toLocaleDateString('en-CA', { month: 'short', day: 'numeric' })}`
              : 'No data yet'
          }
        />
        <MetricCard
          label="Outstanding Invoices"
          value={formatCurrency(outstandingTotal)}
          icon={FileText}
          iconColor="text-blue-600"
          iconBg="bg-blue-50"
          sub={`${outstandingInvoices.length} invoice${outstandingInvoices.length !== 1 ? 's' : ''} unpaid`}
        />
      </div>

      {/* Main grid */}
      <div className="grid grid-cols-3 gap-4">
        {/* YTD Summary + quick links — spans 2 cols */}
        <div className="col-span-2 flex flex-col gap-4">

          {/* YTD summary */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle>Year-to-Date Summary ({new Date().getFullYear()})</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="flex flex-col gap-3">
                <SummaryRow
                  label="Total Income"
                  value={formatCurrency(ytdIncome)}
                  valueClass="text-primary font-semibold"
                />
                <SummaryRow
                  label="Total Business Expenses"
                  value={formatCurrency(ytdExpenses)}
                  valueClass="text-danger"
                />
                <div className="h-px bg-gray-100" />
                <SummaryRow
                  label="Net Profit"
                  value={formatCurrency(ytdNetProfit)}
                  valueClass={cn(
                    'font-bold text-base',
                    ytdNetProfit >= 0 ? 'text-primary' : 'text-danger',
                  )}
                  bold
                />
              </div>
              {ytdNetProfit > 0 && taxEstimate && (
                <div className="mt-4 rounded-lg bg-amber-50 border border-amber-100 px-4 py-3">
                  <p className="text-xs font-medium text-amber-700">
                    Estimated annual tax owing:{' '}
                    <span className="font-bold">
                      {formatCurrency(taxEstimate.annual_estimated_tax)}
                    </span>
                  </p>
                  <p className="text-xs text-amber-600 mt-0.5">{taxEstimate.disclaimer}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Outstanding invoices */}
          <Card>
            <CardHeader className="flex-row items-center justify-between pb-3">
              <CardTitle>Unpaid Invoices</CardTitle>
              <Link href="/invoices" className="text-xs text-primary hover:underline font-medium">
                View all →
              </Link>
            </CardHeader>
            <CardContent className="pt-0">
              {outstandingInvoices.length === 0 ? (
                <div className="py-6 text-center text-sm text-gray-400">
                  No outstanding invoices — all caught up!
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  {outstandingInvoices.slice(0, 5).map((inv) => (
                    <div
                      key={inv.id}
                      className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-gray-900 truncate">
                          {inv.client_name}
                        </div>
                        <div className="text-xs text-gray-400">
                          {inv.invoice_number} · Due{' '}
                          {new Date(inv.due_date).toLocaleDateString('en-CA', {
                            month: 'short',
                            day: 'numeric',
                          })}
                        </div>
                      </div>
                      <div className="flex items-center gap-3 ml-4">
                        <span className="text-sm font-semibold text-gray-900">
                          {formatCurrency(inv.balance_due)}
                        </span>
                        <Badge
                          variant={inv.status === 'overdue' ? 'destructive' : 'pending'}
                        >
                          {inv.status === 'overdue'
                            ? 'Overdue'
                            : inv.status === 'partially_paid'
                            ? 'Partial'
                            : 'Sent'}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right column */}
        <div className="flex flex-col gap-4">

          {/* Quick links */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="pt-0 flex flex-col gap-2">
              <QuickLink href="/transactions" label="Tag transactions" sub="Mark income & expenses" />
              <QuickLink href="/invoices" label="Create invoice" sub="Bill a client" />
              <QuickLink href="/freelancer/mileage" label="Log mileage" sub={`Track ${unit} for tax deduction`} />
              <QuickLink href="/freelancer/tax" label="View tax estimate" sub="Q1–Q4 breakdown" />
            </CardContent>
          </Card>

          {/* Tax due dates */}
          {taxEstimate && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle>
                  {country === 'CA' ? 'CRA' : 'IRS'} Instalment Due Dates
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="flex flex-col gap-2">
                  {taxEstimate.quarters.map((q) => {
                    const isPast = new Date(q.due_date) < new Date();
                    const isCurrent = q.quarter === currentQ;
                    return (
                      <div
                        key={q.quarter}
                        className={cn(
                          'flex items-center justify-between py-1.5 px-2 rounded-md',
                          isCurrent ? 'bg-amber-50 border border-amber-100' : '',
                        )}
                      >
                        <div>
                          <span
                            className={cn(
                              'text-xs font-medium',
                              isCurrent ? 'text-amber-700' : isPast ? 'text-gray-400' : 'text-gray-700',
                            )}
                          >
                            {q.label}
                          </span>
                          <span className="text-xs text-gray-400 ml-2">
                            Due{' '}
                            {new Date(q.due_date).toLocaleDateString('en-CA', {
                              month: 'short',
                              day: 'numeric',
                            })}
                          </span>
                        </div>
                        <span
                          className={cn(
                            'text-xs font-semibold',
                            isCurrent ? 'text-amber-700' : isPast ? 'text-gray-400' : 'text-gray-700',
                          )}
                        >
                          {formatCurrency(q.estimated_tax)}
                        </span>
                      </div>
                    );
                  })}
                </div>
                <p className="text-[10px] text-gray-400 mt-3 leading-relaxed">
                  Estimates only. Consult a tax professional.
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── Sub-components ──────────────────────────────────────────────────────────── */

function MetricCard({
  label,
  value,
  icon: Icon,
  iconColor,
  iconBg,
  sub,
}: {
  label: string;
  value: string;
  icon: React.ElementType;
  iconColor: string;
  iconBg: string;
  sub: string;
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

function SummaryRow({
  label,
  value,
  valueClass,
  bold,
}: {
  label: string;
  value: string;
  valueClass: string;
  bold?: boolean;
}) {
  return (
    <div className="flex items-center justify-between">
      <span className={`text-sm ${bold ? 'font-medium text-gray-900' : 'text-gray-500'}`}>
        {label}
      </span>
      <span className={`text-sm ${valueClass}`}>{value}</span>
    </div>
  );
}

function QuickLink({
  href,
  label,
  sub,
}: {
  href: string;
  label: string;
  sub: string;
}) {
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
