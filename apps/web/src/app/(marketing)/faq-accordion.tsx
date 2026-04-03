'use client';

import { useState } from 'react';
import { ChevronDown } from 'lucide-react';

const FAQS = [
  {
    q: 'Is Tempo really free to try?',
    a: 'Yes — every new account gets a full 60-day free trial with no credit card required. You get access to all features on the Pro plan during your trial so you can see exactly what you\'re getting before committing.',
  },
  {
    q: 'What countries does Tempo support?',
    a: 'Tempo is built specifically for Canadian and US small businesses. We support CAD and USD currencies, CRA and IRS tax reporting requirements, and connect to 12,000+ financial institutions in both countries via Plaid.',
  },
  {
    q: 'How does bank connectivity work?',
    a: 'Tempo uses Plaid, the industry standard for secure bank connectivity. Plaid connects to your bank using read-only access — we can see your transactions but we cannot move money. Your banking credentials are never stored on our servers.',
  },
  {
    q: 'Is my financial data secure?',
    a: 'Yes. All data is encrypted at rest using AES-256 encryption and in transit using TLS. We follow industry best practices for data security and access control. Sensitive credentials like bank tokens are encrypted before storage.',
  },
  {
    q: 'Can I import my existing data?',
    a: 'Yes. You can import transactions via CSV or PDF bank statements in addition to the live Plaid bank connection. This means you can backfill historical data from before you joined Tempo.',
  },
  {
    q: 'What reports does Tempo generate?',
    a: 'Tempo generates an Income Statement (Profit & Loss), Balance Sheet, Trial Balance, and General Ledger — all built on double-entry accounting principles. Reports are filterable by date range and exportable as PDF or CSV.',
  },
  {
    q: 'Does Tempo handle HST, GST, and sales tax?',
    a: 'Yes. Tempo has a full tax code engine that supports HST, GST, PST, and US sales tax. When you classify a transaction with a tax code, Tempo automatically splits the net and tax amounts into separate journal lines.',
  },
  {
    q: 'Can my accountant access my books?',
    a: 'Yes. You can invite your accountant to your business with a dedicated Accountant role. They get full read and write access to your transactions and reports, without being able to change billing or subscription settings.',
  },
  {
    q: 'What happens when my trial ends?',
    a: 'At the end of your 60-day trial, you\'ll be prompted to select a plan and add a payment method to continue. Your data is preserved and nothing is deleted. If you choose not to subscribe, your account is locked but your data remains accessible for 30 days.',
  },
  {
    q: 'Can I cancel at any time?',
    a: 'Yes. You can cancel your subscription at any time from the Settings page. You\'ll keep access until the end of your current billing period. We don\'t charge cancellation fees.',
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
