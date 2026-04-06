import { notFound } from 'next/navigation';
import { getClientDetails } from './actions';
import { ClientContextBanner } from '@/components/client-context-banner';
import { ClientOverviewCard } from '@/components/client-overview-card';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowLeftRight, TrendingUp } from 'lucide-react';

interface PageProps {
  params: { id: string };
}

export default async function ClientDashboardPage({ params }: PageProps) {
  const client = await getClientDetails(params.id);
  if (!client) notFound();

  return (
    <div className="space-y-6">
      <ClientContextBanner clientName={client.businessName} businessId={params.id} />
      <ClientOverviewCard client={client} />

      {/* Phase 11 placeholder sections */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="border-dashed">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2 text-muted-foreground">
              <ArrowLeftRight className="w-4 h-4" />
              Transactions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Badge variant="outline" className="mb-3 text-xs">Coming in Phase 11</Badge>
              <p className="text-sm text-muted-foreground">
                Full transaction review and classification will be available when cross-business context switching is implemented.
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-dashed">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2 text-muted-foreground">
              <TrendingUp className="w-4 h-4" />
              Reports
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Badge variant="outline" className="mb-3 text-xs">Coming in Phase 11</Badge>
              <p className="text-sm text-muted-foreground">
                Income Statement, Balance Sheet, and HST reports will be accessible here once cross-business access is enabled.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
