import { Injectable } from '@nestjs/common';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const PDFDocument = require('pdfkit') as typeof import('pdfkit');
import { IncomeStatementReport } from './income-statement.service';
import { BalanceSheetReport } from './balance-sheet.service';
import { TrialBalanceReport } from './trial-balance.service';
import { GeneralLedgerReport, GeneralLedgerAccountReport } from './general-ledger.service';

type AnyReport =
  | IncomeStatementReport
  | BalanceSheetReport
  | TrialBalanceReport
  | GeneralLedgerReport;

@Injectable()
export class ExportService {
  // â”€â”€ PDF â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  async generatePdf(reportType: string, data: AnyReport, businessName: string): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const doc    = new PDFDocument({ margin: 50, size: 'LETTER' });
      const chunks: Buffer[] = [];
      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end',  () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      // Header
      doc.fontSize(18).font('Helvetica-Bold').text('Tempo Bookkeeping', { align: 'center' });
      doc.fontSize(13).font('Helvetica').text(businessName, { align: 'center' });
      doc.fontSize(11).text(this.getReportTitle(reportType), { align: 'center' });
      doc.fontSize(9).text(`Generated: ${new Date().toLocaleString('en-CA')}`, { align: 'center' });
      doc.moveDown();
      doc.moveTo(50, doc.y).lineTo(560, doc.y).stroke();
      doc.moveDown(0.5);

      switch (reportType) {
        case 'income-statement': this.renderIncomeStatementPdf(doc, data as IncomeStatementReport); break;
        case 'balance-sheet':    this.renderBalanceSheetPdf(doc,    data as BalanceSheetReport);    break;
        case 'trial-balance':    this.renderTrialBalancePdf(doc,    data as TrialBalanceReport);    break;
        case 'general-ledger':   this.renderGeneralLedgerPdf(doc,   data as GeneralLedgerReport);   break;
      }

