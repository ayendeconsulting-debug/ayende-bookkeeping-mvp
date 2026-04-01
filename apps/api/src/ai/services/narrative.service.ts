import { Injectable } from '@nestjs/common';
import { LlmService } from './llm.service';
import { IncomeStatementReport } from '../../reports/services/income-statement.service';
import { BalanceSheetReport } from '../../reports/services/balance-sheet.service';
import { IncomeStatementService } from '../../reports/services/income-statement.service';
import { BalanceSheetService } from '../../reports/services/balance-sheet.service';
import { ReportFilterDto } from '../../reports/dto/report-filter.dto';

export interface ReportWithNarrative<T> {
  report: T;
  narrative: string;
}

@Injectable()
export class NarrativeService {
  constructor(
    private readonly llmService: LlmService,
    private readonly incomeStatementService: IncomeStatementService,
    private readonly balanceSheetService: BalanceSheetService,
  ) {}

  async incomeStatementWithNarrative(
    filter: ReportFilterDto,
    businessName: string,
  ): Promise<ReportWithNarrative<IncomeStatementReport>> {
    const report = await this.incomeStatementService.generate(filter);

    const topRevenue = report.revenue.slice(0, 3).map(r => `${r.account_name}: $${r.net_amount.toFixed(2)}`).join(', ');
    const topExpenses = report.expenses.slice(0, 3).map(e => `${e.account_name}: $${e.net_amount.toFixed(2)}`).join(', ');

    const systemPrompt = `You are a friendly bookkeeping assistant explaining financial reports to a small business owner. 
Use plain, non-technical English. Be concise — 3 to 5 sentences maximum. Focus on what matters most to the owner.`;

    const userPrompt = `Explain this Income Statement for ${businessName}:
Period: ${report.start_date} to ${report.end_date}
Total Revenue: $${report.total_revenue.toFixed(2)}
Total Expenses: $${report.total_expenses.toFixed(2)}
Net Income: $${report.net_income.toFixed(2)}
Top Revenue Sources: ${topRevenue || 'none'}
Top Expenses: ${topExpenses || 'none'}

Write a plain English summary a non-accountant business owner would understand.`;

    const narrative = await this.llmService.complete(systemPrompt, userPrompt);

    return { report, narrative };
  }

  async balanceSheetWithNarrative(
    filter: ReportFilterDto,
    businessName: string,
  ): Promise<ReportWithNarrative<BalanceSheetReport>> {
    const report = await this.balanceSheetService.generate(filter);

    const systemPrompt = `You are a friendly bookkeeping assistant explaining financial reports to a small business owner.
Use plain, non-technical English. Be concise — 3 to 5 sentences. Focus on financial health and what the owner should pay attention to.`;

    const userPrompt = `Explain this Balance Sheet for ${businessName}:
As of: ${report.as_of_date}
Total Assets: $${report.total_assets.toFixed(2)}
Total Liabilities: $${report.total_liabilities.toFixed(2)}
Total Equity: $${report.total_equity.toFixed(2)}
Is Balanced: ${report.is_balanced ? 'Yes' : 'No — investigate immediately'}

Key assets: ${report.assets.slice(0, 3).map(a => `${a.account_name}: $${a.balance.toFixed(2)}`).join(', ') || 'none'}
Key liabilities: ${report.liabilities.slice(0, 3).map(l => `${l.account_name}: $${l.balance.toFixed(2)}`).join(', ') || 'none'}

Write a plain English summary a non-accountant business owner would understand.`;

    const narrative = await this.llmService.complete(systemPrompt, userPrompt);

    return { report, narrative };
  }
}
