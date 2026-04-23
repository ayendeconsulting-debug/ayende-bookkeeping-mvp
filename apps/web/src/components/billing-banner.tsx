import Link from 'next/link';
import { AlertCircle, Clock, XCircle, Sparkles } from 'lucide-react';

interface SubscriptionStatus { status: string; plan: string | null; days_remaining: number | null; }
interface BillingBannerProps { subscription: SubscriptionStatus | null; }

export function BillingBanner({ subscription }: BillingBannerProps) {
  if (!subscription) return null;
  const { status, days_remaining } = subscription;
  if (status === 'active') return null;

  if (status === 'none') {
    return (
      <div className="flex items-center gap-3 px-4 py-3 text-sm bg-primary-light border-b border-primary/30 text-primary">
        <Sparkles className="w-4 h-4 flex-shrink-0" />
        <span className="flex-1">
          <strong>Start your free trial.</strong>{' '}
          Get full access to Tempo Books — no credit card charged for 60 days.
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
          {' '}Add a payment method to keep access after your trial.
        </span>
        <Link href="/settings"
          className={['flex-shrink-0 text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors',
            urgency ? 'bg-red-600 text-white hover:bg-red-700' : 'bg-amber-600 text-white hover:bg-amber-700',
          ].join(' ')}>
          Manage subscription
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

  if (status === 'cancelled') {
    return (
      <div className="flex items-center gap-3 px-4 py-3 text-sm bg-muted border-b border-border text-muted-foreground">
        <XCircle className="w-4 h-4 flex-shrink-0" />
        <span className="flex-1">Your subscription has been cancelled. Resubscribe to restore access to all features.</span>
        <Link href="/pricing" className="flex-shrink-0 text-xs font-semibold px-3 py-1.5 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors">View plans</Link>
      </div>
    );
  }

  return null;
}
