import { getClients, getFirmAiUsage } from './actions';
import { ClientListTable } from '@/components/client-list-table';
import { FirmAiUsageWidget } from '@/components/firm-ai-usage-widget';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { UserPlus } from 'lucide-react';

export default async function AccountantClientsPage() {
  const [clients, firmUsage] = await Promise.all([
    getClients(),
    getFirmAiUsage(),
  ]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">My Clients</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {clients.filter((c) => c.status === 'active').length} active{' '}
            {clients.filter((c) => c.status === 'active').length === 1 ? 'client' : 'clients'}
          </p>
        </div>
        <Button asChild>
          <Link href="/accountant/clients/new">
            <UserPlus className="w-4 h-4 mr-2" />
            Add Client
          </Link>
        </Button>
      </div>

      {/* Firm AI Usage Widget — only shown for Accountant plan */}
      {firmUsage && <FirmAiUsageWidget usage={firmUsage} />}

      {/* Table */}
      <ClientListTable clients={clients} />
    </div>
  );
}
