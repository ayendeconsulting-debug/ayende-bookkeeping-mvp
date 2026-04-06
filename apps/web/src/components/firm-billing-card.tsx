'use client';

import { useState } from 'react';
import { getPortalUrl, BillingSummary } from '@/app/(accountant)/accountant/billing/actions';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CreditCard, Users, Building2, Loader2, ExternalLink } from 'lucide-react';

interface FirmBillingCardProps {
  summary: BillingSummary | null;
}

function formatCAD(amount: number): string {
  return '$' + amount.toLocaleString('en-CA', { minimumFractionDigits: 0 }) + ' CAD/mo';
}

export function FirmBillingCard({ summary }: FirmBillingCardProps) {
  const [loadingPortal, setLoadingPortal] = useState(false);

  async function handleManageSubscription() {
    setLoadingPortal(true);
    const result = await getPortalUrl();
    setLoadingPortal(false);
    if (result?.url) {
      window.location.href = result.url;
    }
  }

  return (
    <div className="space-y-4">
      {/* Plan overview */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <CreditCard className="w-4 h-4" />
              Accountant Plan
            </CardTitle>
            <Badge variant="outline" className="text-primary border-primary/30 bg-primary/5 text-xs">
              Active
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {summary ? (
            <>
              {/* Usage breakdown */}
              <div className="space-y-3">
                <div className="flex items-center justify-between py-2 border-b border-border">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Building2 className="w-4 h-4" />
                    Base firm fee (includes 5 clients, 3 seats)
                  </div>
                  <span className="text-sm font-medium text-foreground">{formatCAD(summary.baseMonthly)}</span>
                </div>

                <div className="flex items-center justify-between py-2 border-b border-border">
                  <div className="text-sm text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <Building2 className="w-4 h-4" />
                      Active clients
                    </div>
                    <div className="text-xs mt-0.5 ml-6">
                      {summary.activeClients} total — {summary.billableClients} billable × $15/mo
                    </div>
                  </div>
                  <span className="text-sm font-medium text-foreground">{formatCAD(summary.clientsMonthly)}</span>
                </div>

                <div className="flex items-center justify-between py-2 border-b border-border">
                  <div className="text-sm text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <Users className="w-4 h-4" />
                      Staff seats
                    </div>
                    <div className="text-xs mt-0.5 ml-6">
                      {summary.staffCount} total — {summary.billableSeats} billable × $25/mo
                    </div>
                  </div>
                  <span className="text-sm font-medium text-foreground">{formatCAD(summary.seatsMonthly)}</span>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <span className="text-sm font-semibold text-foreground">Estimated monthly total</span>
                  <span className="text-lg font-bold text-foreground">{formatCAD(summary.estimatedMonthly)}</span>
                </div>
              </div>

              <p className="text-xs text-muted-foreground">
                Metered usage (additional clients and seats) is reported at the end of each billing period.
                Estimates may differ from your final invoice.
              </p>
            </>
          ) : (
            <div className="py-6 text-center">
              <p className="text-sm text-muted-foreground">Could not load billing summary. Please try again later.</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Manage subscription */}
      <Card>
        <CardContent className="pt-5 pb-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-foreground">Manage Subscription</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Update payment method, download invoices, or cancel your plan.
              </p>
            </div>
            <Button
              variant="outline"
              onClick={handleManageSubscription}
              disabled={loadingPortal}
            >
              {loadingPortal
                ? <Loader2 className="w-4 h-4 animate-spin mr-2" />
                : <ExternalLink className="w-4 h-4 mr-2" />}
              Stripe Portal
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
