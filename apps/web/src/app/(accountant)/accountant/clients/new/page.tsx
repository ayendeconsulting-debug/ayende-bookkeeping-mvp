import { getProvinces } from './actions';
import { ClientOnboardingWizard } from '@/components/client-onboarding-wizard';

export default async function NewClientPage() {
  const provinces = await getProvinces();

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Add New Client</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Set up a new client business in your firm portal.
        </p>
      </div>
      <ClientOnboardingWizard provinces={provinces} />
    </div>
  );
}
