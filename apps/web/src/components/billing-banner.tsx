import Link from 'next/link';
import { AlertCircle, Clock, XCircle } from 'lucide-react';

interface SubscriptionStatus {
  status:         string;
  plan:           string | null;
  days_remaining: number | null;
}

interface BillingBannerProps {
  subscription: SubscriptionStatus | null;
}

export function BillingBanner({ subscription }: BillingBannerProps) {
  if (!subscription) return null;

  const { status, days_remaining } = subscription;

  // Active subscription — no banner needed
  if (status === 'active' || status === 'none') return null;

  if (status === 'trialing') {
    // Only show banner when ≤ 14 days remain
    if (days_remaining === null || days_remaining > 14) return null;

    const urgency = days_remaining <= 3;

    return (
      <div className={[
        'flex items-center gap-3 px-4 py-3 text-sm',
        urgency
          ? 'bg-red-50 dark:bg-red-950/40 border-b border-red-200 dark:border-red-900 text-red-700 dark:text-red-400'
          : 'bg-amber-50 dark:bg-amber-950/40 border-b border-amber-200 dark:border-amber-900 text-amber-700 dark:text-amber-400',
      ].join(' ')}>
        <Clock className="w-4 h-4 flex-shrink-0" />
        <span className="flex-1">
          <strong>
            {days_remaining === 0
              ? 'Your trial ends today.'
              : `${days_remaining} day${days_remaining === 1 ? '' : 's'} left in your trial.`}
          </strong>
          {' '}Add a payment method to keep access after your trial.
        </span>
        <Link
          href="/settings"
          className={[
            'flex-shrink-0 text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors',
            urgency
              ? 'bg-red-600 text-white hover:bg-red-700'
              : 'bg-amber-600 text-white hover:bg-amber-700',
          ].join(' ')}
        >
          Manage subscription
        </Link>
      </div>
    );
  }

  if (status === 'past_due') {
    return (
      <div className="flex items-center gap-3 px-4 py-3 text-sm bg-red-50 dark:bg-red-950/40 border-b border-red-200 dark:border-red-900 text-red-700 dark:text-red-400">
        <AlertCircle className="w-4 h-4 flex-shrink-0" />
        <span className="flex-1">
          <strong>Payment failed.</strong> Please update your payment method to restore full access.
        </span>
        <Link
          href="/settings"
          className="flex-shrink-0 text-xs font-semibold px-3 py-1.5 rounded-lg bg-red-600 text-white hover:bg-red-700 transition-colors"
        >
          Update payment
        </Link>
      </div>
    );
  }

  if (status === 'cancelled') {
    return (
      <div className="flex items-center gap-3 px-4 py-3 text-sm bg-muted border-b border-border text-muted-foreground">
        <XCircle className="w-4 h-4 flex-shrink-0" />
        <span className="flex-1">
          Your subscription has been cancelled. Resubscribe to restore access to all features.
        </span>
        <Link
          href="/pricing"
          className="flex-shrink-0 text-xs font-semibold px-3 py-1.5 rounded-lg bg-[#0F6E56] text-white hover:bg-[#085041] transition-colors"
        >
          View plans
        </Link>
      </div>
    );
  }

  return null;
}
