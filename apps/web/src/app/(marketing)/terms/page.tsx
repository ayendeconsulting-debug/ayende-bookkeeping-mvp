import { Metadata } from 'next';
import { LegalPage } from '../legal-page';
import { LEGAL_VERSIONS } from '@/lib/legal-versions';

export const metadata: Metadata = {
  title: 'Terms of Service — Tempo Bookkeeping',
  description: 'The terms and conditions governing your use of Tempo Bookkeeping.',
};

export default function TermsOfServicePage() {
  return (
    <LegalPage
      title="Terms of Service"
      version={LEGAL_VERSIONS.terms_of_service}
      effectiveDate="April 24, 2026"
      lastUpdated="April 24, 2026"
      intro="These Terms of Service ('Terms') govern your access to and use of Tempo Bookkeeping ('Tempo', 'the Service'), operated by Tempo Bookkeeping Inc. By creating an account or using the Service, you agree to be bound by these Terms. If you do not agree, do not use the Service."
      sections={[
        {
          heading: 'Acceptance of Terms',
          body: `By accessing or using Tempo Bookkeeping, you confirm that you are at least 18 years old, have the legal authority to enter into these Terms, and agree to comply with them. If you are using the Service on behalf of a business or organisation, you represent that you have the authority to bind that entity to these Terms.

These Terms constitute a legally binding agreement between you and Tempo Bookkeeping Inc. Your continued use of the Service after any modifications to these Terms constitutes acceptance of the updated Terms.`,
        },
        {
          heading: 'Description of Service',
          body: `Tempo Bookkeeping is a cloud-based bookkeeping platform that provides double-entry accounting, transaction management, financial reporting, and bank integration services for small and medium businesses in Canada and the United States.

The Service is provided on a subscription basis. Features available to you depend on your subscription plan. We reserve the right to modify, suspend, or discontinue any feature of the Service with reasonable notice.`,
        },
        {
          heading: 'Account Registration',
          body: `You must create an account to use the Service. You agree to provide accurate, current, and complete information during registration and to keep your account information updated.

You are responsible for maintaining the confidentiality of your account credentials and for all activity that occurs under your account. You must notify us immediately at legal@gettempo.ca if you suspect unauthorised access to your account.

Each account is for a single user. You may not share your account credentials with others. Team access is managed through the multi-user features within the Service.`,
        },
        {
          heading: 'Subscription and Payment',
          body: `Access to the Service requires a subscription. Subscription fees are billed monthly or annually, depending on your chosen plan. All fees are in Canadian dollars unless otherwise stated.

Personal and Pro plans include a 14-day free trial. No payment method is required to start the trial. To continue using the Service after the trial, you must subscribe before the trial ends. See our Refund Policy and our Trial and Account Lifecycle policy below for details on what happens at the end of an unused trial.

The Accountant plan does not include a trial. A valid payment method is required at signup, and the first billing period begins immediately. Monthly subscriptions are protected by the 30-day money-back guarantee described in our Refund Policy. Annual subscriptions are a 12-month commitment and are not refundable.

Payments are processed by Stripe. By providing payment information, you authorise Tempo Bookkeeping Inc. to charge your payment method for the applicable subscription fees, including any recurring renewals, until you cancel.

We reserve the right to change subscription prices with 30 days' notice to existing subscribers. Continued use of the Service after a price change constitutes acceptance of the new price.`,
        },
        {
          heading: 'Refund Policy',
          body: `This section governs your eligibility for refunds. Different rules apply to each plan.

Personal and Pro plans: no charge is incurred during the 14-day trial, so no refund applies during that window. If you subscribe and request a refund within 7 days of your first charge by emailing billing@gettempo.ca, we will issue a full refund. Refund requests after 7 days are at our discretion and are generally declined.

Accountant Monthly: a 30-day money-back guarantee applies, beginning on the date you sign up. If you request a refund within 30 days of signup by emailing billing@gettempo.ca, we will issue a full refund of the most recent monthly charge and cancel your subscription. Subsequent monthly charges are not refundable.

Accountant Annual: annual subscriptions are non-refundable. The annual plan is a 12-month commitment and you confirm this commitment at the time of checkout. We do not offer pro-rata refunds for unused months. Cancellation stops the renewal at the end of the current 12-month term but does not entitle you to a refund of fees already paid.

Cancellation outside of the windows described above is always available and stops your subscription from renewing, but does not entitle you to a refund of fees already paid. Refunds, when issued, are returned to the original payment method and may take up to 10 business days to appear on your statement.`,
        },
        {
          heading: 'Trial and Account Lifecycle',
          body: `Personal and Pro trials run for 14 days from signup. No payment method is collected during the trial period.

If you do not subscribe before the end of the trial, your account will move to read-only mode for 90 days. In read-only mode, you may continue to view your data, run reports, and export records, but you cannot create transactions, classify entries, modify accounts, sync banks, or perform any other write actions. Subscribing at any time during this 90-day window restores full access immediately.

If you do not subscribe within the 90-day read-only window, your account will be archived. On archive, your bank connections (Plaid) are disconnected and access is suspended. We retain your data for the period described in our Privacy Policy. To restore an archived account, contact support@gettempo.ca.

Accountant accounts are not subject to read-only mode or archival, as they are paid subscriptions from day one. If an Accountant subscription lapses for non-payment, the standard past-due and termination provisions in these Terms apply.`,
        },
        {
          heading: 'Acceptable Use',
          body: `You agree to use the Service only for lawful purposes and in accordance with these Terms. You must not:

Use the Service for any fraudulent, illegal, or unauthorised purpose, including misrepresenting your financial information to any authority.

Attempt to gain unauthorised access to the Service, other user accounts, or our systems.

Reverse engineer, decompile, or disassemble any portion of the Service.

Use automated tools to scrape, crawl, or extract data from the Service without our written permission.

Introduce malware, viruses, or other harmful code into the Service.

Violation of these restrictions may result in immediate termination of your account.`,
        },
        {
          heading: 'Financial Data and Accuracy',
          body: `Tempo provides tools to help you organise and report on your financial data. However, Tempo is a software tool and does not provide accounting, tax, legal, or financial advice.

You are solely responsible for the accuracy and completeness of data you enter into the Service, verifying that your financial reports are correct before submitting them to any tax authority, and complying with all applicable tax laws and regulations.

We strongly recommend that you work with a qualified accountant or tax professional for any tax filing or compliance matters.`,
        },
        {
          heading: 'Intellectual Property',
          body: `The Service and all its content, features, and functionality — including but not limited to software, text, graphics, logos, and data — are owned by Tempo Bookkeeping Inc. and are protected by Canadian and international copyright, trademark, and other intellectual property laws.

You are granted a limited, non-exclusive, non-transferable, revocable licence to use the Service for your internal business purposes. You may not copy, modify, distribute, or create derivative works based on the Service.

Your financial data belongs to you. We do not claim ownership of the data you import or create within the Service.`,
        },
        {
          heading: 'Data and Privacy',
          body: `Our collection and use of your personal and financial data is governed by our Privacy Policy, which is incorporated into these Terms by reference. By using the Service, you consent to the collection and use of your data as described in the Privacy Policy.`,
        },
        {
          heading: 'Third-Party Services',
          body: `The Service integrates with third-party services including Plaid (bank connectivity), Stripe (payments), and Clerk (authentication). Your use of these integrations is subject to the respective third-party terms and privacy policies.

We are not responsible for the availability, accuracy, or content of third-party services. Any issues with third-party integrations should be directed to the respective provider.`,
        },
        {
          heading: 'Limitation of Liability',
          body: `To the maximum extent permitted by law, Tempo Bookkeeping Inc. shall not be liable for any indirect, incidental, special, consequential, or punitive damages, including loss of profits, data, or goodwill, arising from your use of or inability to use the Service.

Our total liability to you for any claim arising out of or relating to these Terms or the Service shall not exceed the amount you paid us in the 12 months preceding the claim.

Some jurisdictions do not allow the exclusion of certain warranties or limitations of liability, so the above limitations may not apply to you.`,
        },
        {
          heading: 'Termination',
          body: `You may cancel your subscription and close your account at any time through the Settings page or by contacting us at legal@gettempo.ca. Upon cancellation, your access to the Service will continue until the end of the current billing period. Cancellation does not entitle you to a refund of fees already paid except as described in our Refund Policy.

We reserve the right to suspend or terminate your account immediately if you violate these Terms, engage in fraudulent activity, or if we are required to do so by law.

Upon termination, you may export your data within 30 days. After that period, your data may be deleted in accordance with our Privacy Policy.`,
        },
        {
          heading: 'Governing Law',
          body: `These Terms are governed by the laws of the Province of Ontario and the federal laws of Canada applicable therein, without regard to conflict of law principles.

Any disputes arising from these Terms or your use of the Service shall be resolved in the courts of Ontario, Canada. You consent to the exclusive jurisdiction of those courts.`,
        },
        {
          heading: 'Changes to Terms',
          body: `We may update these Terms from time to time. We will notify you of material changes by email or through a notice in the Service at least 14 days before the changes take effect. If you do not agree to the updated Terms, you must stop using the Service before the effective date of the changes.`,
        },
      ]}
    />
  );
}
