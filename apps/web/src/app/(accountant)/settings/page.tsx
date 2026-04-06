import { getFirm } from './actions';
import { WhiteLabelSettings } from '@/components/white-label-settings';
import { redirect } from 'next/navigation';

export default async function AccountantSettingsPage() {
  const firm = await getFirm();
  if (!firm) redirect('/accountant/clients');

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Firm Settings</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Manage your firm's identity and white-label branding.
        </p>
      </div>
      <WhiteLabelSettings firm={firm} />
    </div>
  );
}
