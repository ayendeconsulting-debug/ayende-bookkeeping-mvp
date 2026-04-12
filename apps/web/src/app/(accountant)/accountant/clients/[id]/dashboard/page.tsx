import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getClientOverview, getClientDetails } from './actions';
import { ClientSummaryCards } from '@/components/client-summary-cards';
import { ClientDashboardTabs } from '@/components/client-dashboard-tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, ExternalLink, Building2 } from 'lucide-react';

interface Props {
  params: { id: string };
}

export default async function ClientDashboardPage({ params }: Props) {
  const { id: businessId } = params;

  const [overview, client] = await Promise.all([
    getClientOverview(businessId),
    getClientDetails(businessId),
  ]);

  if (!overview || !client) notFound();

  const currency = client.country === 'CA' ? 'CAD' : 'USD';

  return (
    <div className="space-y-6 pb-10">

      {/* ── Top navigation bar ─────────────────────────────────────────────── */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <Link
          href="/accountant/clients"
          className="flex items-center gap-1.5 text-sm text-[#888070] dark:text-[#7a7268] hover:text-[#1a1814] dark:hover:text-[#f0ede8] transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Clients
        </Link>

        <Button asChild size="sm" className="bg-[#0F6E56] hover:bg-[#0d5e49] text-white">
          <Link href="/transactions">
            <ExternalLink className="w-3.5 h-3.5 mr-1.5" />
            Open Books
          </Link>
        </Button>
      </div>

      {/* ── Client header ──────────────────────────────────────────────────── */}
      <div className="bg-white dark:bg-[#242220] rounded-2xl border border-[#e5e1d8] dark:border-[#3a3730] p-5 shadow-sm">
        <div className="flex items-start gap-4 flex-wrap">
          {/* Avatar */}
          <div className="w-12 h-12 rounded-xl bg-[#0F6E56] flex items-center justify-center flex-shrink-0 shadow-sm">
            <Building2 className="w-6 h-6 text-white" />
          </div>

          {/* Name + meta */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-xl font-bold text-[#1a1814] dark:text-[#f0ede8] truncate">
                {overview.businessName}
              </h1>
              <Badge
                variant="outline"
                className={
                  client.status === 'active'
                    ? 'text-emerald-700 border-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800 text-xs'
                    : 'text-[#888070] border-[#c8c0b0] text-xs'
                }
              >
                {client.status === 'active' ? 'Active' : 'Archived'}
              </Badge>
            </div>

            <div className="flex items-center gap-3 mt-1.5 flex-wrap">
              <span className="text-sm text-[#888070] dark:text-[#7a7268]">
                {client.country === 'CA' ? '🇨🇦 Canada' : '🇺🇸 United States'}
                {client.province_code ? ` · ${client.province_code}` : ''}
              </span>
              {client.hst_registration_number && (
                <span className="text-sm text-[#888070] dark:text-[#7a7268]">
                  HST: {client.hst_registration_number}
                </span>
              )}
              <span className="text-sm text-[#888070] dark:text-[#7a7268]">
                {currency}
              </span>
              <span className="text-sm text-[#888070] dark:text-[#7a7268]">
                Client since{' '}
                {new Date(client.added_at).toLocaleDateString('en-CA', {
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric',
                })}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ── KPI summary cards ──────────────────────────────────────────────── */}
      <ClientSummaryCards overview={overview} currency={currency} />

      {/* ── Tabbed content ─────────────────────────────────────────────────── */}
      <ClientDashboardTabs overview={overview} client={client} />
    </div>
  );
}
