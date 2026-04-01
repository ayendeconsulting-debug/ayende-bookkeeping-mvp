import { auth } from '@clerk/nextjs/server';

export default async function DashboardPage() {
  const { userId, orgId } = await auth();

  return (
    <div className="p-6">
      {/* Page header */}
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-gray-900">Dashboard</h1>
        <p className="text-sm text-gray-500 mt-1">
          Overview of your business finances
        </p>
      </div>

      {/* Placeholder metric cards */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Total Revenue', value: '—', sub: 'No data yet' },
          { label: 'Total Expenses', value: '—', sub: 'No data yet' },
          { label: 'Net Income', value: '—', sub: 'No data yet' },
          { label: 'Pending Review', value: '—', sub: 'Connect a bank to start' },
        ].map((card) => (
          <div
            key={card.label}
            className="bg-white border border-gray-200 rounded-xl p-4"
          >
            <div className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">
              {card.label}
            </div>
            <div className="text-2xl font-semibold text-gray-900">{card.value}</div>
            <div className="text-xs text-gray-400 mt-1.5">{card.sub}</div>
          </div>
        ))}
      </div>

      {/* Scaffold status panel */}
      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-2 h-2 rounded-full bg-[#0F6E56]" />
          <h2 className="text-sm font-semibold text-gray-900">
            Phase 4 scaffold — Step 2 complete
          </h2>
        </div>
        <div className="space-y-2 text-sm text-gray-600">
          <div className="flex items-center gap-2">
            <span className="text-[#0F6E56]">✓</span>
            <span>Next.js 14 + TypeScript running</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[#0F6E56]">✓</span>
            <span>Tailwind v4 + ShadCN/UI configured</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[#0F6E56]">✓</span>
            <span>Clerk authenticated — user: {userId?.slice(0, 16)}...</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[#0F6E56]">✓</span>
            <span>Organization context: {orgId ?? 'No org selected — create one in Clerk'}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[#0F6E56]">✓</span>
            <span>API client ready at lib/api.ts</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[#0F6E56]">✓</span>
            <span>Sidebar navigation wired</span>
          </div>
        </div>
        <div className="mt-4 pt-4 border-t border-gray-100 text-xs text-gray-400">
          Next: Step 3 — Tailwind brand theme, then Steps 4-7 (Clerk org setup, dashboard screens, transaction inbox)
        </div>
      </div>
    </div>
  );
}
