import Link from 'next/link';
import { CheckCircle2, ArrowRight, Calendar, CreditCard } from 'lucide-react';
import { apiGet } from '@/lib/api';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { auth } from '@clerk/nextjs/server';

interface SubscriptionStatus {
  status:             string;
  plan:               string | null;
  billing_cycle:      string | null;
  trial_ends_at:      string | null;
  current_period_end: string | null;
  days_remaining:     number | null;
}

const PLAN_LABELS: Record<string, string> = {
  starter:    'Starter',
  pro:        'Pro',
  accountant: 'Accountant',
};

const API_URL = process.env.API_URL || 'http://localhost:3005';

export default async function BillingSuccessPage() {
  const cookieStore = await cookies();
  const fromOnboarding = cookieStore.get('onboarding_checkout');
  const onboardingPlan = cookieStore.get('onboarding_plan')?.value;

  if (fromOnboarding) {
    // Mark onboarding complete so AppLayout no longer redirects to /onboarding
    try {
      const { getToken } = await auth();
      const token = await getToken();
      if (token) {
        await fetch(`${API_URL}/businesses/me`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ settings: { mode_selected: true } }),
          cache: 'no-store',
        });
      }
    } catch (err) {
      console.error('[billing/success] Failed to mark onboarding complete:', err);
    }

    // Accountant plan users go to firm setup first
    if (onboardingPlan === 'accountant') {
      redirect('/accountant-setup');
    }

    // All other plans go to bank connection
    redirect('/banks');
  }

  let subscription: SubscriptionStatus | null = null;
  try {
    subscription = await apiGet<SubscriptionStatus>('/billing/subscription');
  } catch {
    // subscription might not be ready yet — show generic success
  }

  const planLabel     = subscription?.plan ? PLAN_LABELS[subscription.plan] ?? subscription.plan : null;
  const trialEndsAt   = subscription?.trial_ends_at
    ? new Date(subscription.trial_ends_at).toLocaleDateString('en-CA', {
        year: 'numeric', month: 'long', day: 'numeric',
      })
    : null;
  const daysRemaining = subscription?.days_remaining;

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-6 py-16">
      <div className="max-w-lg w-full text-center">

        {/* Success icon */}
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-[#EDF7F2] mb-6">
          <CheckCircle2 className="w-8 h-8 text-[#0F6E56]" />
        </div>

        <h1 className="text-3xl font-bold text-foreground mb-3">
          You&apos;re all set!
        </h1>
        <p className="text-muted-foreground mb-8 leading-relaxed">
          Your 60-day free trial has started.
          {planLabel && <> You&apos;re on the <strong className="text-foreground">{planLabel}</strong> plan.</>}
          {' '}No charge until your trial ends.
        </p>

        {/* Trial details */}
        {(trialEndsAt || daysRemaining) && (
          <div className="bg-card border border-border rounded-2xl p-6 mb-8 text-left space-y-4">
            {trialEndsAt && (
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-[#EDF7F2] flex items-center justify-center flex-shrink-0">
                  <Calendar className="w-4 h-4 text-[#0F6E56]" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Trial ends</p>
                  <p className="text-sm font-semibold text-foreground">{trialEndsAt}</p>
                </div>
                {daysRemaining !== null && (
                  <span className="ml-auto text-xs font-semibold text-[#0F6E56] bg-[#EDF7F2] px-2.5 py-1 rounded-full">
                    {daysRemaining} days remaining
                  </span>
                )}
              </div>
            )}
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-[#EDF7F2] flex items-center justify-center flex-shrink-0">
                <CreditCard className="w-4 h-4 text-[#0F6E56]" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">After trial</p>
                <p className="text-sm font-semibold text-foreground">
                  Auto-continues on{' '}
                  {planLabel ?? 'Starter'} — cancel anytime from Settings
                </p>
              </div>
            </div>
          </div>
        )}

        {/* CTAs */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/dashboard"
            className="inline-flex items-center justify-center gap-2 bg-[#0F6E56] text-white px-6 py-3 rounded-xl font-semibold text-sm hover:bg-[#085041] transition-colors"
          >
            Go to Dashboard <ArrowRight className="w-4 h-4" />
          </Link>
          <Link
            href="/banks"
            className="inline-flex items-center justify-center gap-2 border border-border text-foreground px-6 py-3 rounded-xl font-semibold text-sm hover:border-[#0F6E56] hover:text-[#0F6E56] transition-colors"
          >
            Connect your bank
          </Link>
        </div>

        <p className="text-xs text-muted-foreground mt-6">
          Questions?{' '}
          <a href="mailto:hello@gettempo.ca" className="text-[#0F6E56] hover:underline underline-offset-2">
            hello@gettempo.ca
          </a>
        </p>

      </div>
    </div>
  );
}
