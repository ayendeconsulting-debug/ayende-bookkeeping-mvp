import { apiGet } from '@/lib/api';
import { TaxEstimateResult } from '@/types';
import { TaxEstimateWidget } from '@/components/tax-estimate-widget';

async function getTaxEstimate(): Promise<TaxEstimateResult | null> {
  try { return await apiGet<TaxEstimateResult>('/freelancer/tax-estimate'); } catch { return null; }
}

export default async function TaxEstimatePage() {
  const estimate = await getTaxEstimate();
  return (
    <div className="p-6 max-w-screen-lg mx-auto">
      <div className="mb-6 pl-4" style={{ borderLeft: '3px solid #d97706' }}>
        <h1 className="text-xl font-semibold text-foreground">Tax Estimate</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Quarterly tax estimates based on your posted income and expenses.</p>
      </div>
      <TaxEstimateWidget estimate={estimate} />
    </div>
  );
}
