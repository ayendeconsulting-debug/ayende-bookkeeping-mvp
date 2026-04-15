'use client';

import { useState, useTransition, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ShieldCheck, Activity, Building2, CheckCircle2, XCircle } from 'lucide-react';
import { toastSuccess, toastError } from '@/lib/toast';
import {
  getAccessRequests, respondToAccessRequest, getAccountantActivity,
  AccessRequest, AuditLogEntry,
} from '@/app/(app)/settings/actions';

function statusBadge(status: AccessRequest['status']) {
  const map: Record<string, { label: string; className: string }> = {
    pending:  { label: 'Pending',  className: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-800' },
    approved: { label: 'Approved', className: 'bg-primary-light text-primary border-primary/30 dark:bg-primary/10 dark:text-emerald-400 dark:border-primary/30' },
    denied:   { label: 'Denied',   className: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950/30 dark:text-red-400 dark:border-red-800' },
    expired:  { label: 'Expired',  className: 'bg-muted text-muted-foreground border-border' },
  };
  const { label, className } = map[status] ?? map.expired;
  return <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${className}`}>{label}</span>;
}

function formatDate(iso: string | null) {
  if (!iso) return '–';
  return new Date(iso).toLocaleDateString('en-CA', { year: 'numeric', month: 'short', day: 'numeric' });
}

export function AccountantAccessSection() {
  const [requests,       setRequests]       = useState<AccessRequest[]>([]);
  const [activity,       setActivity]       = useState<AuditLogEntry[]>([]);
  const [activeView,     setActiveView]     = useState<'requests' | 'activity'>('requests');
  const [responding,     startResponding]   = useTransition();
  const [respondingId,   setRespondingId]   = useState<string | null>(null);
  const [loaded,         setLoaded]         = useState(false);

  useEffect(() => {
    Promise.all([getAccessRequests(), getAccountantActivity()]).then(([reqs, act]) => {
      setRequests(reqs); setActivity(act.data); setLoaded(true);
    });
  }, []);

  function handleRespond(requestId: string, decision: 'approved' | 'denied') {
    setRespondingId(requestId);
    startResponding(async () => {
      const result = await respondToAccessRequest(requestId, decision);
      if (result.success) {
        toastSuccess(
          decision === 'approved' ? 'Access approved' : 'Access denied',
          decision === 'approved' ? 'The accountant now has edit access for 90 days.' : 'The access request has been denied.',
        );
        const updated = await getAccessRequests(); setRequests(updated);
      } else {
        toastError('Could not respond', result.error ?? 'Please try again.');
      }
      setRespondingId(null);
    });
  }

  const pendingRequests = requests.filter((r) => r.status === 'pending');
  const otherRequests   = requests.filter((r) => r.status !== 'pending');

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between pb-4">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-muted-foreground" />
          <CardTitle>Accountant Access</CardTitle>
        </div>
        {pendingRequests.length > 0 && (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-800">
            {pendingRequests.length} pending
          </span>
        )}
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="flex gap-1 border-b">
          {([
            { id: 'requests' as const, label: 'Access Requests', icon: ShieldCheck },
            { id: 'activity' as const, label: 'Activity Log',    icon: Activity },
          ] as const).map((tab) => {
            const Icon = tab.icon; const isActive = activeView === tab.id;
            return (
              <button key={tab.id} onClick={() => setActiveView(tab.id)}
                className={['flex items-center gap-1.5 px-3 py-2 text-sm font-medium border-b-2 -mb-px transition-colors',
                  isActive ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground',
                ].join(' ')}>
                <Icon className="w-3.5 h-3.5" />{tab.label}
              </button>
            );
          })}
        </div>

        {!loaded && <p className="text-sm text-muted-foreground py-4 text-center">Loading…</p>}

        {loaded && activeView === 'requests' && (
          <div className="flex flex-col gap-3">
            {requests.length === 0 && (
              <div className="flex flex-col items-center justify-center py-8 text-center border-2 border-dashed rounded-lg">
                <ShieldCheck className="w-7 h-7 text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">No accountant access requests yet.</p>
              </div>
            )}
            {pendingRequests.length > 0 && (
              <div className="flex flex-col gap-2">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Pending — action required</p>
                {pendingRequests.map((req) => (
                  <div key={req.id} className="rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-950/20 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-2 min-w-0">
                        <Building2 className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">{req.firm?.name ?? 'Accountant Firm'}</p>
                          {req.access_note && <p className="text-xs text-muted-foreground mt-0.5">{req.access_note}</p>}
                          <p className="text-xs text-muted-foreground mt-1">Requested {formatDate(req.requested_at)}</p>
                        </div>
                      </div>
                      {statusBadge(req.status)}
                    </div>
                    <div className="flex gap-2 mt-3">
                      <Button size="sm" disabled={responding && respondingId === req.id} onClick={() => handleRespond(req.id, 'approved')}>
                        <CheckCircle2 className="w-3.5 h-3.5 mr-1" />Approve (90 days)
                      </Button>
                      <Button size="sm" variant="outline" className="text-destructive border-destructive/30 hover:bg-destructive/10"
                        disabled={responding && respondingId === req.id} onClick={() => handleRespond(req.id, 'denied')}>
                        <XCircle className="w-3.5 h-3.5 mr-1" />Deny
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
            {otherRequests.length > 0 && (
              <div className="flex flex-col gap-2">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mt-2">Previous requests</p>
                {otherRequests.map((req) => (
                  <div key={req.id} className="rounded-lg border p-3 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 min-w-0">
                      <Building2 className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{req.firm?.name ?? 'Accountant Firm'}</p>
                        <p className="text-xs text-muted-foreground">
                          {req.status === 'approved' && req.expires_at ? `Active until ${formatDate(req.expires_at)}` : formatDate(req.responded_at ?? req.requested_at)}
                        </p>
                      </div>
                    </div>
                    {statusBadge(req.status)}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {loaded && activeView === 'activity' && (
          <div className="flex flex-col gap-2">
            {activity.length === 0 && (
              <div className="flex flex-col items-center justify-center py-8 text-center border-2 border-dashed rounded-lg">
                <Activity className="w-7 h-7 text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">No accountant activity recorded yet.</p>
              </div>
            )}
            {activity.length > 0 && (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left pb-2 text-muted-foreground font-medium">Date</th>
                      <th className="text-left pb-2 text-muted-foreground font-medium">Accountant</th>
                      <th className="text-left pb-2 text-muted-foreground font-medium">Action</th>
                      <th className="text-left pb-2 text-muted-foreground font-medium">Entity</th>
                    </tr>
                  </thead>
                  <tbody>
                    {activity.map((entry) => (
                      <tr key={entry.id} className="border-b last:border-0">
                        <td className="py-2 pr-3 text-muted-foreground whitespace-nowrap">{formatDate(entry.performed_at)}</td>
                        <td className="py-2 pr-3 font-medium">{entry.actor_name}</td>
                        <td className="py-2 pr-3 font-mono text-xs text-muted-foreground">{entry.action}</td>
                        <td className="py-2 text-muted-foreground">{entry.entity_type}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
