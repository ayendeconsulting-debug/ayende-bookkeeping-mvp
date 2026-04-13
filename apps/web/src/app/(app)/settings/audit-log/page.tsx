import { Suspense } from 'react';
import { clerkClient } from '@clerk/nextjs/server';
import { apiGet } from '@/lib/api';

interface AuditLogEntry {
  id: string;
  user_id: string;
  action: string;
  entity_type: string;
  entity_id: string;
  old_values?: Record<string, any> | null;
  new_values?: Record<string, any> | null;
  created_at: string;
}

async function getAuditLogs(): Promise<{ data: AuditLogEntry[]; total: number }> {
  try {
    return await apiGet('/classification/audit-logs?limit=100&offset=0');
  } catch {
    return { data: [], total: 0 };
  }
}

async function resolveUserNames(userIds: string[]): Promise<Record<string, string>> {
  const map: Record<string, string> = {};
  const client = await clerkClient();
  await Promise.all(
    userIds.map(async (id) => {
      if (!id || id === 'system') { map[id] = 'System'; return; }
      try {
        const user = await client.users.getUser(id);
        const name = [user.firstName, user.lastName].filter(Boolean).join(' ');
        map[id] = name || user.emailAddresses?.[0]?.emailAddress || id.slice(0, 16);
      } catch {
        map[id] = id.slice(0, 16) + '…';
      }
    }),
  );
  return map;
}

function ActionBadge({ action }: { action: string }) {
  const cfg: Record<string, string> = {
    classify:      'bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400',
    post:          'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400',
    unclassify:    'bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400',
    bulk_classify: 'bg-purple-50 text-purple-700 dark:bg-purple-900/20 dark:text-purple-400',
    bulk_post:     'bg-teal-50 text-teal-700 dark:bg-teal-900/20 dark:text-teal-400',
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${cfg[action] ?? 'bg-gray-100 text-gray-600 dark:bg-[#2a2720] dark:text-[#a09888]'}`}>
      {action.replace(/_/g, ' ')}
    </span>
  );
}

export default async function AuditLogPage() {
  const { data: logs, total } = await getAuditLogs();

  const uniqueUserIds = [...new Set(logs.map((l) => l.user_id))];
  const userMap = await resolveUserNames(uniqueUserIds);

  return (
    <Suspense fallback={<div className="p-8 text-center text-sm text-gray-500">Loading...</div>}>
      <div className="p-6 max-w-screen-lg mx-auto">
        <div className="mb-6">
          <h1 className="text-xl font-semibold text-gray-900 dark:text-[#f0ede8]">Audit Log</h1>
          <p className="text-sm text-gray-500 dark:text-[#a09888] mt-0.5">
            A record of all classify, post, and unclassify actions in this business.
            {total > 0 && <span className="ml-1">{total} entries total.</span>}
          </p>
        </div>

        {logs.length === 0 ? (
          <div className="rounded-xl border border-gray-100 dark:border-[#3a3730] bg-white dark:bg-[#1e1c18] flex flex-col items-center justify-center py-16 text-center">
            <p className="text-sm font-medium text-gray-900 dark:text-[#f0ede8] mb-1">No audit entries yet</p>
            <p className="text-sm text-gray-400 dark:text-[#7a7060]">Actions will appear here once transactions are classified or posted.</p>
          </div>
        ) : (
          <div className="rounded-xl border border-gray-100 dark:border-[#3a3730] bg-white dark:bg-[#1e1c18] overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 dark:border-[#2a2720]">
                  <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-[#7a7060]">Time</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-[#7a7060]">Action</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-[#7a7060]">Entity</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-[#7a7060]">User</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-[#2a2720]">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-gray-50 dark:hover:bg-[#252320] transition-colors">
                    <td className="px-4 py-3 text-xs text-gray-400 dark:text-[#7a7060] whitespace-nowrap">
                      {new Date(log.created_at).toLocaleString('en-CA', {
                        month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
                      })}
                    </td>
                    <td className="px-4 py-3">
                      <ActionBadge action={log.action} />
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-gray-700 dark:text-[#c8c0b0]">{log.entity_type}</span>
                      <span className="ml-2 font-mono text-xs text-gray-400 dark:text-[#7a7060]">{log.entity_id.slice(0, 8)}&hellip;</span>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-700 dark:text-[#c8c0b0]">
                      {userMap[log.user_id] ?? log.user_id.slice(0, 16) + '…'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </Suspense>
  );
}
