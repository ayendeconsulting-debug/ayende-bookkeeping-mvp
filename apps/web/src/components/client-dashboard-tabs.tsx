'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ClientQuickActions } from '@/components/client-quick-actions';
import { ShieldCheck, Activity, LayoutDashboard } from 'lucide-react';

type Tab = 'overview' | 'access' | 'activity';

interface ClientDashboardTabsProps {
  businessId: string;
}

export function ClientDashboardTabs({ businessId }: ClientDashboardTabsProps) {
  const [activeTab, setActiveTab] = useState<Tab>('overview');

  const tabs: { id: Tab; label: string; icon: React.ElementType }[] = [
    { id: 'overview', label: 'Quick Actions', icon: LayoutDashboard },
    { id: 'access',   label: 'Edit Access',   icon: ShieldCheck },
    { id: 'activity', label: 'Activity Log',  icon: Activity },
  ];

  return (
    <div>
      <div className="flex gap-1 border-b mb-4">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={[
                'flex items-center gap-1.5 px-3 py-2 text-sm font-medium border-b-2 -mb-px transition-colors',
                isActive
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border',
              ].join(' ')}
            >
              <Icon className="w-3.5 h-3.5" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {activeTab === 'overview' && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <ClientQuickActions businessId={businessId} contextReady={false} />
            <p className="text-xs text-muted-foreground mt-3">
              Full cross-business navigation (transactions, reports, HST) will be enabled in the next update.
            </p>
          </CardContent>
        </Card>
      )}

      {activeTab === 'access' && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium">Edit Access</CardTitle>
              <Badge variant="outline" className="text-xs">No Access</Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              You currently have read-only access to this client's books. Request edit access to classify transactions, post journal entries, and run year-end adjustments on their behalf.
            </p>
            <div className="flex flex-col items-center justify-center py-6 text-center border-2 border-dashed rounded-lg">
              <ShieldCheck className="w-8 h-8 text-muted-foreground mb-3" />
              <Badge variant="outline" className="mb-2 text-xs">Coming in Step 8</Badge>
              <p className="text-sm text-muted-foreground max-w-sm">
                The edit access request flow including client approval, time-bound access, and automatic expiry will be implemented in the next step.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {activeTab === 'activity' && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Activity Log</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center justify-center py-8 text-center border-2 border-dashed rounded-lg">
              <Activity className="w-8 h-8 text-muted-foreground mb-3" />
              <Badge variant="outline" className="mb-2 text-xs">Coming in Step 8</Badge>
              <p className="text-sm text-muted-foreground max-w-sm">
                A full audit log of all changes made by your firm on this client's books will be visible here once edit access is implemented.
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
