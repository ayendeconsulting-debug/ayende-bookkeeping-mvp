import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { LlmService } from './llm.service';
import { JournalLine } from '../../entities/journal-line.entity';
import { RawTransaction } from '../../entities/raw-transaction.entity';
import { ClassifiedTransaction } from '../../entities/classified-transaction.entity';

export type AnomalyType =
  | 'amount_outlier'
  | 'frequency_outlier'
  | 'category_mismatch'
  | 'general';

export interface AnomalyFlag {
  journal_entry_id: string;
  entry_number: string;
  entry_date: Date;
  description: string;
  amount: number;
  account_name: string;
  severity: 'high' | 'medium' | 'low';
  reason: string;
  anomaly_type: AnomalyType;
}

export interface AnomalyReport {
  business_id: string;
  start_date: string;
  end_date: string;
  total_transactions_reviewed: number;
  anomalies_found: number;
  flags: AnomalyFlag[];
  summary: string;
  generated_at: Date;
}

@Injectable()
export class AnomalyService {
  constructor(
    private readonly llmService: LlmService,
    @InjectRepository(JournalLine)
    private readonly journalLineRepo: Repository<JournalLine>,
    @InjectRepository(RawTransaction)
    private readonly rawTransactionRepo: Repository<RawTransaction>,
    @InjectRepository(ClassifiedTransaction)
    private readonly classifiedTransactionRepo: Repository<ClassifiedTransaction>,
  ) {}

  // ── Main entry point ─────────────────────────────────────────────────────

  async detect(
    businessId: string,
    startDate: string,
    endDate: string,
  ): Promise<AnomalyReport> {
    const [rows, statisticalFlags] = await Promise.all([
      this.fetchJournalRows(businessId, startDate, endDate),
      this.runStatisticalChecks(businessId, startDate, endDate),
    ]);

    if (rows.length === 0 && statisticalFlags.length === 0) {
      return {
        business_id: businessId,
        start_date: startDate,
        end_date: endDate,
        total_transactions_reviewed: 0,
        anomalies_found: 0,
        flags: [],
        summary: 'No posted transactions found in this date range.',
        generated_at: new Date(),
      };
    }

    // ── Claude general anomaly pass ─────────────────────────────────────────
    const claudeFlags = rows.length > 0
      ? await this.runClaudePass(rows)
      : { flags: [], summary: '' };

    // ── Map Claude flags to full AnomalyFlag shape ──────────────────────────
    const mappedClaudeFlags: AnomalyFlag[] = (claudeFlags.flags ?? []).map(flag => {
      const row = rows.find(r => r.entry_number === flag.entry_number);
      return {
        journal_entry_id: row?.journal_entry_id ?? '',
        entry_number: flag.entry_number,
        entry_date: row?.entry_date ?? null,
        description: row?.description ?? '',
        amount: parseFloat(row?.debit_amount || row?.credit_amount || '0'),
        account_name: row?.account_name ?? '',
        severity: flag.severity,
        reason: flag.reason,
        anomaly_type: 'general' as AnomalyType,
      };
    });

    // ── Merge + deduplicate by journal_entry_id ─────────────────────────────
    const allFlags = [...statisticalFlags, ...mappedClaudeFlags];
    const seen = new Set<string>();
    const deduped = allFlags.filter(f => {
      if (!f.journal_entry_id) return true; // keep flags without entry id
      if (seen.has(f.journal_entry_id)) return false;
      seen.add(f.journal_entry_id);
      return true;
    });

    return {
      business_id: businessId,
      start_date: startDate,
      end_date: endDate,
      total_transactions_reviewed: rows.length,
      anomalies_found: deduped.length,
      flags: deduped,
      summary: claudeFlags.summary || this.buildSummary(deduped),
      generated_at: new Date(),
    };
  }

  // ── Fetch posted journal rows ─────────────────────────────────────────────

  private async fetchJournalRows(
    businessId: string,
    startDate: string,
    endDate: string,
  ): Promise<any[]> {
    return this.journalLineRepo
      .createQueryBuilder('jl')
      .select('je.id', 'journal_entry_id')
      .addSelect('je.entry_number', 'entry_number')
      .addSelect('je.entry_date', 'entry_date')
      .addSelect('je.description', 'description')
      .addSelect('jl.debit_amount', 'debit_amount')
      .addSelect('jl.credit_amount', 'credit_amount')
      .addSelect('a.name', 'account_name')
      .addSelect('a.account_type', 'account_type')
      .innerJoin('jl.journalEntry', 'je')
      .innerJoin('jl.account', 'a')
      .where('jl.business_id = :businessId', { businessId })
      .andWhere("je.status = 'posted'")
      .andWhere('je.entry_date >= :startDate', { startDate })
      .andWhere('je.entry_date <= :endDate', { endDate })
      .orderBy('je.entry_date', 'ASC')
      .limit(200)
      .getRawMany();
  }

