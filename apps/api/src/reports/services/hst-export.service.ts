import { Injectable } from '@nestjs/common';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const PDFDocument = require('pdfkit') as typeof import('pdfkit');
import { CraRemittanceReport } from './hst-report.service';

@Injectable()
export class HstExportService {

  // ── PDF ───────────────────────────────────────────────────────────────────
  async generatePdf(
    data: CraRemittanceReport,
    businessName: string,
    hstNumber?: string | null,
  ): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ margin: 50, size: 'LETTER' });
      const chunks: Buffer[] = [];
      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end',  () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      // ── Header ────────────────────────────────────────────────────────────
      doc.fontSize(18).font('Helvetica-Bold').text('Tempo Books', { align: 'center' });
      doc.fontSize(13).font('Helvetica').text(businessName, { align: 'center' });
      doc.fontSize(11).font('Helvetica-Bold').text('GST/HST Remittance Report', { align: 'center' });
      doc.fontSize(9).font('Helvetica')
        .text(`Period: ${data.period.period_start} to ${data.period.period_end}`, { align: 'center' });
      if (hstNumber) {
        doc.fontSize(9).text(`HST/GST Registration: ${hstNumber}`, { align: 'center' });
      } else {
        doc.fontSize(9).fillColor('red')
          .text('HST registration number not set — add in Tax Settings', { align: 'center' });
        doc.fillColor('black');
      }
      doc.fontSize(9).text(`Generated: ${new Date().toLocaleString('en-CA')}`, { align: 'center' });
      doc.moveDown(0.5);
      doc.moveTo(50, doc.y).lineTo(560, doc.y).stroke();
      doc.moveDown(0.5);

      // ── GST34 Lines ───────────────────────────────────────────────────────
      doc.fontSize(12).font('Helvetica-Bold').text('GST/HST Return Summary');
      doc.moveDown(0.4);

      const gstLines = [
        { line: '101', label: 'Total Sales and Other Revenue',       amount: data.line_101_total_sales,   note: '' },
        { line: '103', label: 'GST/HST Collected or Collectible',    amount: data.line_103_hst_collected,  note: '' },
        { line: '106', label: 'Input Tax Credits (ITCs)',             amount: data.line_106_itc_claimed,    note: '' },
        { line: '109', label: 'Net Tax (Line 103 minus Line 106)',    amount: data.line_109_net_tax,        note: '' },
        { line: '111', label: 'Instalments Already Paid',            amount: data.line_111_instalments,    note: '' },
        { line: '113', label: 'Balance Owing / Refund Claimed',      amount: data.line_113_balance,        note: data.line_113_balance > 0 ? 'OWING' : data.line_113_balance < 0 ? 'REFUND' : '' },
      ];

      for (const row of gstLines) {
        const y = doc.y;
        const isSummary = row.line === '109' || row.line === '113';
        const font = isSummary ? 'Helvetica-Bold' : 'Helvetica';
        const size = isSummary ? 10 : 9;

        if (row.line === '109' || row.line === '111') {
          doc.moveDown(0.3);
          doc.moveTo(50, doc.y).lineTo(560, doc.y).dash(2, { space: 2 }).stroke().undash();
          doc.moveDown(0.3);
        }

        const lineY = doc.y;
        doc.fontSize(size).font('Helvetica-Bold')
          .text(`Line ${row.line}`, 50, lineY, { width: 50 });
        doc.fontSize(size).font(font)
          .text(row.label, 110, lineY, { width: 310 });

        const amtColor = row.line === '113' && row.amount < 0 ? 'green'
          : row.line === '113' && row.amount > 0 ? 'red' : 'black';
        doc.fillColor(amtColor).fontSize(size).font('Helvetica-Bold')
          .text(`$${Math.abs(row.amount).toFixed(2)}`, 420, lineY, { width: 90, align: 'right' });
        doc.fillColor('black');

        if (row.note) {
          const noteColor = row.note === 'REFUND' ? 'green' : 'red';
          doc.fillColor(noteColor).fontSize(8).font('Helvetica-Bold')
            .text(row.note, 515, lineY, { width: 45, align: 'right' });
          doc.fillColor('black');
        }
        doc.moveDown(0.5);
      }

      // ── ITC Summary ───────────────────────────────────────────────────────
      doc.moveDown(0.5);
      doc.moveTo(50, doc.y).lineTo(560, doc.y).stroke();
      doc.moveDown(0.5);
      doc.fontSize(11).font('Helvetica-Bold').text('ITC Summary');
      doc.moveDown(0.3);

      const itcRows = [
        ['Total Input Tax Paid',       `$${data.total_input_tax.toFixed(2)}`],
        ['ITC Eligible (Recoverable)', `$${data.line_106_itc_claimed.toFixed(2)}`],
        ['Non-Recoverable Portion',    `$${data.total_itc_non_recoverable.toFixed(2)}`],
      ];

      for (const [label, amount] of itcRows) {
        const y = doc.y;
        doc.fontSize(9).font('Helvetica')
          .text(label, 50, y, { width: 360 });
        doc.fontSize(9).font('Helvetica-Bold')
          .text(amount, 420, y, { width: 90, align: 'right' });
        doc.moveDown(0.4);
      }

      if (data.unposted_transaction_count > 0) {
        doc.moveDown(0.3);
        doc.fontSize(9).fillColor('orange').font('Helvetica-Bold')
          .text(
            `⚠ Warning: ${data.unposted_transaction_count} unposted transaction(s) exist within this period. ` +
            'This report may be incomplete.',
          );
        doc.fillColor('black');
      }

      // ── Transaction Breakdown ─────────────────────────────────────────────
      if (data.transactions && data.transactions.length > 0) {
        doc.moveDown(0.5);
        doc.moveTo(50, doc.y).lineTo(560, doc.y).stroke();
        doc.moveDown(0.5);
        doc.fontSize(11).font('Helvetica-Bold').text('Transaction Breakdown');
        doc.moveDown(0.4);

        // Column headers
        const hY = doc.y;
        doc.fontSize(8).font('Helvetica-Bold')
          .text('Date',        50,  hY, { width: 65 })
          .text('Description', 115, hY, { width: 175 })
          .text('Tax Code',    290, hY, { width: 70 })
          .text('Type',        360, hY, { width: 40 })
          .text('Tax Amt',     400, hY, { width: 70, align: 'right' })
          .text('ITC Amt',     470, hY, { width: 70, align: 'right' });
        doc.moveDown(0.3);
        doc.moveTo(50, doc.y).lineTo(560, doc.y).dash(1, { space: 2 }).stroke().undash();
        doc.moveDown(0.3);

        for (const tx of data.transactions) {
          // Page break check
          if (doc.y > 680) {
            doc.addPage();
            doc.fontSize(8).font('Helvetica-Bold')
              .text('Date', 50, 50, { width: 65 })
              .text('Description', 115, 50, { width: 175 })
              .text('Tax Code', 290, 50, { width: 70 })
              .text('Type', 360, 50, { width: 40 })
              .text('Tax Amt', 400, 50, { width: 70, align: 'right' })
              .text('ITC Amt', 470, 50, { width: 70, align: 'right' });
            doc.moveTo(50, 60).lineTo(560, 60).stroke();
            doc.y = 70;
          }

          const tY = doc.y;
          const dateStr = tx.entry_date
            ? new Date(tx.entry_date).toLocaleDateString('en-CA')
            : '';
          const desc = (tx.description ?? '').substring(0, 28);

          doc.fontSize(7.5).font('Helvetica')
            .text(dateStr,       50,  tY, { width: 65 })
            .text(desc,          115, tY, { width: 175 })
            .text(tx.tax_code,   290, tY, { width: 70 })
            .text(tx.tax_type,   360, tY, { width: 40 })
            .text(`$${tx.tax_amount.toFixed(2)}`,  400, tY, { width: 70, align: 'right' })
            .text(tx.itc_amount > 0 ? `$${tx.itc_amount.toFixed(2)}` : '-', 470, tY, { width: 70, align: 'right' });
          doc.moveDown(0.35);
        }

        // Totals row
        doc.moveDown(0.2);
        doc.moveTo(50, doc.y).lineTo(560, doc.y).stroke();
        doc.moveDown(0.3);
        const totY = doc.y;
        const totalTax = data.transactions.reduce((s, t) => s + t.tax_amount, 0);
        const totalItc = data.transactions.reduce((s, t) => s + t.itc_amount, 0);
        doc.fontSize(8).font('Helvetica-Bold')
          .text('Totals', 50, totY, { width: 350 })
          .text(`$${totalTax.toFixed(2)}`, 400, totY, { width: 70, align: 'right' })
          .text(`$${totalItc.toFixed(2)}`, 470, totY, { width: 70, align: 'right' });
      }

      // ── Disclaimer (NFR-9.8 — always on last page) ────────────────────────
      doc.moveDown(1);
      doc.moveTo(50, doc.y).lineTo(560, doc.y).stroke();
      doc.moveDown(0.5);
      doc.fontSize(8).font('Helvetica').fillColor('#666666')
        .text(data.disclaimer, { align: 'left' });
      doc.fillColor('black');

      doc.end();
    });
  }

  // ── CSV ───────────────────────────────────────────────────────────────────
  generateCsv(
    data: CraRemittanceReport,
    businessName: string,
    hstNumber?: string | null,
  ): string {
    const rows: string[] = [
      `GST/HST Remittance Report`,
      `Business,"${businessName}"`,
      `HST/GST Registration,"${hstNumber ?? 'Not set'}"`,
      `Period,"${data.period.period_start} to ${data.period.period_end}"`,
      `Generated,"${new Date().toLocaleString('en-CA')}"`,
      '',
      'GST34 Lines',
      'Line,Description,Amount',
      `101,Total Sales and Other Revenue,${data.line_101_total_sales.toFixed(2)}`,
      `103,GST/HST Collected or Collectible,${data.line_103_hst_collected.toFixed(2)}`,
      `106,Input Tax Credits (ITCs),${data.line_106_itc_claimed.toFixed(2)}`,
      `109,Net Tax (Line 103 minus Line 106),${data.line_109_net_tax.toFixed(2)}`,
      `111,Instalments Already Paid,${data.line_111_instalments.toFixed(2)}`,
      `113,Balance Owing / Refund Claimed,${data.line_113_balance.toFixed(2)}`,
      '',
      'ITC Summary',
      `Total Input Tax Paid,${data.total_input_tax.toFixed(2)}`,
      `ITC Eligible (Recoverable),${data.line_106_itc_claimed.toFixed(2)}`,
      `Non-Recoverable Portion,${data.total_itc_non_recoverable.toFixed(2)}`,
    ];

    if (data.unposted_transaction_count > 0) {
      rows.push('');
      rows.push(`WARNING,${data.unposted_transaction_count} unposted transactions exist within this period`);
    }

    if (data.transactions && data.transactions.length > 0) {
      rows.push('');
      rows.push('Transaction Breakdown');
      rows.push('Date,Description,Tax Code,Tax Code Name,Tax Type,Tax Category,Gross Amount,Tax Amount,ITC Rate,ITC Amount');
      for (const tx of data.transactions) {
        const dateStr = tx.entry_date
          ? new Date(tx.entry_date).toLocaleDateString('en-CA')
          : '';
        rows.push(
          `${dateStr},"${(tx.description ?? '').replace(/"/g, '""')}",${tx.tax_code},"${tx.tax_code_name}",${tx.tax_type},${tx.tax_category ?? ''},${tx.gross_amount.toFixed(2)},${tx.tax_amount.toFixed(2)},${tx.itc_rate.toFixed(4)},${tx.itc_amount.toFixed(2)}`
        );
      }
    }

    rows.push('');
    rows.push(`Disclaimer,"${data.disclaimer}"`);

    return rows.join('\r\n');
  }
}
