import { apiGet } from '@/lib/api';
import { NetWorthResult } from '@/types';
import { NetWorthTracker } from '@/components/net-worth-tracker';

async function getNetWorth(): Promise<NetWorthResult | null> {
  try {
    return await apiGet<NetWorthResult>('/personal/net-worth');
  } catch {
    return null;
  }
}

export default async function NetWorthPage() {
  const netWorth = await getNetWorth();

  return (
    <div className="p-6 max-w-screen-lg mx-auto">
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-gray-900">Net Worth</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Your total assets minus liabilities across all connected accounts.
        </p>
      </div>
      <NetWorthTracker netWorth={netWorth} />
    </div>
  );
}
