import { apiGet } from '@/lib/api';
import { MileageLogResult } from '@/types';
import { MileageLogManager } from '@/components/mileage-log-manager';

async function getMileageLogs(): Promise<MileageLogResult> {
  try { return await apiGet<MileageLogResult>('/freelancer/mileage'); } catch { return { data: [], total_distance: 0, total_deduction: 0, unit: 'km' }; }
}

export default async function MileagePage() {
  const mileageData = await getMileageLogs();
  return (
    <div className="p-6 max-w-screen-lg mx-auto">
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-foreground">Mileage Tracker</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Log business trips and track your CRA / IRS standard mileage deduction.</p>
      </div>
      <MileageLogManager initialData={mileageData} />
    </div>
  );
}
