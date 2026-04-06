import { ClientListItem } from '@/app/(accountant)/accountant/clients/actions';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Building2, MapPin, Receipt, Calendar } from 'lucide-react';

interface ClientOverviewCardProps {
  client: ClientListItem;
}

export function ClientOverviewCard({ client }: ClientOverviewCardProps) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <Building2 className="w-5 h-5 text-muted-foreground" />
            {client.businessName}
          </CardTitle>
          <Badge
            variant="outline"
            className={
              client.status === 'active'
                ? 'text-green-700 border-green-300 bg-green-50 dark:bg-green-950 dark:text-green-400 dark:border-green-800'
                : 'text-muted-foreground'
            }
          >
            {client.status === 'active' ? 'Active' : 'Archived'}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Country */}
          <div className="flex items-start gap-3">
            <MapPin className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
            <div>
              <dt className="text-xs text-muted-foreground uppercase tracking-wide mb-0.5">Country</dt>
              <dd className="text-sm font-medium text-foreground">
                {client.country === 'CA' ? '🇨🇦 Canada' : '🇺🇸 United States'}
              </dd>
            </div>
          </div>

          {/* Province (CA only) */}
          {client.country === 'CA' && (
            <div className="flex items-start gap-3">
              <MapPin className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
              <div>
                <dt className="text-xs text-muted-foreground uppercase tracking-wide mb-0.5">Province</dt>
                <dd className="text-sm font-medium text-foreground">
                  {client.province_code ?? '—'}
                </dd>
              </div>
            </div>
          )}

          {/* HST status (CA only) */}
          {client.country === 'CA' && (
            <div className="flex items-start gap-3">
              <Receipt className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
              <div>
                <dt className="text-xs text-muted-foreground uppercase tracking-wide mb-0.5">HST Registration</dt>
                <dd className="text-sm font-medium text-foreground">
                  {client.hst_registration_number ? (
                    <span className="text-green-700 dark:text-green-400">{client.hst_registration_number}</span>
                  ) : (
                    <span className="text-amber-600 dark:text-amber-400">Not registered</span>
                  )}
                </dd>
              </div>
            </div>
          )}

          {/* Added date */}
          <div className="flex items-start gap-3">
            <Calendar className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
            <div>
              <dt className="text-xs text-muted-foreground uppercase tracking-wide mb-0.5">Client Since</dt>
              <dd className="text-sm font-medium text-foreground">
                {new Date(client.added_at).toLocaleDateString('en-CA', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </dd>
            </div>
          </div>
        </dl>
      </CardContent>
    </Card>
  );
}
