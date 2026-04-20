import { PartnerDashboardClient } from './partner-dashboard-client';

const API_URL = process.env.API_URL || 'http://localhost:3005';

interface DashboardData {
  partner: { name: string; referral_code: string; type: string };
  summary: { clicks: number; signups: number; conversions: number; active_subscribers: number };
  commission: { total_earned: number; current_balance: number; total_paid: number };
  referrals: { user_id: string; signup_date: string; subscription_status: string | null; plan: string | null; commission_earned: number }[];
  commissions: { id: string; period_start: string; period_end: string; mrr_amount: number; commission_amount: number; status: string; paid_at: string | null; created_at: string }[];
}

async function fetchDashboardData(token: string): Promise<{ data: DashboardData | null; error: string | null }> {
  try {
    const res = await fetch(
      `${API_URL}/referrals/partner-dashboard?token=${encodeURIComponent(token)}`,
      { cache: 'no-store' },
    );
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      return { data: null, error: body.message ?? 'Invalid or expired link' };
    }
    return { data: await res.json(), error: null };
  } catch {
    return { data: null, error: 'Failed to load dashboard' };
  }
}

export default async function PartnerDashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const params = await searchParams;
  const token = params.token;

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="text-center space-y-3">
          <h1 className="text-xl font-bold text-foreground">Partner Dashboard</h1>
          <p className="text-sm text-muted-foreground">A valid access link is required. Contact your Tempo Books admin for a new link.</p>
        </div>
      </div>
    );
  }

  const { data, error } = await fetchDashboardData(token);

  if (error || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="text-center space-y-3">
          <h1 className="text-xl font-bold text-foreground">Access Denied</h1>
          <p className="text-sm text-destructive">{error}</p>
          <p className="text-xs text-muted-foreground">Links expire after 7 days. Contact your Tempo Books admin for a fresh link.</p>
        </div>
      </div>
    );
  }

  return <PartnerDashboardClient data={data} />;
}
