import { getBusinessSettings, getSubscriptionStatus, getProvinces } from './actions';
import { SettingsClient } from '@/components/settings-client';

export default async function SettingsPage() {
  const [business, subscriptionResult, provincesResult] = await Promise.all([
    getBusinessSettings(),
    getSubscriptionStatus(),
    getProvinces(),
  ]);

  const subscription = subscriptionResult?.success ? subscriptionResult.data : null;
  const provinces    = provincesResult?.success ? provincesResult.data : [];

  return (
    <SettingsClient
      business={business}
      subscription={subscription}
      provinces={provinces ?? []}
    />
  );
}
