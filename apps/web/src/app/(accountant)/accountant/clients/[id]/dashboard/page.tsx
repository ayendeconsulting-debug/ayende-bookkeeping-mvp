import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getClientOverview, getClientDetails } from './actions';
import { ClientSummaryCards } from '@/components/client-summary-cards';
import { ClientDashboardTabs } from '@/components/client-dashboard-tabs';
import { ClientContextSetter } from '@/components/client-context-setter';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, ExternalLink, Building2 } from 'lucide-react';

interface Props {
  params: Promise<{ id: string }>;
}

export default async function ClientDashboardPage({ params }: Props) {
  const { id: businessId } = await params;

  const [overview, client] = await Promise.all([
    getClientOverview(businessId),
    getClientDetails(businessId),
  ]);

  if (!overview || !client) notFound();

  const currency = client.country === 'CA' ? 'CAD' : 'USD';

  return (
    <div className="space-y-6 pb-10">

      <ClientContextSetter
        businessId={businessId}
        businessName={overview.businessName}
      />

      {/* Top navigation bar */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <Link
          href="/accountant/clients"
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Clients
        </Link>

        <Button asChild size="sm">
          <Link href="/transactions">
            <ExternalLink className="w-3.5 h-3.5 mr-1.5" />
            Open Books
          </Link>
        </Button>
      </div>

      {/* Client header */}
      <div className="bg-card rounded-2xl border border-border p-5 shadow-sm">
        <div className="flex items-start gap-4 flex-wrap">
          <div className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center flex-shrink-0 shadow-sm">
            <Building2 className="w-6 h-6 text-primary-foreground" />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-xl font-bold text-foreground truncate">
                {overview.businessName}
              </h1>
              <Badge
                variant="outline"
                className={
                  client.status === 'active'
                    ? 'text-emerald-700 border-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800 text-xs'
                    : 'text-muted-foreground border-border text-xs'
                }
              >
                {client.status === 'active' ? 'Active' : 'Archived'}
              </Badge>
            </div>

            <div className="flex items-center gap-3 mt-1.5 flex-wrap">
              <span className="text-sm text-muted-foreground">
                {client.country === 'CA' ? '🇨🇦 Canada' : '🇺🇸 United States'}
                {client.province_code ? ` · ${client.province_code}` : ''}
              </span>
              {client.hst_registration_number && (
                <span className="text-sm text-muted-foreground">
                  HST: {client.hst_registration_number}
                </span>
              )}
              <span className="text-sm text-muted-foreground">{currency}</span>
              <span className="text-sm text-muted-foreground">
                Client since{' '}
                {new Date(client.added_at).toLocaleDateString('en-CA', {
                  year: 'numeric', month: 'short', day: 'numeric',
                })}
              </span>
            </div>
          </div>
        </div>
      </div>

      <ClientSummaryCards overview={overview} currency={currency} />
      <ClientDashboardTabs overview={overview} client={client} />
    </div>
  );
}
