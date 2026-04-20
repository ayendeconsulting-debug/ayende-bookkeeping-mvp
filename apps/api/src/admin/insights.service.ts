import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';

@Injectable()
export class InsightsService {
  constructor(private readonly dataSource: DataSource) {}

  async getAll(range: string) {
    const [users, revenue, engagement, funnel] = await Promise.all([
      this.getUserMetrics(range),
      this.getRevenueMetrics(),
      this.getEngagementMetrics(),
      this.getFunnelMetrics(),
    ]);
    return { users, revenue, engagement, funnel };
  }

  // ── User Metrics ────────────────────────────────────────────────────────

  private async getUserMetrics(range: string) {
    // Status breakdown
    const statusRows: { status: string; count: string }[] =
      await this.dataSource.query(`
        SELECT status, COUNT(*)::text AS count FROM subscriptions GROUP BY status
      `);
    const statusMap: Record<string, number> = {};
    let total = 0;
    for (const r of statusRows) {
      statusMap[r.status] = parseInt(r.count, 10);
      total += parseInt(r.count, 10);
    }

    // Signups over time
    const { interval, dateExpr, startDate } = this.rangeParams(range);
    const signupsRows: { date: string; count: string }[] =
      await this.dataSource.query(`
        SELECT ${dateExpr} AS date, COUNT(*)::text AS count
        FROM subscriptions
        ${startDate ? `WHERE created_at >= $1` : ''}
        GROUP BY ${dateExpr}
        ORDER BY date
      `, startDate ? [startDate] : []);
    const signupsOverTime = signupsRows.map((r) => ({
      date:  r.date,
      count: parseInt(r.count, 10),
    }));

    // Trial-to-paid conversion rate
    const [convRow]: { converted: string; completed: string }[] =
      await this.dataSource.query(`
        SELECT
          COUNT(*) FILTER (WHERE status = 'active')::text AS converted,
          COUNT(*) FILTER (WHERE status IN ('active', 'cancelled', 'past_due'))::text AS completed
        FROM subscriptions
        WHERE trial_ends_at IS NOT NULL AND trial_ends_at < NOW()
      `);
    const converted  = parseInt(convRow?.converted ?? '0', 10);
    const completed  = parseInt(convRow?.completed ?? '0', 10);
    const trialToPaidRate = completed > 0 ? Math.round((converted / completed) * 1000) / 10 : 0;

    // Monthly churn rate
    const [churnRow]: { churned: string; base: string }[] =
      await this.dataSource.query(`
        SELECT
          COUNT(*) FILTER (WHERE status = 'cancelled' AND updated_at >= NOW() - INTERVAL '30 days')::text AS churned,
          COUNT(*) FILTER (WHERE status IN ('active', 'trialing', 'past_due'))::text AS base
        FROM subscriptions
      `);
    const churned  = parseInt(churnRow?.churned ?? '0', 10);
    const baseCount = parseInt(churnRow?.base ?? '0', 10);
    const churnRate = baseCount > 0 ? Math.round((churned / (baseCount + churned)) * 1000) / 10 : 0;

    return {
      total,
      active:    statusMap['active'] ?? 0,
      trialing:  statusMap['trialing'] ?? 0,
      past_due:  statusMap['past_due'] ?? 0,
      cancelled: statusMap['cancelled'] ?? 0,
      trialToPaidRate,
      churnRate,
      signupsOverTime,
    };
  }

  // ── Revenue Metrics ─────────────────────────────────────────────────────

  private async getRevenueMetrics() {
    // MRR + active count
    const [mrrRow]: { mrr_cents: string; active_count: string }[] =
      await this.dataSource.query(`
        SELECT
          COALESCE(SUM(monthly_amount_cents), 0)::text AS mrr_cents,
          COUNT(*)::text AS active_count
        FROM subscriptions
        WHERE status IN ('active', 'trialing')
      `);
    const mrrCents   = parseInt(mrrRow?.mrr_cents ?? '0', 10);
    const activeCount = parseInt(mrrRow?.active_count ?? '0', 10);
    const arpu = activeCount > 0 ? Math.round(mrrCents / activeCount) : 0;

    // Plan breakdown
    const planRows: { plan: string; mrr_cents: string; count: string }[] =
      await this.dataSource.query(`
        SELECT plan,
          COALESCE(SUM(monthly_amount_cents), 0)::text AS mrr_cents,
          COUNT(*)::text AS count
        FROM subscriptions
        WHERE status IN ('active', 'trialing')
        GROUP BY plan
        ORDER BY plan
      `);
    const planBreakdown = planRows.map((r) => ({
      plan:  r.plan,
      mrr:   parseInt(r.mrr_cents, 10),
      count: parseInt(r.count, 10),
    }));

    // Payment failure rate
    const [failRow]: { failed: string; total: string }[] =
      await this.dataSource.query(`
        SELECT
          COUNT(*) FILTER (WHERE status = 'past_due')::text AS failed,
          COUNT(*) FILTER (WHERE status IN ('active', 'trialing', 'past_due'))::text AS total
        FROM subscriptions
      `);
    const failedCount = parseInt(failRow?.failed ?? '0', 10);
    const totalActive = parseInt(failRow?.total ?? '0', 10);
    const paymentFailureRate = totalActive > 0
      ? Math.round((failedCount / totalActive) * 1000) / 10 : 0;

    return {
      mrrCents,
      arrCents: mrrCents * 12,
      arpu,
      paymentFailureRate,
      planBreakdown,
    };
  }

  // ── Engagement Metrics ──────────────────────────────────────────────────

