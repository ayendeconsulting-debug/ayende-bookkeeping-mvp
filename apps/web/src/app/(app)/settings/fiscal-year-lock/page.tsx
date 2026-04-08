import { getFiscalYears } from './actions';
import { FiscalYearLockClient } from '@/components/fiscal-year-lock-client';

export default async function FiscalYearLockPage() {
  const result = await getFiscalYears();
  const fiscalYears = result.success ? (result.data ?? []) : [];

  return (
    <div className="max-w-3xl mx-auto px-6 py-8">
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-gray-900">Fiscal Year Lock</h1>
        <p className="text-sm text-gray-500 mt-1">
          Lock a completed fiscal year to prevent any further edits to posted journal entries.
          This action cannot be undone without contacting Tempo Books support.
        </p>
      </div>

      <FiscalYearLockClient initialFiscalYears={fiscalYears} />
    </div>
  );
}
