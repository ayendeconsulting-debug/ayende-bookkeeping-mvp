/**
 * Shared subscription status types for the frontend.
 *
 * Mirrors the API SubscriptionStatus enum from
 *   apps/api/src/entities/subscription.entity.ts
 * plus a UI-only "none" state for unsubscribed / no-row cases.
 *
 * MUST stay in sync with the API enum. To add a new status:
 *   1. Add it to apps/api/src/entities/subscription.entity.ts
 *   2. Add it here
 *   3. Update exhaustive switches/conditionals in:
 *      - apps/web/src/components/billing-banner.tsx
 *      - apps/web/src/components/settings-client.tsx (StatusBadge + BillingSection)
 */
export type SubscriptionStatusUI =
  | 'trialing'
  | 'active'
  | 'past_due'
  | 'cancelled'
  | 'trial_expired_readonly'
  | 'archived'
  | 'none';

export type SubscriptionPlanUI = 'starter' | 'pro' | 'accountant';

export type BillingCycleUI = 'monthly' | 'annual';