import { apiGet } from '@/lib/api';
import { Account, Business } from '@/types';
import { ImportUploadZone } from '@/components/import-upload-zone';
import { listImportBatches } from './actions';
import Link from 'next/link';

async function getAccounts(): Promise<Account[]> {
  try {
    const all = await apiGet<Account[]>('/accounts');
    // Filter to asset + liability (bank accounts and credit cards)
    return all.filter((a: any) =>
      a.account_type === 'asset' || a.account_type === 'liability',
    );
  } catch {
    return [];
  }
}

async function getMyBusiness(): Promise<Business | null> {
  try { return await apiGet<Business>('/businesses/me'); }
  catch { return null; }
}

async function getBillingPlan(): Promise<string | null> {
  try {
    const res = await apiGet<{ plan_name?: string; status?: string }>('/billing/status');
    return (res as any)?.plan_name ?? null;
  } catch {
    return null;
  }
}

export default async function ImportPage() {
  const [accounts, business, planResult, batchesResult] = await Promise.all([
    getAccounts(),
    getMyBusiness(),
    getBillingPlan(),
    listImportBatches(1),
  ]);

  const isStarter = planResult === 'starter';

  if (isStarter) {
    return (
      <div className="p-8 max-w-xl mx-auto text-center space-y-4">
        <div className="w-14 h-14 rounded-full bg-accent-teal-muted flex items-center justify-center mx-auto">
          <svg className="w-7 h-7 text-accent-teal" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
          </svg>
        </div>
        <h1 className="text-xl font-semibold text-foreground">CSV & PDF Import</h1>
        <p className="text-sm text-muted-foreground leading-relaxed">
          File import is available on the Pro, Freelancer, and Accountant plans.
          Upgrade to import bank statements and credit card exports directly into Tempo Books.
        </p>
        <Link
          href="/settings/billing"
          className="inline-block mt-2 px-5 py-2.5 rounded-lg text-sm font-semibold text-white"
          style={{ backgroundColor: 'var(--accent-teal)' }}
        >
          Upgrade plan
        </Link>
      </div>
    );
  }

  const batches = batchesResult.success ? (batchesResult.data?.data ?? []) : [];
  const totalBatches = batchesResult.data?.total ?? 0;

  return (
    <div className="p-6 space-y-8 max-w-4xl">
      {/* Header */}
      <div>
        <h1 className="text-xl font-semibold text-foreground">Import Transactions</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Upload a CSV or PDF bank statement to import transactions into your inbox.
        </p>
      </div>

      {/* Upload zone */}
      <ImportUploadZone accounts={accounts} />

      {/* Batch history */}
      {batches.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            Import History
          </h2>
          <div className="rounded-xl border border-border overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-[var(--bg-table-header,hsl(var(--muted)))] text-muted-foreground uppercase text-xs tracking-wide">
                  <th className="text-left px-4 py-3 font-medium">File</th>
                  <th className="text-left px-4 py-3 font-medium">Type</th>
                  <th className="text-left px-4 py-3 font-medium">Status</th>
                  <th className="text-right px-4 py-3 font-medium">Imported</th>
                  <th className="text-right px-4 py-3 font-medium">Duplicates</th>
                  <th className="text-right px-4 py-3 font-medium">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {batches.map((batch, idx) => (
                  <tr
                    key={batch.id}
                    className={idx % 2 === 0 ? 'bg-card' : 'bg-background'}
                  >
                    <td className="px-4 py-3 font-medium text-foreground max-w-[200px] truncate">
                      {batch.file_name}
                    </td>
                    <td className="px-4 py-3">
                      <span className="uppercase text-xs font-semibold px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                        {batch.file_type}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={batch.status} />
                    </td>
                    <td className="px-4 py-3 text-right text-foreground">
                      {batch.status === 'completed' ? batch.processed_rows : '—'}
                    </td>
                    <td className="px-4 py-3 text-right text-muted-foreground">
                      {batch.status === 'completed' ? batch.duplicate_rows : '—'}
                    </td>
                    <td className="px-4 py-3 text-right text-muted-foreground">
                      {new Date(batch.created_at).toLocaleDateString('en-CA')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {totalBatches > 10 && (
            <p className="text-xs text-muted-foreground text-right">
              Showing 10 of {totalBatches} imports
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { label: string; color: string }> = {
    pending:    { label: 'Queued',     color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' },
    processing: { label: 'Parsing',    color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
    completed:  { label: 'Complete',   color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' },
    failed:     { label: 'Failed',     color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' },
  };
  const { label, color } = config[status] ?? { label: status, color: 'bg-muted text-muted-foreground' };
  return (
    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${color}`}>
      {label}
    </span>
  );
}
