import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { LlmService } from './llm.service';
import { JournalLine } from '../../entities/journal-line.entity';

export interface AnomalyFlag {
  journal_entry_id: string;
  entry_number: string;
  entry_date: Date;
  description: string;
  amount: number;
  account_name: string;
  severity: 'high' | 'medium' | 'low';
  reason: string;
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
  ) {}

  async detect(businessId: string, startDate: string, endDate: string): Promise<AnomalyReport> {
    const rows = await this.journalLineRepo
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
      .limit(200) // Cap to avoid token overflow
      .getRawMany();

    if (rows.length === 0) {
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

    const txList = rows.map(r =>
      `${r.entry_number} | ${new Date(r.entry_date).toLocaleDateString('en-CA')} | ${r.description} | ${r.account_name} | ${r.account_type} | debit:${r.debit_amount} credit:${r.credit_amount}`
    ).join('\n');

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

    const raw = await this.llmService.complete(systemPrompt, userPrompt);

    let parsed: {
      flags: Array<{ entry_number: string; severity: 'high' | 'medium' | 'low'; reason: string }>;
      summary: string;
    };

    try {
      const clean = raw.replace(/```json|```/g, '').trim();
      parsed = JSON.parse(clean);
    } catch {
      parsed = { flags: [], summary: 'AI could not parse transactions — review manually.' };
    }

    // Map AI flags back to full row data
    const flags: AnomalyFlag[] = (parsed.flags ?? []).map(flag => {
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
      };
    });

    return {
      business_id: businessId,
      start_date: startDate,
      end_date: endDate,
      total_transactions_reviewed: rows.length,
      anomalies_found: flags.length,
      flags,
      summary: parsed.summary ?? '',
      generated_at: new Date(),
    };
  }
}
