export interface InvoiceEmailVars {
  clientName: string;
  businessName: string;
  invoiceNumber: string;
  issueDate: string;
  dueDate: string;
  total: string;
  lineItems: { description: string; quantity: number; unit_price: number; line_total: number }[];
  notes?: string | null;
  stripePaymentLink?: string | null;
  isReminder?: boolean;
  daysUntilDue?: number;
  isOverdue?: boolean;
}

export function invoiceEmailTemplate(vars: InvoiceEmailVars): { subject: string; html: string } {
  const green = '#0F6E56';
  const gray  = '#6B7280';

  let subject: string;
  if (vars.isOverdue) {
    subject = `OVERDUE: Invoice ${vars.invoiceNumber} from ${vars.businessName}`;
  } else if (vars.isReminder) {
    subject = `Reminder: Invoice ${vars.invoiceNumber} due in ${vars.daysUntilDue} day${vars.daysUntilDue === 1 ? '' : 's'}`;
  } else {
    subject = `Invoice ${vars.invoiceNumber} from ${vars.businessName}`;
  }

  const lineItemsHtml = vars.lineItems.map((item) => `
    <tr>
      <td style="padding:8px 12px;border-bottom:1px solid #f3f4f6;color:#374151;">${item.description}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #f3f4f6;color:#374151;text-align:center;">${item.quantity}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #f3f4f6;color:#374151;text-align:right;">$${Number(item.unit_price).toFixed(2)}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #f3f4f6;color:#374151;text-align:right;font-weight:600;">$${Number(item.line_total).toFixed(2)}</td>
    </tr>
  `).join('');

  const reminderBanner = (vars.isOverdue || vars.isReminder) ? `
    <div style="background:${vars.isOverdue ? '#FEF2F2' : '#FFFBEB'};border:1px solid ${vars.isOverdue ? '#FECACA' : '#FDE68A'};border-radius:8px;padding:12px 16px;margin-bottom:24px;">
      <p style="margin:0;font-size:14px;color:${vars.isOverdue ? '#B91C1C' : '#92400E'};">
        ${vars.isOverdue
          ? `This invoice is <strong>overdue</strong>. Please arrange payment at your earliest convenience.`
          : `This is a friendly reminder that invoice ${vars.invoiceNumber} is due in <strong>${vars.daysUntilDue} day${vars.daysUntilDue === 1 ? '' : 's'}</strong>.`}
      </p>
    </div>
  ` : '';

  const payNowButton = vars.stripePaymentLink ? `
    <div style="text-align:center;margin:32px 0;">
      <a href="${vars.stripePaymentLink}"
        style="display:inline-block;background:${green};color:#ffffff;text-decoration:none;padding:14px 32px;border-radius:8px;font-size:16px;font-weight:600;">
        Pay Now
      </a>
    </div>
  ` : '';

  const html = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f9fafb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <div style="max-width:600px;margin:40px auto;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1);">

    <!-- Header -->
    <div style="background:${green};padding:28px 32px;">
      <div style="font-size:22px;font-weight:700;color:#ffffff;letter-spacing:-0.3px;">Tempo Books</div>
      <div style="font-size:13px;color:rgba(255,255,255,0.75);margin-top:2px;">Invoice from ${vars.businessName}</div>
    </div>

    <!-- Body -->
    <div style="padding:32px;">
      ${reminderBanner}

      <h1 style="margin:0 0 4px;font-size:20px;color:#111827;">Invoice ${vars.invoiceNumber}</h1>
      <p style="margin:0 0 24px;font-size:14px;color:${gray};">
        To: <strong>${vars.clientName}</strong> &nbsp;&middot;&nbsp;
        Issue date: ${vars.issueDate} &nbsp;&middot;&nbsp;
        Due date: <strong>${vars.dueDate}</strong>
      </p>

      <!-- Line items -->
      <table style="width:100%;border-collapse:collapse;margin-bottom:16px;">
        <thead>
          <tr style="background:#f9fafb;">
            <th style="padding:8px 12px;text-align:left;font-size:12px;color:${gray};font-weight:600;text-transform:uppercase;letter-spacing:0.05em;">Description</th>
            <th style="padding:8px 12px;text-align:center;font-size:12px;color:${gray};font-weight:600;text-transform:uppercase;letter-spacing:0.05em;">Qty</th>
            <th style="padding:8px 12px;text-align:right;font-size:12px;color:${gray};font-weight:600;text-transform:uppercase;letter-spacing:0.05em;">Rate</th>
            <th style="padding:8px 12px;text-align:right;font-size:12px;color:${gray};font-weight:600;text-transform:uppercase;letter-spacing:0.05em;">Amount</th>
          </tr>
        </thead>
        <tbody>${lineItemsHtml}</tbody>
      </table>

      <!-- Total -->
      <div style="text-align:right;padding:12px 12px;background:#f9fafb;border-radius:8px;margin-bottom:24px;">
        <span style="font-size:16px;color:${gray};">Total Due: </span>
        <span style="font-size:22px;font-weight:700;color:${green};">${vars.total}</span>
      </div>

      ${vars.notes ? `<p style="font-size:14px;color:${gray};border-top:1px solid #f3f4f6;padding-top:16px;">${vars.notes}</p>` : ''}

      ${payNowButton}

    </div>

    <!-- Footer -->
    <div style="padding:16px 32px;background:#f9fafb;border-top:1px solid #f3f4f6;text-align:center;">
      <p style="margin:0;font-size:12px;color:#9CA3AF;">
        Sent via <a href="https://gettempo.ca" style="color:${green};text-decoration:none;">Tempo Books</a>
      </p>
    </div>
  </div>
</body>
</html>`;

  return { subject, html };
}
