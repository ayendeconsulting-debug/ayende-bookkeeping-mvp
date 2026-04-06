import { notFound } from 'next/navigation';
import { getClientDetails, getClientOverview } from './actions';
import { ClientContextBanner } from '@/components/client-context-banner';
import { ClientOverviewCard } from '@/components/client-overview-card';
import { ClientSummaryCards } from '@/components/client-summary-cards';
import { ClientDashboardTabs } from '@/components/client-dashboard-tabs';

interface PageProps {
  params: { id: string };
}

export default async function ClientDashboardPage({ params }: PageProps) {
  const [client, overview] = await Promise.all([
    getClientDetails(params.id),
    getClientOverview(params.id),
  ]);

  if (!client) notFound();

  return (
    <div className="space-y-5 p-4 md:p-6 max-w-screen-xl mx-auto">
      <ClientContextBanner clientName={client.businessName} businessId={params.id} />
      <ClientOverviewCard client={client} />
      {overview ? (
        <ClientSummaryCards overview={overview} />
      ) : (
        <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
          Could not load financial summary. The client may not have any posted transactions yet.
        </div>
      )}
      <ClientDashboardTabs businessId={params.id} />
    </div>
  );
}