  // ── Statistical pre-processing checks ────────────────────────────────────

  private async runStatisticalChecks(
    businessId: string,
    startDate: string,
    endDate: string,
  ): Promise<AnomalyFlag[]> {
    const [amountFlags, frequencyFlags, categoryFlags] = await Promise.all([
      this.checkAmountOutliers(businessId, startDate, endDate),
      this.checkFrequencyOutliers(businessId, startDate, endDate),
      this.checkCategoryMismatches(businessId, startDate, endDate),
    ]);

    return [...amountFlags, ...frequencyFlags, ...categoryFlags];
  }

  // ── Check 1: Amount outliers (> 2 std devs from category mean) ───────────

  private async checkAmountOutliers(
    businessId: string,
    startDate: string,
    endDate: string,
  ): Promise<AnomalyFlag[]> {
    // Get per-account stats then find outliers in application layer
    const rows = await this.rawTransactionRepo
      .createQueryBuilder('rt')
      .select('rt.id', 'id')
      .addSelect('rt.description', 'description')
      .addSelect('rt.transaction_date', 'transaction_date')
      .addSelect('rt.amount', 'amount')
      .addSelect('rt.source_account_name', 'source_account_name')
      .where('rt.business_id = :businessId', { businessId })
      .andWhere('rt.transaction_date >= :startDate', { startDate })
      .andWhere('rt.transaction_date <= :endDate', { endDate })
      .andWhere("rt.status != 'ignored'")
      .andWhere("rt.status != 'duplicate'")
      .getRawMany();

    if (rows.length < 5) return []; // not enough data for statistical analysis

    // Group by source_account_name
    const byAccount = new Map<string, typeof rows>();
    for (const row of rows) {
      const key = row.source_account_name ?? 'Unknown';
      if (!byAccount.has(key)) byAccount.set(key, []);
      byAccount.get(key)!.push(row);
    }

    const flags: AnomalyFlag[] = [];

    for (const [accountName, accountRows] of byAccount.entries()) {
      if (accountRows.length < 3) continue; // need at least 3 for meaningful stats

      const amounts = accountRows.map(r => Math.abs(parseFloat(r.amount)));
      const mean = amounts.reduce((a, b) => a + b, 0) / amounts.length;
      const variance =
        amounts.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) /
        amounts.length;
      const stdDev = Math.sqrt(variance);

      for (const row of accountRows) {
        const absAmount = Math.abs(parseFloat(row.amount));
        const zScore = stdDev > 0 ? (absAmount - mean) / stdDev : 0;

        if (zScore > 2) {
          const severity: 'high' | 'medium' | 'low' =
            zScore > 3 ? 'high' : zScore > 2.5 ? 'medium' : 'low';

          flags.push({
            journal_entry_id: '',
            entry_number: '',
            entry_date: row.transaction_date,
            description: row.description,
            amount: absAmount,
            account_name: accountName,
            severity,
            reason: `Amount $${absAmount.toFixed(2)} is ${zScore.toFixed(1)} standard deviations above the mean ($${mean.toFixed(2)}) for ${accountName} transactions in this period.`,
            anomaly_type: 'amount_outlier',
          });
        }
      }
    }

