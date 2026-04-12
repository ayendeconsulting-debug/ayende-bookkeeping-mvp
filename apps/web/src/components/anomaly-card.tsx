'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@clerk/nextjs';
import { ShieldAlert, AlertTriangle, Info, TrendingUp, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface AnomalyFlag {
  journal_entry_id: string;
  entry_number:     string;
  description:      string;
  severity:         'high' | 'medium' | 'low';
  reason:           string;
}
interface AnomalyResult { flags: AnomalyFlag[]; summary: string; }

function severityIcon(s: AnomalyFlag['severity']) {
  if (s === 'high')   return <ShieldAlert   className="w-4 h-4 text-red-500   flex-shrink-0" />;
  if (s === 'medium') return <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0" />;
  return <Info className="w-4 h-4 text-blue-400 flex-shrink-0" />;
}

function severityBadgeClass(s: AnomalyFlag['severity']) {
  if (s === 'high')   return 'bg-red-50   text-red-700   border-red-200   dark:bg-red-950   dark:text-red-400   dark:border-red-900';
  if (s === 'medium') return 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-400 dark:border-amber-900';
  return 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-400 dark:border-blue-900';
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || '';

export function AnomalyCard() {
  const { getToken } = useAuth();
  const [anomalies, setAnomalies] = useState<AnomalyResult | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function fetchAnomalies() {
      try {
        const token = await getToken();
        const res = await fetch(`${API_URL}/ai/anomalies`, {
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          cache: 'no-store',
        });
        if (!res.ok) throw new Error('Failed');
        const data = await res.json();
        if (!cancelled) setAnomalies(data);
      } catch {
        if (!cancelled) setAnomalies(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    fetchAnomalies();
    return () => { cancelled = true; };
  }, [getToken]);

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between pb-3">
        <CardTitle className="flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 text-muted-foreground" />
          AI Anomaly Detection
        </CardTitle>
        {anomalies && (
          <span className="text-xs text-muted-foreground">
            {anomalies.flags.length} flag{anomalies.flags.length !== 1 ? 's' : ''}
          </span>
        )}
      </CardHeader>
      <CardContent className="pt-0">
        {loading && (
          <div className="flex items-center gap-2 py-3 text-sm text-muted-foreground">
            <Loader2 className="w-4 h-4 animate-spin" />
            Analyzing transactions...
          </div>
        )}
        {!loading && !anomalies && (
          <div className="flex flex-col items-center justify-center text-center py-4">
            <ShieldAlert className="w-6 h-6 text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">Anomaly detection unavailable.</p>
          </div>
        )}
        {!loading && anomalies?.flags.length === 0 && (
          <div className="flex items-center gap-2 py-3 text-sm text-primary">
            <div className="w-5 h-5 rounded-full bg-primary-light flex items-center justify-center">
              <TrendingUp className="w-3 h-3 text-primary" />
            </div>
            No anomalies detected -- your books look clean.
          </div>
        )}
        {!loading && anomalies && anomalies.flags.length > 0 && (
          <div className="flex flex-col gap-2">
            {anomalies.flags.slice(0, 5).map((flag, i) => (
              <div key={i} className={`flex items-start gap-3 rounded-lg border px-3 py-2.5 ${severityBadgeClass(flag.severity)}`}>
                {severityIcon(flag.severity)}
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-medium truncate">{flag.description || flag.entry_number}</div>
                  <div className="text-xs mt-0.5 opacity-80">{flag.reason}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
