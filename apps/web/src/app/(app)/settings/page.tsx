import { getBusinessSettings } from './actions';
import { SettingsClient } from '@/components/settings-client';

export default async function SettingsPage() {
  const business = await getBusinessSettings();
  return <SettingsClient business={business} />;
}