    return flags;
  }

  // ── Check 2: Frequency outliers (same vendor within 7 days) ──────────────

  private async checkFrequencyOutliers(
    businessId: string,
    startDate: string,
    endDate: string,
  ): Promise<AnomalyFlag[]> {
    const rows = await this.rawTransactionRepo
      .createQueryBuilder('rt')
      .select('rt.id', 'id')
      .addSelect('rt.description', 'description')
      .addSelect('rt.transaction_date', 'transaction_date')
      .addSelect('rt.amount', 'amount')
      .addSelect('rt.source_account_name', 'source_account_name')
      .where('rt.business_id = :businessId', { businessId })
      .andWhere('rt.transaction_date >= :startDate', { startDate })
      .andWhere('rt.transaction_date <= :endDate', { endDate })
      .andWhere("rt.status != 'ignored'")
      .andWhere("rt.status != 'duplicate'")
      .orderBy('rt.transaction_date', 'ASC')
      .getRawMany();

    const flags: AnomalyFlag[] = [];

    // Normalise description to first 30 chars lowercase for vendor grouping
    const normalise = (desc: string) =>
      (desc ?? '').toLowerCase().replace(/[^a-z0-9 ]/g, '').substring(0, 30).trim();

    // Group by normalised vendor
    const byVendor = new Map<string, typeof rows>();
    for (const row of rows) {
      const key = normalise(row.description);
      if (!key) continue;
      if (!byVendor.has(key)) byVendor.set(key, []);
      byVendor.get(key)!.push(row);
    }

    for (const [vendor, vendorRows] of byVendor.entries()) {
      if (vendorRows.length < 2) continue;

      // Check consecutive pairs for 7-day window
      for (let i = 0; i < vendorRows.length - 1; i++) {
        const a = new Date(vendorRows[i].transaction_date);
        const b = new Date(vendorRows[i + 1].transaction_date);
        const daysDiff =
          Math.abs(b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24);

        if (daysDiff <= 7) {
          flags.push({
            journal_entry_id: '',
            entry_number: '',
            entry_date: vendorRows[i + 1].transaction_date,
            description: vendorRows[i + 1].description,
            amount: Math.abs(parseFloat(vendorRows[i + 1].amount)),
            account_name: vendorRows[i + 1].source_account_name ?? 'Unknown',
            severity: 'medium',
            reason: `Vendor "${vendorRows[i + 1].description}" appears again within ${Math.round(daysDiff)} day(s) of a previous transaction. Possible duplicate charge.`,
            anomaly_type: 'frequency_outlier',
          });
          break; // one flag per vendor per period is enough
        }
      }
    }

    return flags;
  }

  // ── Check 3: Category mismatches (vendor classified inconsistently) ───────

  private async checkCategoryMismatches(
    businessId: string,
    startDate: string,
    endDate: string,
  ): Promise<AnomalyFlag[]> {
    // Find vendors where the same description maps to more than one account
    const rows = await this.classifiedTransactionRepo
      .createQueryBuilder('ct')
      .select('rt.description', 'description')
      .addSelect('a.name', 'account_name')
      .addSelect('COUNT(*)', 'count')
      .innerJoin('ct.rawTransaction', 'rt')
      .innerJoin('ct.account', 'a')
      .where('ct.business_id = :businessId', { businessId })
      .andWhere('rt.transaction_date >= :startDate', { startDate })
      .andWhere('rt.transaction_date <= :endDate', { endDate })
      .groupBy('rt.description')
      .addGroupBy('a.name')
      .having('COUNT(*) >= 1')
      .getRawMany();

    // Find descriptions mapped to more than one account
    const byDescription = new Map<string, Set<string>>();
    for (const row of rows) {
      const key = (row.description ?? '').substring(0, 50);
      if (!byDescription.has(key)) byDescription.set(key, new Set());
      byDescription.get(key)!.add(row.account_name);
    }

    const flags: AnomalyFlag[] = [];

    for (const [description, accounts] of byDescription.entries()) {
      if (accounts.size > 1) {
        flags.push({
          journal_entry_id: '',
          entry_number: '',
          entry_date: new Date(endDate),
          description,
          amount: 0,
          account_name: Array.from(accounts).join(', '),
          severity: 'low',
          reason: `Vendor "${description}" has been classified under ${accounts.size} different accounts: ${Array.from(accounts).join(', ')}. Consider standardising the classification rule.`,
          anomaly_type: 'category_mismatch',
        });
      }
    }

    return flags;
  }

  // ── Claude general pass ───────────────────────────────────────────────────

  private async runClaudePass(rows: any[]): Promise<{
    flags: Array<{ entry_number: string; severity: 'high' | 'medium' | 'low'; reason: string }>;
    summary: string;
  }> {
    const txList = rows
      .map(
        r =>
          `${r.entry_number} | ${new Date(r.entry_date).toLocaleDateString('en-CA')} | ${r.description} | ${r.account_name} | ${r.account_type} | debit:${r.debit_amount} credit:${r.credit_amount}`,
      )
      .join('\n');

    const systemPrompt = `You are a forensic bookkeeping assistant. Analyse posted journal lines for anomalies.
Anomalies include: unusually large transactions, duplicate descriptions, weekend/holiday postings for non-service businesses, round-number transactions, transactions to unexpected account types.
Respond ONLY with valid JSON and nothing else.`;

    const userPrompt = `Analyse these journal lines for anomalies:
${txList}

Respond ONLY with this JSON:
{
  "flags": [
    {
      "entry_number": "<entry number>",
      "severity": "high" | "medium" | "low",
      "reason": "<concise explanation>"
    }
  ],
  "summary": "<2-3 sentence overall summary>"
}
Return an empty flags array if no anomalies found.`;

    try {
      const raw = await this.llmService.complete(systemPrompt, userPrompt);
      const clean = raw.replace(/```json|```/g, '').trim();
      return JSON.parse(clean);
    } catch {
      return { flags: [], summary: 'AI analysis could not be completed — review manually.' };
    }
  }

  // ── Fallback summary when Claude pass is skipped ──────────────────────────

  private buildSummary(flags: AnomalyFlag[]): string {
    if (flags.length === 0) return 'No anomalies detected in this period.';
    const high = flags.filter(f => f.severity === 'high').length;
    const medium = flags.filter(f => f.severity === 'medium').length;
    const low = flags.filter(f => f.severity === 'low').length;
    return `${flags.length} anomaly flag(s) detected: ${high} high, ${medium} medium, ${low} low severity. Please review the flagged transactions.`;
  }
}
