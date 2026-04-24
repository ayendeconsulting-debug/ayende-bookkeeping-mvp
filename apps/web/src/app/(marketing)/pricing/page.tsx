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
  { q: 'What happens when my free trial ends?', a: 'At the end of your free trial, if you take no action, you will automatically continue on the Starter plan using your saved payment method. You can cancel or switch plans at any time before the trial ends.' },
  { q: 'Do you offer annual billing?', a: 'Yes. Annual billing gives you 2 months free — you pay for 10 months and get 12. You can switch between monthly and annual at any time from your billing settings.' },
  { q: 'Is there a setup fee?', a: 'No. There are no setup fees, onboarding fees, or hidden charges. You only pay the plan subscription fee.' },
  { q: 'What payment methods do you accept?', a: 'We accept all major credit and debit cards (Visa, Mastercard, American Express) via Stripe. All payments are processed securely — your card details are never stored on our servers.' },
  { q: 'Can I get a refund?', a: 'If you are unsatisfied within the first 7 days of a paid subscription, contact us at billing@gettempo.ca and we will issue a full refund. After 7 days, subscriptions are non-refundable but you can cancel at any time.' },
];

export default function PricingPage() {
  return (
    <div>
      <div className="max-w-4xl mx-auto px-6 pt-14 pb-10 text-center">
        <div className="inline-flex items-center gap-2 bg-[#EDF7F2] dark:bg-primary/10 border border-[#C3E8D8] dark:border-primary/30 text-[#0F6E56] text-xs font-medium px-4 py-1.5 rounded-full mb-5">
          <span className="w-1.5 h-1.5 rounded-full bg-[#0F6E56]" />
          Free trial on Starter and Pro — no credit card required
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
        <Link href="/sign-up" className="inline-flex items-center gap-2 bg-[#0F6E56] text-white px-6 py-3 rounded-xl font-semibold text-sm hover:bg-[#085041] transition-colors">Start your free trial</Link>
      </div>
    </div>
  );
}