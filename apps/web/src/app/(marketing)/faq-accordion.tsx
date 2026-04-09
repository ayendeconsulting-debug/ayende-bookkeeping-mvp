'use client';

import { useState } from 'react';
import { ChevronDown } from 'lucide-react';

const FAQS = [
  {
    q: 'Is Tempo really free to try?',
    a: "Yes — 60 full days, no skipped features. You get access to everything on your chosen plan from day one. If you decide it's not for you before day 60, cancel and owe nothing. After your trial, Starter continues automatically at $10 CAD/mo — no action needed.",
  },
  {
    q: 'What countries does Tempo support?',
    a: 'Tempo is built primarily for Canadian businesses — with a full HST/GST tax engine, CRA remittance reporting (GST34 lines 101–113), and Canadian bank connectivity via Plaid. US businesses are fully supported as well, with IRS-compatible reports and USD currency handling. Canadian bank sync via Plaid is in active expansion.',
  },
  {
    q: 'How does bank connectivity work?',
    a: "Tempo uses Plaid — the same bank connection technology used by major fintech apps. You authenticate directly with your bank in a secure Plaid-hosted flow. Tempo receives read-only access to your transactions and can never move money or initiate payments. Your login credentials are never stored on our servers.",
  },
  {
    q: 'Is my financial data secure?',
    a: 'Yes. All data is encrypted at rest and in transit. Bank connections are read-only via Plaid. Your financial data is never shared with third parties or used to train AI models. Each business operates in a fully isolated data environment — no cross-tenant access is architecturally possible.',
  },
  {
    q: 'Can I import my existing data?',
    a: 'Yes. Upload CSV or PDF bank statements and Tempo will parse, deduplicate, and classify them automatically. This means you can backfill historical data from before you joined. If you have existing transactions from another system, export them as CSV and import directly.',
  },
  {
    q: 'What reports does Tempo generate?',
    a: 'Tempo generates an Income Statement (Profit & Loss), Balance Sheet, Trial Balance, and General Ledger — all built on double-entry accounting. For Canadian businesses, a CRA remittance report with GST34 lines pre-calculated is always available. All reports are filterable by date range and exportable as PDF or CSV.',
  },
  {
    q: 'Does Tempo handle HST, GST, and sales tax?',
    a: 'Yes — this is one of Tempo\'s core strengths. Every transaction with a tax code automatically splits the net amount and tax portion into separate journal lines, posting the tax to the correct liability account. Your CRA remittance report with GST34 lines 101–113 is always pre-calculated and export-ready.',
  },
  {
    q: 'Can my accountant access my books?',
    a: 'Yes. Invite your accountant by email and assign them an Accountant role. They get full read access plus the ability to request edit access for specific transactions — with every change logged in the dual audit trail. For bookkeeping firms, the Accountant Portal gives them a dedicated dashboard to manage all their clients in one place.',
  },
  {
    q: 'What happens when my trial ends?',
    a: "If you're on Starter, your plan auto-continues at $10 CAD/mo — no action needed. For Pro or Accountant, you'll receive a reminder before your trial ends and can activate billing with one click. If you cancel before day 60, you pay nothing and your data remains accessible for 30 days.",
  },
  {
    q: 'Can I cancel at any time?',
    a: "Yes. Cancel your subscription at any time from the Settings page — no cancellation fees, no friction. You keep full access until the end of your current billing period. We don't believe in making it hard to leave.",
  },
];

export function FaqAccordion() {
  const [open, setOpen] = useState<number | null>(null);

  return (
    <div className="divide-y divide-border">
      {FAQS.map((faq, i) => (
        <div key={i}>
          <button
            onClick={() => setOpen(open === i ? null : i)}
            className="w-full flex items-center justify-between gap-4 py-5 text-left group"
          >
            <span className="text-base font-medium text-foreground group-hover:text-[#0F6E56] transition-colors">
              {faq.q}
            </span>
            <ChevronDown
              className={[
                'w-5 h-5 text-muted-foreground flex-shrink-0 transition-transform duration-200',
                open === i ? 'rotate-180 text-[#0F6E56]' : '',
              ].join(' ')}
            />
          </button>
          {open === i && (
            <div className="pb-5">
              <p className="text-sm text-muted-foreground leading-relaxed">{faq.a}</p>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