      doc.end();
    });
  }

  private renderIncomeStatementPdf(doc: PDFKit.PDFDocument, data: IncomeStatementReport): void {
    doc.fontSize(10).font('Helvetica').text(`Period: ${data.start_date} to ${data.end_date}`);
    doc.moveDown();

    doc.fontSize(11).font('Helvetica-Bold').text('REVENUE');
    doc.moveDown(0.3);
    for (const line of data.revenue) {
      doc.fontSize(10).font('Helvetica')
        .text(`  ${line.account_code} - ${line.account_name}`, { continued: true })
        .text(`$${line.net_amount.toFixed(2)}`, { align: 'right' });
    }
    doc.fontSize(10).font('Helvetica-Bold')
      .text('Total Revenue', { continued: true })
      .text(`$${data.total_revenue.toFixed(2)}`, { align: 'right' });

    doc.moveDown();
    doc.fontSize(11).font('Helvetica-Bold').text('EXPENSES');
    doc.moveDown(0.3);
    for (const line of data.expenses) {
      doc.fontSize(10).font('Helvetica')
        .text(`  ${line.account_code} - ${line.account_name}`, { continued: true })
        .text(`$${line.net_amount.toFixed(2)}`, { align: 'right' });
    }
    doc.fontSize(10).font('Helvetica-Bold')
      .text('Total Expenses', { continued: true })
      .text(`$${data.total_expenses.toFixed(2)}`, { align: 'right' });

    doc.moveDown();
    doc.moveTo(50, doc.y).lineTo(560, doc.y).stroke();
    doc.moveDown(0.3);
    doc.fontSize(12).font('Helvetica-Bold')
      .text('NET INCOME', { continued: true })
      .text(`$${data.net_income.toFixed(2)}`, { align: 'right' });
  }

  private renderBalanceSheetPdf(doc: PDFKit.PDFDocument, data: BalanceSheetReport): void {
    doc.fontSize(10).font('Helvetica').text(`As of: ${data.as_of_date}`);
    doc.moveDown();

    const renderSection = (title: string, lines: any[], total: number) => {
      doc.fontSize(11).font('Helvetica-Bold').text(title);
      doc.moveDown(0.3);
      for (const line of lines) {
        doc.fontSize(10).font('Helvetica')
          .text(`  ${line.account_code} - ${line.account_name}`, { continued: true })
          .text(`$${line.balance.toFixed(2)}`, { align: 'right' });
      }
      doc.fontSize(10).font('Helvetica-Bold')
        .text(`Total ${title}`, { continued: true })
        .text(`$${total.toFixed(2)}`, { align: 'right' });
      doc.moveDown();
    };

    renderSection('ASSETS',      data.assets,      data.total_assets);
    renderSection('LIABILITIES', data.liabilities, data.total_liabilities);
    renderSection('EQUITY',      data.equity,      data.total_equity);

    doc.moveTo(50, doc.y).lineTo(560, doc.y).stroke();
    doc.moveDown(0.3);
    const liabPlusEquity = data.total_liabilities + data.total_equity;
    doc.fontSize(12).font('Helvetica-Bold')
      .text('LIABILITIES + EQUITY', { continued: true })
      .text(`$${liabPlusEquity.toFixed(2)}`, { align: 'right' });
    doc.fontSize(9).font('Helvetica').fillColor(data.is_balanced ? 'green' : 'red')
      .text(data.is_balanced ? 'âœ“ Balanced' : 'âœ— Out of balance', { align: 'right' });
    doc.fillColor('black');
  }

  private renderTrialBalancePdf(doc: PDFKit.PDFDocument, data: TrialBalanceReport): void {
    doc.fontSize(10).font('Helvetica').text(`Period: ${data.start_date} to ${data.end_date}`);
    doc.moveDown();

    const y0 = doc.y;
    doc.fontSize(10).font('Helvetica-Bold')
      .text('Account', 50, y0, { width: 280 })
      .text('Debits',  330, y0 - doc.currentLineHeight(), { width: 110, align: 'right' })
      .text('Credits', 440, y0 - doc.currentLineHeight(), { width: 110, align: 'right' });
    doc.moveDown(0.3);
    doc.moveTo(50, doc.y).lineTo(560, doc.y).stroke();
    doc.moveDown(0.3);

    for (const line of data.lines) {
      const y = doc.y;
      doc.fontSize(9).font('Helvetica')
        .text(`${line.account_code} - ${line.account_name}`, 50, y, { width: 280 })
        .text(`$${line.total_debits.toFixed(2)}`,  330, y, { width: 110, align: 'right' })
        .text(`$${line.total_credits.toFixed(2)}`, 440, y, { width: 110, align: 'right' });
      doc.moveDown(0.2);
    }

    doc.moveDown(0.3);
    doc.moveTo(50, doc.y).lineTo(560, doc.y).stroke();
    doc.moveDown(0.3);
    const y = doc.y;
    doc.fontSize(10).font('Helvetica-Bold')
      .text('TOTALS', 50, y, { width: 280 })
      .text(`$${data.grand_total_debits.toFixed(2)}`,  330, y, { width: 110, align: 'right' })
      .text(`$${data.grand_total_credits.toFixed(2)}`, 440, y, { width: 110, align: 'right' });
    doc.moveDown(0.5);
    doc.fontSize(9).font('Helvetica').fillColor(data.is_balanced ? 'green' : 'red')
      .text(data.is_balanced ? 'âœ“ Balanced' : 'âœ— Out of balance', { align: 'right' });
    doc.fillColor('black');
  }

  // Phase 13: updated to handle GeneralLedgerReport.accounts array
  private renderGeneralLedgerPdf(doc: PDFKit.PDFDocument, data: GeneralLedgerReport): void {
    doc.fontSize(10).font('Helvetica').text(`Period: ${data.start_date} to ${data.end_date}`);
    doc.moveDown();

    for (const account of data.accounts) {
      this.renderGeneralLedgerAccountPdf(doc, account);
      doc.moveDown();
    }

    if (data.accounts.length === 0) {
      doc.fontSize(10).font('Helvetica').text('No ledger entries found for this period.');
    }
  }

  private renderGeneralLedgerAccountPdf(
    doc: PDFKit.PDFDocument,
    account: GeneralLedgerAccountReport,
  ): void {
    doc.fontSize(11).font('Helvetica-Bold')
      .text(`${account.account_code} - ${account.account_name}`);
    doc.fontSize(9).font('Helvetica')
      .text(`Opening Balance: $${account.opening_balance.toFixed(2)}`);
    doc.moveDown(0.3);

    const y0 = doc.y;
    doc.fontSize(9).font('Helvetica-Bold')
      .text('Date',        50,  y0, { width: 80 })
      .text('Entry #',     130, y0, { width: 80 })
      .text('Description', 210, y0, { width: 160 })
      .text('Debit',       370, y0, { width: 60, align: 'right' })
      .text('Credit',      430, y0, { width: 60, align: 'right' })
      .text('Balance',     490, y0, { width: 70, align: 'right' });
    doc.moveDown(0.3);
    doc.moveTo(50, doc.y).lineTo(560, doc.y).stroke();
    doc.moveDown(0.3);

    for (const line of account.lines) {
      const y       = doc.y;
      const dateStr = new Date(line.entry_date).toLocaleDateString('en-CA');
      doc.fontSize(8).font('Helvetica')
        .text(dateStr,                                    50,  y, { width: 80 })
        .text(line.entry_number ?? '',                    130, y, { width: 80 })
        .text((line.description ?? '').substring(0, 30), 210, y, { width: 160 })
        .text(line.debit_amount  > 0 ? `$${line.debit_amount.toFixed(2)}`  : '', 370, y, { width: 60, align: 'right' })
        .text(line.credit_amount > 0 ? `$${line.credit_amount.toFixed(2)}` : '', 430, y, { width: 60, align: 'right' })
        .text(`$${line.running_balance.toFixed(2)}`,      490, y, { width: 70, align: 'right' });
      doc.moveDown(0.3);
    }

    doc.moveDown(0.2);
    doc.moveTo(50, doc.y).lineTo(560, doc.y).stroke();
    doc.moveDown(0.3);
    doc.fontSize(9).font('Helvetica-Bold')
      .text('Closing Balance', { continued: true })
      .text(`$${account.closing_balance.toFixed(2)}`, { align: 'right' });
  }

  // â”€â”€ CSV â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  generateCsv(reportType: string, data: AnyReport): string {
    switch (reportType) {
      case 'income-statement': return this.incomeStatementCsv(data as IncomeStatementReport);
      case 'balance-sheet':    return this.balanceSheetCsv(data as BalanceSheetReport);
      case 'trial-balance':    return this.trialBalanceCsv(data as TrialBalanceReport);
      case 'general-ledger':   return this.generalLedgerCsv(data as GeneralLedgerReport);
      default: return '';
    }
  }

  private incomeStatementCsv(data: IncomeStatementReport): string {
    const rows = [
      `Income Statement,${data.start_date} to ${data.end_date}`, '',
      'Type,Account Code,Account Name,Amount',
      ...data.revenue.map(l => `Revenue,${l.account_code},"${l.account_name}",${l.net_amount.toFixed(2)}`),
      `Total Revenue,,,${data.total_revenue.toFixed(2)}`, '',
      ...data.expenses.map(l => `Expense,${l.account_code},"${l.account_name}",${l.net_amount.toFixed(2)}`),
      `Total Expenses,,,${data.total_expenses.toFixed(2)}`, '',
      `Net Income,,,${data.net_income.toFixed(2)}`,
    ];
    return rows.join('\r\n');
  }

  private balanceSheetCsv(data: BalanceSheetReport): string {
    const rows = [
      `Balance Sheet,As of ${data.as_of_date}`, '',
      'Section,Account Code,Account Name,Subtype,Balance',
      ...data.assets.map(l =>      `Asset,${l.account_code},"${l.account_name}",${l.account_subtype},${l.balance.toFixed(2)}`),
      `Total Assets,,,,${data.total_assets.toFixed(2)}`, '',
      ...data.liabilities.map(l => `Liability,${l.account_code},"${l.account_name}",${l.account_subtype},${l.balance.toFixed(2)}`),
      `Total Liabilities,,,,${data.total_liabilities.toFixed(2)}`, '',
      ...data.equity.map(l =>      `Equity,${l.account_code},"${l.account_name}",${l.account_subtype},${l.balance.toFixed(2)}`),
      `Total Equity,,,,${data.total_equity.toFixed(2)}`, '',
      `Balanced,,,,${data.is_balanced ? 'Yes' : 'No'}`,
    ];
    return rows.join('\r\n');
  }

  private trialBalanceCsv(data: TrialBalanceReport): string {
    const rows = [
      `Trial Balance,${data.start_date} to ${data.end_date}`, '',
      'Account Code,Account Name,Account Type,Total Debits,Total Credits',
      ...data.lines.map(l =>
        `${l.account_code},"${l.account_name}",${l.account_type},${l.total_debits.toFixed(2)},${l.total_credits.toFixed(2)}`
      ),
      '',
      `Totals,,,${data.grand_total_debits.toFixed(2)},${data.grand_total_credits.toFixed(2)}`,
      `Balanced,,,,${data.is_balanced ? 'Yes' : 'No'}`,
    ];
    return rows.join('\r\n');
  }

  // Phase 13: updated to handle GeneralLedgerReport.accounts array
  private generalLedgerCsv(data: GeneralLedgerReport): string {
    const rows: string[] = [
      `General Ledger,${data.start_date} to ${data.end_date}`, '',
    ];

    for (const account of data.accounts) {
      rows.push(
        `Account,"${account.account_code} - ${account.account_name}"`,
        `Opening Balance,${account.opening_balance.toFixed(2)}`, '',
        'Date,Entry Number,Description,Debit,Credit,Running Balance',
        ...account.lines.map(l =>
          `${new Date(l.entry_date).toLocaleDateString('en-CA')},${l.entry_number ?? ''},"${(l.description ?? '').replace(/"/g, '""')}",${l.debit_amount.toFixed(2)},${l.credit_amount.toFixed(2)},${l.running_balance.toFixed(2)}`
        ),
        `Closing Balance,,,,,${account.closing_balance.toFixed(2)}`,
        '',
      );
    }

    if (data.accounts.length === 0) {
      rows.push('No ledger entries found for this period.');
    }

    return rows.join('\r\n');
  }

  private getReportTitle(reportType: string): string {
    const titles: Record<string, string> = {
      'income-statement': 'Income Statement',
      'balance-sheet':    'Balance Sheet',
      'trial-balance':    'Trial Balance',
      'general-ledger':   'General Ledger',
    };
    return titles[reportType] ?? reportType;
  }
}

