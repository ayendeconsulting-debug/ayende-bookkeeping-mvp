import { Metadata } from 'next';
import Link from 'next/link';
import { PricingCards } from './pricing-cards';
import { ChevronDown } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Pricing — Tempo Bookkeeping',
  description: 'Simple, transparent pricing for Canadian and US small businesses. Start with a free trial.',
};

const BILLING_FAQS = [
  { q: 'Can I switch plans at any time?', a: 'Yes. You can upgrade or downgrade your plan at any time from the Settings page. Upgrades take effect immediately. Downgrades take effect at the start of your next billing period.' },
  { q: 'What happens when my free trial ends?', a: 'Starter and Pro trials run 14 days with no credit card. If you take no action, your workspace moves to read-only mode for 90 days — you can still view data and export reports, but cannot add transactions or classify entries. Subscribe at any time to fully restore access. After 90 days, the workspace is archived. Accountant plans do not include a trial; see the refund policy below.' },
  { q: 'Do you offer annual billing?', a: 'Yes. Annual billing gives you 2 months free — you pay for 10 months and get 12. You can switch between monthly and annual at any time from your billing settings.' },
  { q: 'Is there a setup fee?', a: 'No. There are no setup fees, onboarding fees, or hidden charges. You only pay the plan subscription fee.' },
  { q: 'What payment methods do you accept?', a: 'We accept all major credit and debit cards (Visa, Mastercard, American Express) via Stripe. All payments are processed securely — your card details are never stored on our servers.' },
  { q: 'Can I get a refund?', a: 'Starter and Pro: there is no charge during the 14-day trial, so refunds rarely apply. If you subscribe and contact billing@gettempo.ca within 7 days of your first charge, we will issue a full refund. Accountant Monthly: 30-day money-back guarantee from signup — full refund within 30 days. Accountant Annual: non-refundable — annual plans are a 12-month commitment. Cancellations always stop the next renewal.' },
  { q: 'Do I need a credit card to start?', a: 'Not for Starter or Pro. The 14-day trial begins with email only. Accountant plans require a card at signup because billing starts on day one.' },
  { q: 'What does read-only mode mean?', a: 'If you do not subscribe by the end of your Starter or Pro trial, your workspace shifts to read-only. Existing data, reports, and exports remain accessible; new transactions, bank syncs, and classification are paused. Read-only persists for 90 days, after which the workspace is archived.' },
];

export default function PricingPage() {
  return (
    <div>
      <div className="max-w-4xl mx-auto px-6 pt-14 pb-10 text-center">
        <div className="inline-flex items-center gap-2 bg-[#EDF7F2] dark:bg-primary/10 border border-[#C3E8D8] dark:border-primary/30 text-[#0F6E56] text-xs font-medium px-4 py-1.5 rounded-full mb-5">
          <span className="w-1.5 h-1.5 rounded-full bg-[#0F6E56]" />
          14-day free trial on Starter and Pro — no credit card required
        </div>
        <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-4">Simple, transparent pricing</h1>
        <p className="text-lg text-muted-foreground max-w-xl mx-auto">No surprises. No hidden fees. All prices in CAD.</p>
      </div>
      <div className="max-w-5xl mx-auto px-6 pb-16">
        <PricingCards />
      </div>
      <div className="border-t border-border bg-card">
        <div className="max-w-3xl mx-auto px-6 py-16">
          <h2 className="text-2xl font-bold text-foreground text-center mb-10">Billing questions</h2>
          <div className="divide-y divide-border">
            {BILLING_FAQS.map((faq, i) => (
              <details key={i} className="group py-5">
                <summary className="flex items-center justify-between gap-4 cursor-pointer list-none">
                  <span className="text-base font-medium text-foreground group-hover:text-[#0F6E56] transition-colors">{faq.q}</span>
                  <ChevronDown className="w-5 h-5 text-muted-foreground flex-shrink-0 transition-transform group-open:rotate-180" />
                </summary>
                <p className="mt-3 text-sm text-muted-foreground leading-relaxed">{faq.a}</p>
              </details>
            ))}
          </div>
        </div>
      </div>
      <div className="max-w-3xl mx-auto px-6 py-16 text-center">
        <h2 className="text-2xl font-bold text-foreground mb-3">Still have questions?</h2>
        <p className="text-muted-foreground mb-6">Our team is happy to help. Reach us at <a href="mailto:hello@gettempo.ca" className="text-[#0F6E56] hover:underline underline-offset-2">hello@gettempo.ca</a></p>
        <Link href="/sign-up" className="inline-flex items-center gap-2 bg-[#0F6E56] text-white px-6 py-3 rounded-xl font-semibold text-sm hover:bg-[#085041] transition-colors">Start your free 14-day trial</Link>
        <p className="text-xs text-muted-foreground mt-3">14 days free · No credit card required</p>
      </div>
    </div>
  );
}