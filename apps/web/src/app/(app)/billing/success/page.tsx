import Link from 'next/link';
import { CheckCircle2, ArrowRight, ShieldCheck, ShieldAlert, Sparkles } from 'lucide-react';
import { apiGet } from '@/lib/api';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { auth } from '@clerk/nextjs/server';

interface SubscriptionStatus {
  status: string;
  plan: string | null;
  billing_cycle: string | null;
  trial_ends_at: string | null;
  current_period_end: string | null;
  days_remaining: number | null;
  mbg_ends_at: string | null;
  readonly_started_at: string | null;
}

const PLAN_LABELS: Record<string, string> = { starter: 'Starter', pro: 'Pro', accountant: 'Accountant' };
const API_URL = process.env.API_URL || 'http://localhost:3005';

function formatLongDate(iso: string | null): string | null {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString('en-CA', { year: 'numeric', month: 'long', day: 'numeric' });
}

function plus14Days(): string {
  const d = new Date();
  d.setDate(d.getDate() + 14);
  return d.toLocaleDateString('en-CA', { year: 'numeric', month: 'long', day: 'numeric' });
}

export default async function BillingSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ trial?: string; session_id?: string }>;
}) {
  const params         = await searchParams;
  const cookieStore    = await cookies();
  const fromOnboarding = cookieStore.get('onboarding_checkout');
  const onboardingPlan = cookieStore.get('onboarding_plan')?.value;

  // Onboarding completers short-circuit to next-step destination â€” never see this card.
  if (fromOnboarding) {
    try {
      const { getToken } = await auth();
      const token        = await getToken();
      if (token) {
        await fetch(`${API_URL}/businesses/me`, {
          method:  'PATCH',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body:    JSON.stringify({ settings: { mode_selected: true } }),
          cache:   'no-store',
        });
      }
    } catch (err) {
      console.error('[billing/success] Failed to mark onboarding complete:', err);
    }
    if (onboardingPlan === 'accountant') redirect('/accountant-setup');
    redirect('/banks');
  }

  // Branch detection. session_id wins if both ?trial=true and ?session_id= are present (SRD Â§4.6).
  const isTrialBranch = params.trial === 'true' && !params.session_id;

  let subscription: SubscriptionStatus | null = null;
  if (!isTrialBranch) {
    try {
      subscription = await apiGet<SubscriptionStatus>('/billing/subscription');
    } catch {
      // Graceful degrade â€” fall through to generic confirmation card.
    }
  }

  const planLabel           = subscription?.plan ? PLAN_LABELS[subscription.plan] ?? subscription.plan : null;
  const isAccountantMonthly = subscription?.plan === 'accountant' && subscription.billing_cycle === 'monthly';
  const isAccountantAnnual  = subscription?.plan === 'accountant' && subscription.billing_cycle === 'annual';

  const trialEndDate = formatLongDate(subscription?.trial_ends_at ?? null) ?? plus14Days();
  const mbgEndDate   = formatLongDate(subscription?.mbg_ends_at ?? null);
  const renewalDate  = formatLongDate(subscription?.current_period_end ?? null);

  const isAccountant = isAccountantMonthly || isAccountantAnnual;

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-6 py-16">
      <div className="max-w-lg w-full text-center">

        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary-light mb-6">
          <CheckCircle2 className="w-8 h-8 text-primary" />
        </div>

        {/* Branch 1: Starter/Pro no-card 14-day trial */}
        {isTrialBranch && (
          <>
            <h1 className="text-3xl font-bold text-foreground mb-3">Your free trial has started!</h1>
            <p className="text-muted-foreground mb-8 leading-relaxed">
              14 days of full access. No credit card required.
            </p>
            <div className="bg-card border border-primary/30 rounded-2xl p-6 mb-8 text-left">
              <div className="flex items-start gap-3">
                <Sparkles className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-semibold text-primary mb-1">Trial ends {trialEndDate}</p>
                  <p className="text-xs text-muted-foreground">
                    Your trial expires after 14 days. Upgrade anytime to keep full access â€” your data stays read-only for 90 days after expiry.
                  </p>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Branch 2: Accountant Monthly with 30-day MBG */}
        {isAccountantMonthly && (
          <>
            <h1 className="text-3xl font-bold text-foreground mb-3">Welcome to Tempo Books â€” Accountant</h1>
            <p className="text-muted-foreground mb-8 leading-relaxed">
              Your subscription is active. Charged today, billed monthly going forward.
            </p>
            <div className="bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-900/40 rounded-2xl p-6 mb-8 text-left">
              <div className="flex items-start gap-3">
                <ShieldCheck className="w-5 h-5 text-green-700 dark:text-green-400 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-semibold text-green-700 dark:text-green-400 mb-1">
                    30-day money-back guarantee{mbgEndDate ? ` through ${mbgEndDate}` : ''}
                  </p>
                  <p className="text-xs text-green-700/80 dark:text-green-400/80">
                    Full refund available until that date â€” no questions asked. After that, your monthly subscription continues normally.
                  </p>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Branch 3: Accountant Annual non-refundable */}
        {isAccountantAnnual && (
          <>
            <h1 className="text-3xl font-bold text-foreground mb-3">Welcome to Tempo Books â€” Accountant Annual</h1>
            <p className="text-muted-foreground mb-8 leading-relaxed">
              Your annual subscription is active. Charged today, renewing in 12 months.
            </p>
            <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/40 rounded-2xl p-6 mb-8 text-left">
              <div className="flex items-start gap-3">
                <ShieldAlert className="w-5 h-5 text-amber-700 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-semibold text-amber-700 dark:text-amber-400 mb-1">12-month non-refundable commitment</p>
                  <p className="text-xs text-amber-700/80 dark:text-amber-400/80">
                    This plan is not eligible for refunds.
                    {renewalDate ? ` Your subscription renews automatically on ${renewalDate} unless cancelled.` : ' Your subscription renews automatically unless cancelled.'}
                  </p>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Fallback: neither parameter set, OR session_id branch but subscription fetch failed (SRD Â§4.6) */}
        {!isTrialBranch && !isAccountantMonthly && !isAccountantAnnual && (
          <>
            <h1 className="text-3xl font-bold text-foreground mb-3">You&apos;re all set!</h1>
            <p className="text-muted-foreground mb-8 leading-relaxed">
              Welcome to Tempo Books. Your account is ready.
              {planLabel && <> You&apos;re on the <strong className="text-foreground">{planLabel}</strong> plan.</>}
            </p>
          </>
        )}

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link href="/dashboard"
            className="inline-flex items-center justify-center gap-2 bg-primary text-primary-foreground px-6 py-3 rounded-xl font-semibold text-sm hover:bg-primary/90 transition-colors">
            Go to Dashboard <ArrowRight className="w-4 h-4" />
          </Link>
          <Link href={isAccountant ? '/accountant-setup' : '/banks'}
            className="inline-flex items-center justify-center gap-2 border border-border text-foreground px-6 py-3 rounded-xl font-semibold text-sm hover:border-primary hover:text-primary transition-colors">
            {isAccountant ? 'Set up your firm' : 'Connect your bank'}
          </Link>
        </div>

        <p className="text-xs text-muted-foreground mt-6">
          Questions?{' '}
          <a href="mailto:hello@gettempo.ca" className="text-primary hover:underline underline-offset-2">hello@gettempo.ca</a>
        </p>
      </div>
    </div>
  );
}
