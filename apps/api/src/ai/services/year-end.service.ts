import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { LlmService } from './llm.service';
import { JournalLine } from '../../entities/journal-line.entity';
import { RawTransaction, RawTransactionStatus } from '../../entities/raw-transaction.entity';
import { Business } from '../../entities/business.entity';

export interface YearEndObservation {
  category: string;
  detail: string;
}

export interface YearEndAdjustment {
  description: string;
  debit_account: string;
  credit_account: string;
  estimated_amount?: string;
}

export interface YearEndReport {
  business_id: string;
  business_name: string;
  fiscal_year_end: string;
  generated_at: Date;
  // Financials summary
  total_revenue: number;
  total_expenses: number;
  net_income: number;
  top_expense_categories: Array<{ account: string; amount: number }>;
  uncategorised_count: number;
  uncategorised_total: number;
  // Claude output
  executive_summary: string;
  observations: YearEndObservation[];
  suggested_adjustments: YearEndAdjustment[];
  checklist: string[];
}

@Injectable()
export class YearEndService {
  constructor(
    private readonly llmService: LlmService,
    @InjectRepository(JournalLine)
    private readonly journalLineRepo: Repository<JournalLine>,
    @InjectRepository(RawTransaction)
    private readonly rawTransactionRepo: Repository<RawTransaction>,
    @InjectRepository(Business)
    private readonly businessRepo: Repository<Business>,
  ) {}

  async generate(
    businessId: string,
    fiscalYearEnd: string,
  ): Promise<YearEndReport> {
    // ── Fetch business ───────────────────────────────────────────────────────
    const business = await this.businessRepo.findOne({
      where: { id: businessId },
    });
    if (!business) throw new NotFoundException('Business not found');

    // ── Determine fiscal year start (12 months before year end) ─────────────
    const yearEnd = new Date(fiscalYearEnd);
    const yearStart = new Date(yearEnd);
    yearStart.setFullYear(yearStart.getFullYear() - 1);
    yearStart.setDate(yearStart.getDate() + 1);
    const startDate = yearStart.toISOString().split('T')[0];

    // ── Fetch revenue and expense totals by account ──────────────────────────
    const accountTotals = await this.journalLineRepo
      .createQueryBuilder('jl')
      .select('a.name', 'account_name')
      .addSelect('a.account_type', 'account_type')
      .addSelect('SUM(jl.debit_amount - jl.credit_amount)', 'net')
      .innerJoin('jl.journalEntry', 'je')
      .innerJoin('jl.account', 'a')
      .where('jl.business_id = :businessId', { businessId })
      .andWhere("je.status = 'posted'")
      .andWhere('je.entry_date >= :startDate', { startDate })
      .andWhere('je.entry_date <= :fiscalYearEnd', { fiscalYearEnd })
      .groupBy('a.name')
      .addGroupBy('a.account_type')
      .getRawMany();

    // ── Calculate summary figures ────────────────────────────────────────────
    let totalRevenue = 0;
    let totalExpenses = 0;
    const expenseByAccount: Array<{ account: string; amount: number }> = [];

    for (const row of accountTotals) {
      const net = parseFloat(row.net ?? '0');
      if (row.account_type === 'revenue') {
        totalRevenue += Math.abs(net);
      } else if (row.account_type === 'expense') {
        totalExpenses += Math.abs(net);
        expenseByAccount.push({ account: row.account_name, amount: Math.abs(net) });
      }
    }

    const top5Expenses = expenseByAccount
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 5);

    const netIncome = totalRevenue - totalExpenses;

    // ── Count uncategorised transactions ─────────────────────────────────────
    const uncategorisedRows = await this.rawTransactionRepo
      .createQueryBuilder('rt')
      .select('COUNT(*)', 'count')
      .addSelect('SUM(ABS(rt.amount))', 'total')
      .where('rt.business_id = :businessId', { businessId })
      .andWhere('rt.status = :status', { status: RawTransactionStatus.PENDING })
      .andWhere('rt.transaction_date >= :startDate', { startDate })
      .andWhere('rt.transaction_date <= :fiscalYearEnd', { fiscalYearEnd })
      .getRawOne();

    const uncategorisedCount = parseInt(uncategorisedRows?.count ?? '0', 10);
    const uncategorisedTotal = parseFloat(uncategorisedRows?.total ?? '0');

    // ── Build Claude prompt ──────────────────────────────────────────────────
    const systemPrompt = `You are a senior Canadian bookkeeper preparing a year-end review for a small business. 
Provide practical, actionable advice. Use plain language. Avoid technical jargon where possible.
Respond ONLY with valid JSON matching the exact schema requested.`;

    const expenseList = top5Expenses
      .map((e, i) => `${i + 1}. ${e.account}: $${e.amount.toFixed(2)}`)
      .join('\n');

    const userPrompt = `Prepare a year-end review for this Canadian small business:

Business: ${business.name}
Fiscal Year: ${startDate} to ${fiscalYearEnd}
Total Revenue: $${totalRevenue.toFixed(2)}
Total Expenses: $${totalExpenses.toFixed(2)}
Net Income: $${netIncome.toFixed(2)}
Top Expense Categories:
${expenseList || 'No expense data available'}
Uncategorised Transactions: ${uncategorisedCount} transactions totalling $${uncategorisedTotal.toFixed(2)}

Respond ONLY with this exact JSON (no markdown, no extra text):
{
  "executive_summary": "<2-3 sentence overview of the year>",
  "observations": [
    { "category": "<e.g. Revenue, Expenses, Cash Flow>", "detail": "<observation>" }
  ],
  "suggested_adjustments": [
    {
      "description": "<plain language description>",
      "debit_account": "<account name>",
      "credit_account": "<account name>",
      "estimated_amount": "<optional dollar amount>"
    }
  ],
  "checklist": [
    "<action item 1>",
    "<action item 2>"
  ]
}

Include 3-5 observations, 2-4 suggested adjustments, and 5-8 checklist items relevant to Canadian small businesses (HST filing, CRA deadlines, owner draws, etc.).`;

    // ── Call Claude ──────────────────────────────────────────────────────────
    const raw = await this.llmService.complete(systemPrompt, userPrompt);

    let parsed: {
      executive_summary: string;
      observations: YearEndObservation[];
      suggested_adjustments: YearEndAdjustment[];
      checklist: string[];
    };

    try {
      const clean = raw.replace(/```json|```/g, '').trim();
      parsed = JSON.parse(clean);
    } catch {
      parsed = {
        executive_summary: raw,
        observations: [],
        suggested_adjustments: [],
        checklist: ['Review all transactions manually', 'Consult your accountant'],
      };
    }

    return {
      business_id: businessId,
      business_name: business.name,
      fiscal_year_end: fiscalYearEnd,
      generated_at: new Date(),
      total_revenue: totalRevenue,
      total_expenses: totalExpenses,
      net_income: netIncome,
      top_expense_categories: top5Expenses,
      uncategorised_count: uncategorisedCount,
      uncategorised_total: uncategorisedTotal,
      executive_summary: parsed.executive_summary,
      observations: parsed.observations ?? [],
      suggested_adjustments: parsed.suggested_adjustments ?? [],
      checklist: parsed.checklist ?? [],
    };
  }
}
