import { apiGet } from '@/lib/api';
import { Account } from '@/types';
import { listDraftJournalEntries, JournalEntry } from './actions';
import { JournalEntriesDraftList } from '@/components/manual-je-panel';

async function getAccounts(): Promise<Account[]> {
  try { return await apiGet<Account[]>('/accounts'); }
  catch { return []; }
}

export default async function JournalEntriesPage() {
  const [accounts, draftsResult] = await Promise.all([
    getAccounts(),
    listDraftJournalEntries(),
  ]);

  const drafts = draftsResult.success ? (draftsResult.data ?? []) : [];

  return (
    <div className="p-6 space-y-6 max-w-5xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Journal Entries</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Draft manual journal entries awaiting review and posting.
          </p>
        </div>
      </div>

      <JournalEntriesDraftList drafts={drafts} accounts={accounts} />
    </div>
  );
}
