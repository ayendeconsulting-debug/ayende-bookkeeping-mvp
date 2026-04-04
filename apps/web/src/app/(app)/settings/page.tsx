import { getBusinessSettings, getSubscriptionStatus } from './actions';
import { SettingsClient } from '@/components/settings-client';

export default async function SettingsPage() {
  const [business, subscriptionResult] = await Promise.all([
    getBusinessSettings(),
    getSubscriptionStatus(),
  ]);

  const subscription = subscriptionResult?.success ? subscriptionResult.data : null;

  return <SettingsClient business={business} subscription={subscription} />;
}