  private async getEngagementMetrics() {
    const queries = await Promise.all([
      this.dataSource.query(`SELECT COUNT(*)::text AS count FROM businesses WHERE deleted_at IS NULL`),
      this.dataSource.query(`SELECT COUNT(*)::text AS count FROM classified_transactions WHERE created_at >= DATE_TRUNC('month', CURRENT_DATE)`),
      this.dataSource.query(`SELECT COUNT(*)::text AS count FROM plaid_items WHERE status = 'active' AND is_deleted = false`),
      this.dataSource.query(`SELECT COUNT(*)::text AS calls, COALESCE(SUM(tokens_used), 0)::text AS tokens FROM ai_usage_log WHERE used_at >= DATE_TRUNC('month', CURRENT_DATE)`),
    ]);

    const aiGlobalCap = parseInt(process.env.AI_MONTHLY_GLOBAL_CAP ?? '500', 10);

    return {
      activeBizCount:     parseInt(queries[0][0]?.count ?? '0', 10),
      classifiedThisMonth: parseInt(queries[1][0]?.count ?? '0', 10),
      plaidConnections:    parseInt(queries[2][0]?.count ?? '0', 10),
      aiCallsThisMonth:    parseInt(queries[3][0]?.calls ?? '0', 10),
      aiGlobalCap,
    };
  }

  // ── Funnel & Campaign Metrics ───────────────────────────────────────────

  private async getFunnelMetrics() {
    const queries = await Promise.all([
      // Leads by status
      this.dataSource.query(`SELECT status, COUNT(*)::text AS count FROM leads WHERE deleted_at IS NULL GROUP BY status`),
      // Leads by type
      this.dataSource.query(`SELECT type, COUNT(*)::text AS count FROM leads WHERE deleted_at IS NULL GROUP BY type`),
      // Campaign stats
      this.dataSource.query(`
        SELECT
          COUNT(*) FILTER (WHERE status = 'sent')::text AS sent_count,
          COALESCE(SUM(recipient_count) FILTER (WHERE status = 'sent'), 0)::text AS emails_sent
        FROM email_campaigns
      `),
      // Skipped emails (unsubscribed)
      this.dataSource.query(`SELECT 0::text AS count`),
      // Lead-to-signup conversion
      this.dataSource.query(`
        SELECT
          COUNT(*) FILTER (WHERE status = 'converted')::text AS converted,
          COUNT(*)::text AS total
        FROM leads WHERE deleted_at IS NULL
      `),
      // Referral summary
      this.dataSource.query(`
        SELECT
          (SELECT COUNT(*) FROM referral_partners WHERE is_active = true)::text AS total_partners,
          (SELECT COUNT(*) FROM referral_events WHERE event_type = 'signup')::text AS total_signups,
          (SELECT COUNT(*) FROM referral_events WHERE event_type = 'converted')::text AS total_conversions,
          (SELECT COALESCE(SUM(commission_amount), 0)::text FROM referral_commissions WHERE status = 'accrued') AS total_accrued
      `),
    ]);

    const leadsByStatus = (queries[0] as { status: string; count: string }[]).map((r) => ({
      status: r.status, count: parseInt(r.count, 10),
    }));
    const leadsByType = (queries[1] as { type: string; count: string }[]).map((r) => ({
      type: r.type, count: parseInt(r.count, 10),
    }));

    const campRow = queries[2][0] ?? {};
    const skipRow = queries[3][0] ?? {};
    const convRow = queries[4][0] ?? {};
    const refRow  = queries[5][0] ?? {};

    const leadsTotal     = parseInt(convRow.total ?? '0', 10);
    const leadsConverted = parseInt(convRow.converted ?? '0', 10);

    return {
      leadsByStatus,
      leadsByType,
      totalLeads: leadsTotal,
      campaignsSent:  parseInt(campRow.sent_count ?? '0', 10),
      emailsSent:     parseInt(campRow.emails_sent ?? '0', 10),
      emailsSkipped:  parseInt(skipRow.count ?? '0', 10),
      leadToSignupRate: leadsTotal > 0
        ? Math.round((leadsConverted / leadsTotal) * 1000) / 10 : 0,
      referralSummary: {
        totalPartners:         parseInt(refRow.total_partners ?? '0', 10),
        totalSignups:          parseInt(refRow.total_signups ?? '0', 10),
        totalConversions:      parseInt(refRow.total_conversions ?? '0', 10),
        totalCommissionAccrued: parseFloat(refRow.total_accrued ?? '0'),
      },
    };
  }

  // ── Helpers ─────────────────────────────────────────────────────────────

  private rangeParams(range: string): {
    interval: string;
    dateExpr: string;
    startDate: string | null;
  } {
    const now = new Date();
    switch (range) {
      case '7d':
        return {
          interval: 'day',
          dateExpr: `DATE(created_at)`,
          startDate: new Date(now.getTime() - 7 * 86400000).toISOString(),
        };
      case '30d':
        return {
          interval: 'day',
          dateExpr: `DATE(created_at)`,
          startDate: new Date(now.getTime() - 30 * 86400000).toISOString(),
        };
      case '90d':
        return {
          interval: 'week',
          dateExpr: `DATE_TRUNC('week', created_at)::date`,
          startDate: new Date(now.getTime() - 90 * 86400000).toISOString(),
        };
      case '12mo':
        return {
          interval: 'month',
          dateExpr: `DATE_TRUNC('month', created_at)::date`,
          startDate: new Date(now.getTime() - 365 * 86400000).toISOString(),
        };
      case 'all':
        return {
          interval: 'month',
          dateExpr: `DATE_TRUNC('month', created_at)::date`,
          startDate: null,
        };
      default:
        return {
          interval: 'day',
          dateExpr: `DATE(created_at)`,
          startDate: new Date(now.getTime() - 30 * 86400000).toISOString(),
        };
    }
  }
}
