import { apiGet } from '@/lib/api';
import { RecurringDetectionCandidate, ConfirmedRecurring } from '@/types';
import { RecurringDetectionManager } from '@/components/recurring-detection-manager';

async function getDetections(): Promise<RecurringDetectionCandidate[]> {
  try { return await apiGet<RecurringDetectionCandidate[]>('/personal/recurring-detections'); } catch { return []; }
}
async function getConfirmed(): Promise<ConfirmedRecurring[]> {
  try { return await apiGet<ConfirmedRecurring[]>('/personal/recurring-confirmed'); } catch { return []; }
}

export default async function RecurringPage() {
  const [candidates, confirmed] = await Promise.all([getDetections(), getConfirmed()]);
  return (
    <div className="p-6 max-w-screen-lg mx-auto">
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-foreground">Recurring Payments</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Detected subscriptions and bills from your transaction history.</p>
      </div>
      <RecurringDetectionManager initialCandidates={candidates} initialConfirmed={confirmed} />
    </div>
  );
}
