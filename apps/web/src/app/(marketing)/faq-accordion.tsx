'use client';

import { useState } from 'react';
import { ChevronDown } from 'lucide-react';

export type FaqTopic = 'Billing' | 'Trial' | 'Security' | 'Banking' | 'Tax' | 'Reports' | 'Accountants' | 'Account';

export const FAQ_TOPICS: readonly FaqTopic[] = [
  'Billing', 'Trial', 'Security', 'Banking', 'Tax', 'Reports', 'Accountants', 'Account',
] as const;

interface FaqEntry {
  q: string;
  a: string;
  topic: FaqTopic;
}

export const FAQS: FaqEntry[] = [
  {
    q: 'Is Tempo really free to try?',
    a: "Starter and Pro plans include a 14-day free trial — no credit card required at signup. You get full access to every feature on your chosen plan, no exclusions. The Accountant Monthly plan charges $149 CAD on day one and includes a 30-day money-back guarantee. The Accountant Annual plan is a 12-month commitment and is non-refundable.",
    topic: 'Trial',
  },
  {
    q: 'What happens when my trial ends?',
    a: "If you've added a payment method, your subscription continues automatically and you keep full access. If you haven't added a card, your account moves to read-only mode for 90 days — you can still view all your data and export anything you need, but new transactions and edits are paused. After 90 days the account archives. Add a card any time during the read-only window to restore full access.",
    topic: 'Trial',
  },
  {
    q: 'Is my financial data secure?',
    a: 'Yes. All data is encrypted at rest and in transit. Bank connections are read-only via Plaid. Your financial data is never shared with third parties or used to train AI models. Each business operates in a fully isolated data environment — no cross-tenant access is architecturally possible.',
    topic: 'Security',
  },
  {
    q: 'How does bank connectivity work?',
    a: "Tempo uses Plaid — the same bank connection technology used by major fintech apps. You authenticate directly with your bank in a secure Plaid-hosted flow. Tempo receives read-only access to your transactions and can never move money or initiate payments. Your login credentials are never stored on our servers.",
    topic: 'Banking',
  },
  {
    q: 'Can I import my existing data?',
    a: 'Yes. Upload CSV or PDF bank statements and Tempo will parse, deduplicate, and classify them automatically. This means you can backfill historical data from before you joined. If you have existing transactions from another system, export them as CSV and import directly.',
    topic: 'Banking',
  },
  {
    q: 'Does Tempo handle HST, GST, and sales tax?',
    a: 'Yes — this is one of Tempo\'s core strengths. Every transaction with a tax code automatically splits the net amount and tax portion into separate journal lines, posting the tax to the correct liability account. Your CRA remittance report with GST34 lines 101–113 is always pre-calculated and export-ready.',
    topic: 'Tax',
  },
  {
    q: 'What reports does Tempo generate?',
    a: 'Tempo generates an Income Statement (Profit & Loss), Balance Sheet, Trial Balance, and General Ledger — all built on double-entry accounting. For Canadian businesses, a CRA remittance report with GST34 lines pre-calculated is always available. All reports are filterable by date range and exportable as PDF or CSV.',
    topic: 'Reports',
  },
  {
    q: 'Can my accountant access my books?',
    a: 'Yes. Invite your accountant by email and assign them an Accountant role. They get full read access plus the ability to request edit access for specific transactions — with every change logged in the dual audit trail. For bookkeeping firms, the Accountant Portal gives them a dedicated dashboard to manage all their clients in one place.',
    topic: 'Accountants',
  },
  {
    q: 'What countries does Tempo support?',
    a: 'Tempo is built primarily for Canadian businesses — with a full HST/GST tax engine, CRA remittance reporting (GST34 lines 101–113), and Canadian bank connectivity via Plaid. US businesses are fully supported as well, with IRS-compatible reports and USD currency handling.',
    topic: 'Account',
  },
  {
    q: 'Can I get a refund?',
    a: 'Personal and Pro: there is no charge during the 14-day trial, so refunds rarely apply. If you subscribe and contact billing@gettempo.ca within 7 days of your first charge, we will issue a full refund. Accountant Monthly: 30-day money-back guarantee from signup. Accountant Annual: non-refundable. Cancellations always stop the next renewal.',
    topic: 'Billing',
  },
  {
    q: 'What payment methods do you accept?',
    a: 'All major credit and debit cards (Visa, Mastercard, American Express) via Stripe. All payments are processed securely - your card details are never stored on our servers.',
    topic: 'Billing',
  },
  {
    q: 'Can I switch plans at any time?',
    a: 'Yes. Upgrade or downgrade from the Settings page at any time. Upgrades take effect immediately; downgrades take effect at the start of your next billing period.',
    topic: 'Billing',
  },
  {
    q: 'Do you offer annual billing?',
    a: 'Yes. Annual billing gives you 2 months free - you pay for 10 months and get 12. Switch between monthly and annual at any time from your billing settings.',
    topic: 'Billing',
  },
  {
    q: 'Can I cancel at any time?',
    a: "Yes. Cancel your subscription at any time from the Settings page — no cancellation fees, no friction. You keep full access until the end of your current billing period. We don't believe in making it hard to leave.",
    topic: 'Account',
  },
];

export function getTopicCounts(): Record<FaqTopic, number> {
  return FAQS.reduce((acc, faq) => {
    acc[faq.topic] = (acc[faq.topic] ?? 0) + 1;
    return acc;
  }, {} as Record<FaqTopic, number>);
}

interface FaqAccordionProps {
  selectedTopic?: FaqTopic | 'All';
}

export function FaqAccordion({ selectedTopic }: FaqAccordionProps = {}) {
  const [open, setOpen] = useState<number | null>(null);

  // Backwards-compatible flat render when no prop (preserves landing-page behavior)
  if (selectedTopic === undefined) {
    return (
      <div className="divide-y divide-border">
        {FAQS.map((faq, i) => (
          <FaqItem key={i} faq={faq} i={i} open={open} setOpen={setOpen} />
        ))}
      </div>
    );
  }

  // Specific topic: filter, no dividers
  if (selectedTopic !== 'All') {
    const filtered = FAQS.filter(f => f.topic === selectedTopic);
    return (
      <div className="divide-y divide-border">
        {filtered.map((faq) => {
          const i = FAQS.indexOf(faq);
          return <FaqItem key={i} faq={faq} i={i} open={open} setOpen={setOpen} />;
        })}
      </div>
    );
  }

  // 'All': grouped by topic with dividers
  return (
    <div>
      {FAQ_TOPICS.map(topic => {
        const items = FAQS.filter(f => f.topic === topic);
        if (items.length === 0) return null;
        return (
          <div key={topic}>
            <p className="text-xs font-semibold tracking-wider text-[#0F6E56] uppercase pt-6 pb-2 border-b border-[#9FE1CB] mb-1">
              {topic}
            </p>
            <div className="divide-y divide-border">
              {items.map((faq) => {
                const i = FAQS.indexOf(faq);
                return <FaqItem key={i} faq={faq} i={i} open={open} setOpen={setOpen} />;
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

interface FaqItemProps {
  faq: FaqEntry;
  i: number;
  open: number | null;
  setOpen: (n: number | null) => void;
}

function FaqItem({ faq, i, open, setOpen }: FaqItemProps) {
  return (
    <div>
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
  );
}
