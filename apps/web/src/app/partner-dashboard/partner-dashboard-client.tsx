'use client';

import { useState } from 'react';
import { Copy, Check, Users, MousePointer, CreditCard, UserCheck } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DashboardData {
  partner: { name: string; referral_code: string; type: string };
  summary: { clicks: number; signups: number; conversions: number; active_subscribers: number };
  commission: { total_earned: number; current_balance: number; total_paid: number };
  referrals: { user_id: string; signup_date: string; subscription_status: string | null; plan: string | null; commission_earned: number }[];
  commissions: { id: string; period_start: string; period_end: string; mrr_amount: number; commission_amount: number; status: string; paid_at: string | null; created_at: string }[];
}

function fmtCurrency(v: number): string {
  return '$' + Number(v).toLocaleString('en-CA', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-CA', { month: 'short', day: 'numeric', year: 'numeric' });
}
function fmtNumber(n: number): string { return n.toLocaleString('en-CA'); }

const STATUS_STYLE: Record<string, string> = {
  active:   'bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400',
  trialing: 'bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400',
  past_due: 'bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400',
  cancelled:'bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400',
  accrued:  'bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400',
  paid:     'bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400',
  voided:   'bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400',
};

function CopyBtn({ value, label }: { value: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => { navigator.clipboard.writeText(value); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
      className="flex items-center gap-1.5 text-xs text-primary hover:text-primary/80 transition-colors"
    >
      {copied ? <><Check className="w-3 h-3" />{label ? 'Copied!' : ''}</> : <><Copy className="w-3 h-3" />{label}</>}
    </button>
  );
}

function StatCard({ label, value, icon: Icon }: { label: string; value: string; icon: typeof Users }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4 space-y-1">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
        <Icon className="w-4 h-4 text-muted-foreground/50" />
      </div>
      <p className="text-2xl font-bold text-foreground">{value}</p>
    </div>
  );
}

export function PartnerDashboardClient({ data }: { data: DashboardData }) {
  const { partner, summary, commission, referrals, commissions } = data;
  const referralLink = `https://gettempo.ca/sign-up?ref=${partner.referral_code}`;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border bg-card">
        <div className="max-w-4xl mx-auto px-4 py-6 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <div className="w-8 h-8 rounded-lg bg-[#0F6E56] flex items-center justify-center">
                <span className="text-white text-xs font-bold">TB</span>
              </div>
              <span className="text-sm font-semibold text-foreground">Tempo Books</span>
            </div>
            <h1 className="text-xl font-bold text-foreground mt-2">{partner.name}</h1>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-muted text-muted-foreground capitalize">{partner.type}</span>
              <code className="text-xs font-mono bg-muted px-2 py-0.5 rounded text-foreground">{partner.referral_code}</code>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        {/* Referral Link */}
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-xs font-medium text-muted-foreground mb-2">Your Referral Link</p>
          <div className="flex items-center gap-2">
            <code className="text-sm font-mono bg-muted px-3 py-1.5 rounded-lg text-foreground flex-1 truncate">{referralLink}</code>
            <CopyBtn value={referralLink} label="Copy" />
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard label="Clicks" value={fmtNumber(summary.clicks)} icon={MousePointer} />
          <StatCard label="Signups" value={fmtNumber(summary.signups)} icon={Users} />
          <StatCard label="Conversions" value={fmtNumber(summary.conversions)} icon={UserCheck} />
          <StatCard label="Active Subscribers" value={fmtNumber(summary.active_subscribers)} icon={CreditCard} />
        </div>

        {/* Commission Summary */}
        <div className="rounded-xl border border-border bg-card p-5">
          <h2 className="text-sm font-semibold text-foreground mb-4">Commission Summary</h2>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <p className="text-xs text-muted-foreground">Total Earned</p>
              <p className="text-lg font-bold text-foreground">{fmtCurrency(commission.total_earned)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Current Balance</p>
              <p className="text-lg font-bold text-primary">{fmtCurrency(commission.current_balance)}</p>
              <p className="text-[10px] text-muted-foreground">accrued, unpaid</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Total Paid</p>
              <p className="text-lg font-bold text-foreground">{fmtCurrency(commission.total_paid)}</p>
            </div>
          </div>
        </div>

        {/* Referral Activity Table */}
        {referrals.length > 0 && (
          <div className="rounded-xl border border-border bg-card overflow-hidden">
            <div className="px-5 py-3 border-b border-border">
              <h2 className="text-sm font-semibold text-foreground">Referral Activity</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[500px]">
                <thead>
                  <tr className="border-b border-border bg-muted/40">
                    <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground">Signup Date</th>
                    <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground">Status</th>
                    <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground">Plan</th>
                    <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground">Commission Earned</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {referrals.map((r, i) => (
                    <tr key={i} className="hover:bg-muted/20 transition-colors">
                      <td className="px-4 py-3 text-xs text-foreground">{fmtDate(r.signup_date)}</td>
                      <td className="px-4 py-3">
                        <span className={cn('text-[10px] font-semibold px-2 py-0.5 rounded-full capitalize',
                          STATUS_STYLE[r.subscription_status ?? ''] ?? 'bg-muted text-muted-foreground')}>
                          {r.subscription_status ?? 'pending'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-foreground capitalize">{r.plan ?? '—'}</td>
                      <td className="px-4 py-3 text-xs font-medium text-foreground">{fmtCurrency(r.commission_earned)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Commission Line Items */}
        {commissions.length > 0 && (
          <div className="rounded-xl border border-border bg-card overflow-hidden">
            <div className="px-5 py-3 border-b border-border">
              <h2 className="text-sm font-semibold text-foreground">Commission History</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[500px]">
                <thead>
                  <tr className="border-b border-border bg-muted/40">
                    <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground">Period</th>
                    <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground">MRR</th>
                    <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground">Commission</th>
                    <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {commissions.map((c) => (
                    <tr key={c.id} className="hover:bg-muted/20 transition-colors">
                      <td className="px-4 py-3 text-xs text-foreground">{fmtDate(c.period_start)} &rarr; {fmtDate(c.period_end)}</td>
                      <td className="px-4 py-3 text-xs text-foreground">{fmtCurrency(c.mrr_amount)}</td>
                      <td className="px-4 py-3 text-xs font-medium text-foreground">{fmtCurrency(c.commission_amount)}</td>
                      <td className="px-4 py-3">
                        <span className={cn('text-[10px] font-semibold px-2 py-0.5 rounded-full capitalize',
                          STATUS_STYLE[c.status] ?? 'bg-muted text-muted-foreground')}>
                          {c.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="text-center py-4">
          <p className="text-xs text-muted-foreground">Tempo Books &middot; Ayende CX Inc. &middot; Toronto, ON</p>
        </div>
      </div>
    </div>
  );
}
