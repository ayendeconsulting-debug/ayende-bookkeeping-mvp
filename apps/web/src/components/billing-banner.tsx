import Link from 'next/link';
import { AlertCircle, Clock, XCircle, Sparkles } from 'lucide-react';
import type { SubscriptionStatusUI } from '@/lib/subscription-types';

interface SubscriptionStatus {
  status: SubscriptionStatusUI;
  plan: string | null;
  days_remaining: number | null;
  readonly_started_at?: string | null;
}
interface BillingBannerProps { subscription: SubscriptionStatus | null; }

const READONLY_WINDOW_DAYS = 90;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

function daysUntilArchive(readonlyStartedAt: string | null | undefined): number | null {
  if (!readonlyStartedAt) return null;
  const start = new Date(readonlyStartedAt);
  if (Number.isNaN(start.getTime())) return null;
  const archiveAt = start.getTime() + READONLY_WINDOW_DAYS * MS_PER_DAY;
  const remaining = archiveAt - Date.now();
  return Math.max(0, Math.ceil(remaining / MS_PER_DAY));
}

export function BillingBanner({ subscription }: BillingBannerProps) {
  if (!subscription) return null;
  const { status, days_remaining, readonly_started_at } = subscription;
  if (status === 'active') return null;

  if (status === 'none') {
    return (
      <div className="flex items-center gap-3 px-4 py-3 text-sm bg-primary-light border-b border-primary/30 text-primary">
        <Sparkles className="w-4 h-4 flex-shrink-0" />
        <span className="flex-1">
          <strong>Welcome to Tempo Books.</strong>{' '}
          Choose a plan to get started.
        </span>
        <Link href="/pricing"
          className="flex-shrink-0 text-xs font-semibold px-3 py-1.5 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors">
          Choose a plan
        </Link>
      </div>
    );
  }

  if (status === 'trialing') {
    if (days_remaining === null || days_remaining > 14) return null;
    const urgency = days_remaining <= 3;
    return (
      <div className={['flex items-center gap-3 px-4 py-3 text-sm',
        urgency
          ? 'bg-red-50 dark:bg-[#01060B] border-b border-red-200 dark:border-[#FF3E3E]/40 text-red-700 dark:text-[#FF3E3E]'
          : 'bg-amber-50 dark:bg-[#494C4F] border-b border-amber-200 dark:border-[#FBFB47]/40 text-amber-700 dark:text-[#FBFB47]',
      ].join(' ')}>
        <Clock className="w-4 h-4 flex-shrink-0" />
        <span className="flex-1">
          <strong>{days_remaining === 0 ? 'Your trial ends today.' : `${days_remaining} day${days_remaining === 1 ? '' : 's'} left in your trial.`}</strong>
          {' '}Upgrade to keep access after your trial.
        </span>
        <Link href="/settings"
          className={['flex-shrink-0 text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors',
            urgency ? 'bg-red-600 text-white hover:bg-red-700' : 'bg-amber-600 text-white hover:bg-amber-700',
          ].join(' ')}>
          Upgrade to keep access
        </Link>
      </div>
    );
  }

  if (status === 'past_due') {
    return (
      <div className="flex items-center gap-3 px-4 py-3 text-sm bg-red-50 dark:bg-[#01060B] border-b border-red-200 dark:border-[#FF3E3E]/40 text-red-700 dark:text-[#FF3E3E]">
        <AlertCircle className="w-4 h-4 flex-shrink-0" />
        <span className="flex-1"><strong>Payment failed.</strong> Please update your payment method to restore full access.</span>
        <Link href="/settings" className="flex-shrink-0 text-xs font-semibold px-3 py-1.5 rounded-lg bg-red-600 text-white hover:bg-red-700 transition-colors">Update payment</Link>
      </div>
    );
  }

  if (status === 'trial_expired_readonly') {
    const daysLeft = daysUntilArchive(readonly_started_at);
    const headline = daysLeft === null
      ? 'Your trial ended.'
      : daysLeft === 0
        ? 'Your account will be archived today.'
        : `Your trial ended. Read-only access for ${daysLeft} more day${daysLeft === 1 ? '' : 's'} before archive.`;
    return (
      <div className="flex items-center gap-3 px-4 py-3 text-sm bg-red-50 dark:bg-[#01060B] border-b border-red-200 dark:border-[#FF3E3E]/40 text-red-700 dark:text-[#FF3E3E]">
        <AlertCircle className="w-4 h-4 flex-shrink-0" />
        <span className="flex-1"><strong>{headline}</strong> Upgrade to restore full access, or export your data before archive.</span>
        <Link href="/pricing" className="flex-shrink-0 text-xs font-semibold px-3 py-1.5 rounded-lg bg-red-600 text-white hover:bg-red-700 transition-colors">Upgrade to restore access</Link>
        <Link href="/settings" className="flex-shrink-0 text-xs font-semibold px-3 py-1.5 rounded-lg border border-red-700/40 text-red-700 dark:text-[#FF3E3E] hover:bg-red-100 dark:hover:bg-red-950/40 transition-colors">Export data</Link>
      </div>
    );
  }

  if (status === 'cancelled') {
    return (
      <div className="flex items-center gap-3 px-4 py-3 text-sm bg-muted border-b border-border text-muted-foreground">
        <XCircle className="w-4 h-4 flex-shrink-0" />
        <span className="flex-1">Your subscription has been cancelled. Resubscribe to restore access to all features.</span>
        <Link href="/pricing" className="flex-shrink-0 text-xs font-semibold px-3 py-1.5 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors">View plans</Link>
      </div>
    );
  }

  if (status === 'archived') {
    return (
      <div className="flex items-center gap-3 px-4 py-3 text-sm bg-muted border-b border-border text-muted-foreground">
        <XCircle className="w-4 h-4 flex-shrink-0" />
        <span className="flex-1"><strong>Your account is archived.</strong> Bank connections have been disconnected. Contact support to restore access.</span>
        <a href="mailto:hello@gettempo.ca" className="flex-shrink-0 text-xs font-semibold px-3 py-1.5 rounded-lg bg-foreground text-background hover:bg-foreground/90 transition-colors">Contact support</a>
      </div>
    );
  }

  // Exhaustiveness check â€” TypeScript will flag this if a new SubscriptionStatusUI value is added
  // without a corresponding branch above.
  const _exhaustive: never = status;
  void _exhaustive;
  return null;
}
