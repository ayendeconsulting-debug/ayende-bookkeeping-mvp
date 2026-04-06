import { Injectable } from '@nestjs/common';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const PDFDocument = require('pdfkit') as typeof import('pdfkit');
import { YearEndReport } from './year-end.service';

@Injectable()
export class YearEndExportService {
  async generatePdf(report: YearEndReport): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ margin: 50, size: 'LETTER' });
      const chunks: Buffer[] = [];
      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      // ── Header ────────────────────────────────────────────────────────────
      doc.fontSize(18).font('Helvetica-Bold').text('Tempo Books', { align: 'center' });
      doc.fontSize(13).font('Helvetica').text(report.business_name, { align: 'center' });
      doc.fontSize(11).font('Helvetica-Bold').text('Year-End Review', { align: 'center' });
      doc.fontSize(9).font('Helvetica')
        .text(`Fiscal Year Ending: ${report.fiscal_year_end}`, { align: 'center' });
      doc.fontSize(9)
        .text(`Generated: ${new Date(report.generated_at).toLocaleString('en-CA')}`, { align: 'center' });
      doc.moveDown(0.5);
      doc.moveTo(50, doc.y).lineTo(560, doc.y).stroke();
      doc.moveDown(0.5);

      // ── Financial Summary ─────────────────────────────────────────────────
      doc.fontSize(12).font('Helvetica-Bold').text('Financial Summary');
      doc.moveDown(0.4);

      const summaryRows = [
        ['Total Revenue', `$${report.total_revenue.toFixed(2)}`],
        ['Total Expenses', `$${report.total_expenses.toFixed(2)}`],
        ['Net Income', `$${report.net_income.toFixed(2)}`],
        ['Uncategorised Transactions', `${report.uncategorised_count} ($${report.uncategorised_total.toFixed(2)})`],
      ];

      for (const [label, value] of summaryRows) {
        const y = doc.y;
        const isNetIncome = label === 'Net Income';
        const color = isNetIncome && report.net_income < 0 ? 'red' : 'black';
        doc.fontSize(9).font('Helvetica').text(label, 50, y, { width: 360 });
        doc.fillColor(color).fontSize(9).font('Helvetica-Bold')
          .text(value, 420, y, { width: 140, align: 'right' });
        doc.fillColor('black');
        doc.moveDown(0.4);
      }

      // ── Top Expense Categories ────────────────────────────────────────────
      if (report.top_expense_categories.length > 0) {
        doc.moveDown(0.3);
        doc.fontSize(11).font('Helvetica-Bold').text('Top Expense Categories');
        doc.moveDown(0.3);
        for (const exp of report.top_expense_categories) {
          const y = doc.y;
          doc.fontSize(9).font('Helvetica').text(exp.account, 50, y, { width: 360 });
          doc.fontSize(9).font('Helvetica-Bold')
            .text(`$${exp.amount.toFixed(2)}`, 420, y, { width: 140, align: 'right' });
          doc.moveDown(0.35);
        }
      }

      // ── Executive Summary ─────────────────────────────────────────────────
      doc.moveDown(0.5);
      doc.moveTo(50, doc.y).lineTo(560, doc.y).stroke();
      doc.moveDown(0.5);
      doc.fontSize(11).font('Helvetica-Bold').text('Executive Summary');
      doc.moveDown(0.3);
      doc.fontSize(9).font('Helvetica').text(report.executive_summary, { width: 510 });
      doc.moveDown(0.5);

      // ── Observations ──────────────────────────────────────────────────────
      if (report.observations.length > 0) {
        doc.moveTo(50, doc.y).lineTo(560, doc.y).stroke();
        doc.moveDown(0.5);
        doc.fontSize(11).font('Helvetica-Bold').text('Key Observations');
        doc.moveDown(0.3);
        for (const obs of report.observations) {
          doc.fontSize(9).font('Helvetica-Bold').text(obs.category, { continued: true });
          doc.font('Helvetica').text(`: ${obs.detail}`, { width: 510 });
          doc.moveDown(0.35);
        }
      }

      // ── Suggested Adjustments ─────────────────────────────────────────────
      if (report.suggested_adjustments.length > 0) {
        doc.moveDown(0.3);
        doc.moveTo(50, doc.y).lineTo(560, doc.y).stroke();
        doc.moveDown(0.5);
        doc.fontSize(11).font('Helvetica-Bold').text('Suggested Adjusting Entries');
        doc.moveDown(0.2);
        doc.fontSize(8).font('Helvetica').fillColor('#666666')
          .text('Note: These are suggestions only. Review with your accountant before posting.', { width: 510 });
        doc.fillColor('black');
        doc.moveDown(0.3);

        for (let i = 0; i < report.suggested_adjustments.length; i++) {
          const adj = report.suggested_adjustments[i];
          // Page break check
          if (doc.y > 650) { doc.addPage(); }
          doc.fontSize(9).font('Helvetica-Bold')
            .text(`${i + 1}. ${adj.description}`, { width: 510 });
          doc.fontSize(8).font('Helvetica')
            .text(`Debit: ${adj.debit_account}  |  Credit: ${adj.credit_account}${adj.estimated_amount ? `  |  Est. Amount: ${adj.estimated_amount}` : ''}`,
              { width: 510 });
          doc.moveDown(0.4);
        }
      }

      // ── Year-End Checklist ────────────────────────────────────────────────
      if (report.checklist.length > 0) {
        doc.moveDown(0.3);
        doc.moveTo(50, doc.y).lineTo(560, doc.y).stroke();
        doc.moveDown(0.5);
        doc.fontSize(11).font('Helvetica-Bold').text('Year-End Checklist');
        doc.moveDown(0.3);
        for (const item of report.checklist) {
          if (doc.y > 680) { doc.addPage(); }
          const y = doc.y;
          // Checkbox square
          doc.rect(50, y + 1, 8, 8).stroke();
          doc.fontSize(9).font('Helvetica').text(item, 65, y, { width: 495 });
          doc.moveDown(0.4);
        }
      }

      // ── Disclaimer ────────────────────────────────────────────────────────
      doc.moveDown(0.5);
      doc.moveTo(50, doc.y).lineTo(560, doc.y).stroke();
      doc.moveDown(0.5);
      doc.fontSize(7.5).font('Helvetica').fillColor('#666666')
        .text(
          'This year-end review is generated by Tempo Books AI and is for informational purposes only. ' +
          'It does not constitute professional accounting, tax, or legal advice. ' +
          'Please consult a qualified Canadian accountant before filing your tax return.',
          { width: 510 },
        );
      doc.fillColor('black');

      doc.end();
    });
  }
}
