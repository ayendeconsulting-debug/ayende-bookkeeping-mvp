import { Metadata } from 'next';
import Link from 'next/link';
import { PricingCards } from './pricing-cards';
import { ChevronDown, ArrowRight } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Pricing \u2014 Tempo Bookkeeping',
  description: 'Simple, transparent pricing for Canadian and US small businesses. Start with a free trial.',
};

// Pricing-page billing FAQs - B-9.2 trim from 8 to 4 entries per FR-B9.4-01.
// The full Billing topic with these 4 + room to grow lives at /faq?topic=Billing.
const BILLING_FAQS = [
  { q: 'Can I get a refund?', a: 'Personal and Pro: there is no charge during the 14-day trial, so refunds rarely apply. If you subscribe and contact billing@gettempo.ca within 7 days of your first charge, we will issue a full refund. Accountant Monthly: 30-day money-back guarantee from signup. Accountant Annual: non-refundable. Cancellations always stop the next renewal.' },
  { q: 'What payment methods do you accept?', a: 'All major credit and debit cards (Visa, Mastercard, American Express) via Stripe. All payments are processed securely - your card details are never stored on our servers.' },
  { q: 'Can I switch plans at any time?', a: 'Yes. Upgrade or downgrade from the Settings page at any time. Upgrades take effect immediately; downgrades take effect at the start of your next billing period.' },
  { q: 'Do you offer annual billing?', a: 'Yes. Annual billing gives you 2 months free - you pay for 10 months and get 12. Switch between monthly and annual at any time from your billing settings.' },
];

export default function PricingPage() {
  return (
    <div>
      <div className="max-w-4xl mx-auto px-6 pt-14 pb-10 text-center">
        <div className="inline-flex items-center gap-2 bg-[#EDF7F2] dark:bg-primary/10 border border-[#C3E8D8] dark:border-primary/30 text-[#0F6E56] text-xs font-medium px-4 py-1.5 rounded-full mb-5">
          <span className="w-1.5 h-1.5 rounded-full bg-[#0F6E56]" />
          14-day free trial on Personal and Pro &#x2014; no credit card required
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
          <div className="mt-8 text-center">
            <Link href="/faq?topic=Billing" className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#0F6E56] hover:underline underline-offset-2">
              See all FAQs <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </div>
      <div className="max-w-3xl mx-auto px-6 py-16 text-center">
        <h2 className="text-2xl font-bold text-foreground mb-3">Still have questions?</h2>
        <p className="text-muted-foreground mb-6">Our team is happy to help. Reach us at <a href="mailto:hello@gettempo.ca" className="text-[#0F6E56] hover:underline underline-offset-2">hello@gettempo.ca</a></p>
        <Link href="/sign-up" className="inline-flex items-center gap-2 bg-[#0F6E56] text-white px-6 py-3 rounded-xl font-semibold text-sm hover:bg-[#085041] transition-colors">Start your free 14-day trial</Link>
        <p className="text-xs text-muted-foreground mt-3">14 days free &#x00b7; No credit card required</p>
      </div>
    </div>
  );
}
