'use client';

import { useState, useTransition, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ClientQuickActions } from '@/components/client-quick-actions';
import { ClientContextSetter } from '@/components/client-context-setter';
import {
  ShieldCheck, Activity, LayoutDashboard,
  CheckCircle2, Clock, XCircle, RefreshCw,
} from 'lucide-react';
import { toastSuccess, toastError } from '@/lib/toast';
import {
  getAccessRequests,
  createAccessRequest,
  revokeAccessRequest,
  getClientAuditLog,
  AccessRequest,
} from '@/app/(accountant)/accountant/clients/[id]/dashboard/actions';

type Tab = 'overview' | 'access' | 'activity';

interface ClientDashboardTabsProps {
  businessId: string;
}

function formatDate(iso: string | null) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-CA', {
    year: 'numeric', month: 'short', day: 'numeric',
  });
}

function AccessStatusBadge({ status }: { status: AccessRequest['status'] }) {
  const map: Record<string, { label: string; className: string }> = {
    pending:  { label: 'Pending',  className: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-800' },
    approved: { label: 'Approved', className: 'bg-[#EDF7F2] text-[#0F6E56] border-[#C3E8D8] dark:bg-[#0F6E56]/10 dark:text-emerald-400 dark:border-[#0F6E56]/30' },
    denied:   { label: 'Denied',   className: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950/30 dark:text-red-400 dark:border-red-800' },
    expired:  { label: 'Expired',  className: 'bg-muted text-muted-foreground border-border' },
  };
  const { label, className } = map[status] ?? map.expired;
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${className}`}>
      {label}
    </span>
  );
}

function EditAccessTab({ businessId }: { businessId: string }) {
  const [requests, setRequests] = useState<AccessRequest[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [accessNote, setAccessNote] = useState('');
  const [durationType, setDurationType] = useState<'90_days' | 'year_end' | 'custom'>('90_days');
  const [customDate, setCustomDate] = useState('');
  const [submitting, startSubmitting] = useTransition();
  const [revoking, startRevoking] = useTransition();
  const [revokingId, setRevokingId] = useState<string | null>(null);

  useEffect(() => {
    getAccessRequests(businessId).then((reqs) => {
      setRequests(reqs);
      setLoaded(true);
    });
  }, [businessId]);

  const activeRequest = requests.find(
    (r) => r.status === 'approved' && r.expires_at && new Date(r.expires_at) > new Date(),
  );
  const pendingRequest = requests.find((r) => r.status === 'pending');
  const hasActiveAccess = !!activeRequest;
  const hasPendingRequest = !!pendingRequest;

  function handleSubmit() {
    if (!accessNote.trim()) { toastError('Access note required', 'Please explain why you need edit access.'); return; }
    if (durationType === 'custom' && !customDate) { toastError('Date required', 'Please select a custom expiry date.'); return; }
    startSubmitting(async () => {
      const result = await createAccessRequest({
        businessId,
        accessNote: accessNote.trim(),
        durationType,
        customExpiresAt: durationType === 'custom' ? customDate : undefined,
      });
      if (result.success) {
        toastSuccess('Request sent', 'The client will be notified to approve your request.');
        setShowForm(false);
        setAccessNote('');
        const updated = await getAccessRequests(businessId);
        setRequests(updated);
      } else {
        toastError('Request failed', result.error ?? 'Please try again.');
      }
    });
  }

  function handleRevoke(requestId: string) {
    setRevokingId(requestId);
    startRevoking(async () => {
      const result = await revokeAccessRequest(requestId);
      if (result.success) {
        toastSuccess('Access revoked', 'Edit access has been removed.');
        const updated = await getAccessRequests(businessId);
        setRequests(updated);
      } else {
        toastError('Could not revoke', result.error ?? 'Please try again.');
      }
      setRevokingId(null);
    });
  }

  if (!loaded) {
    return <p className="text-sm text-muted-foreground py-4 text-center">Loading…</p>;
  }

  return (
    <div className="space-y-4">
      {/* Current status */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium">Edit Access Status</CardTitle>
            <AccessStatusBadge
              status={hasActiveAccess ? 'approved' : hasPendingRequest ? 'pending' : 'expired'}
            />
          </div>
        </CardHeader>
        <CardContent className="pt-0 space-y-3">
          {hasActiveAccess && activeRequest && (
            <>
              <div className="flex items-center gap-2 text-sm text-[#0F6E56]">
                <CheckCircle2 className="w-4 h-4" />
                Edit access is active until {formatDate(activeRequest.expires_at)}
              </div>
              <Button
                size="sm"
                variant="outline"
                className="text-destructive border-destructive/30"
                disabled={revoking && revokingId === activeRequest.id}
                onClick={() => handleRevoke(activeRequest.id)}
              >
                <XCircle className="w-3.5 h-3.5 mr-1" />
                Revoke Access
              </Button>
            </>
          )}

          {hasPendingRequest && !hasActiveAccess && (
            <div className="flex items-center gap-2 text-sm text-amber-600 dark:text-amber-400">
              <Clock className="w-4 h-4" />
              Access request pending client approval (sent {formatDate(pendingRequest!.requested_at)})
            </div>
          )}

          {!hasActiveAccess && !hasPendingRequest && (
            <>
              <p className="text-sm text-muted-foreground">
                You have read-only access. Request edit access to classify transactions and post journal entries.
              </p>
              {!showForm && (
                <Button size="sm" onClick={() => setShowForm(true)}>
                  <ShieldCheck className="w-3.5 h-3.5 mr-1" />
                  Request Edit Access
                </Button>
              )}
            </>
          )}

          {/* Request form */}
          {showForm && !hasActiveAccess && !hasPendingRequest && (
            <div className="border rounded-lg p-4 space-y-3 bg-muted/30">
              <p className="text-sm font-medium">Request Edit Access</p>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Reason (required)</label>
                <textarea
                  value={accessNote}
                  onChange={(e) => setAccessNote(e.target.value)}
                  placeholder="e.g. Year-end review and HST filing preparation"
                  maxLength={500}
                  rows={3}
                  className="w-full text-sm border border-border rounded-lg px-3 py-2 outline-none focus:border-primary bg-background text-foreground resize-none"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Duration</label>
                <select
                  value={durationType}
                  onChange={(e) => setDurationType(e.target.value as any)}
                  className="w-full text-sm border border-border rounded-lg px-3 py-2 outline-none focus:border-primary bg-background text-foreground"
                >
                  <option value="90_days">90 days (default)</option>
                  <option value="year_end">Until March 31 next year</option>
                  <option value="custom">Custom date</option>
                </select>
              </div>
              {durationType === 'custom' && (
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">Custom expiry date</label>
                  <input
                    type="date"
                    value={customDate}
                    onChange={(e) => setCustomDate(e.target.value)}
                    min={new Date().toISOString().split('T')[0]}
                    className="w-full text-sm border border-border rounded-lg px-3 py-2 outline-none focus:border-primary bg-background text-foreground"
                  />
                </div>
              )}
              <div className="flex gap-2">
                <Button size="sm" disabled={submitting} onClick={handleSubmit}>
                  {submitting ? <RefreshCw className="w-3.5 h-3.5 mr-1 animate-spin" /> : null}
                  Send Request
                </Button>
                <Button size="sm" variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Request history */}
      {requests.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Request History</CardTitle>
          </CardHeader>
          <CardContent className="pt-0 space-y-2">
            {requests.map((req) => (
              <div key={req.id} className="flex items-center justify-between py-1.5 border-b last:border-0">
                <div>
                  <p className="text-xs text-muted-foreground">
                    Requested {formatDate(req.requested_at)}
                    {req.expires_at ? ` · Expires ${formatDate(req.expires_at)}` : ''}
                  </p>
                  {req.access_note && (
                    <p className="text-xs text-foreground mt-0.5">{req.access_note}</p>
                  )}
                </div>
                <AccessStatusBadge status={req.status} />
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function ActivityLogTab({ businessId }: { businessId: string }) {
  const [entries, setEntries] = useState<any[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    getClientAuditLog(businessId).then((result) => {
      setEntries(result.data);
      setLoaded(true);
    });
  }, [businessId]);

  if (!loaded) {
    return <p className="text-sm text-muted-foreground py-4 text-center">Loading…</p>;
  }

  if (entries.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center border-2 border-dashed rounded-lg">
        <Activity className="w-8 h-8 text-muted-foreground mb-3" />
        <p className="text-sm text-muted-foreground">No accountant activity recorded yet.</p>
      </div>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium">Activity Log</CardTitle>
      </CardHeader>
      <CardContent className="pt-0 overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b">
              <th className="text-left pb-2 text-muted-foreground font-medium pr-3">Date</th>
              <th className="text-left pb-2 text-muted-foreground font-medium pr-3">Accountant</th>
              <th className="text-left pb-2 text-muted-foreground font-medium pr-3">Action</th>
              <th className="text-left pb-2 text-muted-foreground font-medium">Entity</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((entry) => (
              <tr key={entry.id} className="border-b last:border-0">
                <td className="py-2 pr-3 text-muted-foreground whitespace-nowrap">
                  {new Date(entry.performed_at).toLocaleDateString('en-CA', {
                    month: 'short', day: 'numeric', year: 'numeric',
                  })}
                </td>
                <td className="py-2 pr-3 font-medium">{entry.actor_name}</td>
                <td className="py-2 pr-3 font-mono text-muted-foreground">{entry.action}</td>
                <td className="py-2 text-muted-foreground">{entry.entity_type}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
}

export function ClientDashboardTabs({ businessId }: ClientDashboardTabsProps) {
  const [activeTab, setActiveTab] = useState<Tab>('overview');

  const tabs: { id: Tab; label: string; icon: React.ElementType }[] = [
    { id: 'overview',  label: 'Quick Actions', icon: LayoutDashboard },
    { id: 'access',    label: 'Edit Access',   icon: ShieldCheck },
    { id: 'activity',  label: 'Activity Log',  icon: Activity },
  ];

  return (
    <div>
      <ClientContextSetter businessId={businessId} />
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
            <ClientQuickActions businessId={businessId} contextReady={true} />
            <p className="text-xs text-muted-foreground mt-3">
              Navigating to Transactions, Reports, or HST will show this client&apos;s data.
              Click &ldquo;Back to Clients&rdquo; to return to your firm portal.
            </p>
          </CardContent>
        </Card>
      )}

      {activeTab === 'access' && <EditAccessTab businessId={businessId} />}
      {activeTab === 'activity' && <ActivityLogTab businessId={businessId} />}
    </div>
  );
}
