import { getBillingSummary } from './actions';
import { FirmBillingCard } from '@/components/firm-billing-card';

export default async function BillingPage() {
  const summary = await getBillingSummary();

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Billing</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Your Accountant plan usage and estimated charges.
        </p>
      </div>
      <FirmBillingCard summary={summary} />
    </div>
  );
}
