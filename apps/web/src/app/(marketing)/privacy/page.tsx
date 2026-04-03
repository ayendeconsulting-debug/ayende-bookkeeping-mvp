import { Metadata } from 'next';
import { LegalPage } from '../legal-page';
import { LEGAL_VERSIONS } from '@/lib/legal-versions';

export const metadata: Metadata = {
  title: 'Privacy Policy — Tempo Bookkeeping',
  description: 'How Tempo Bookkeeping collects, uses, and protects your personal and financial information.',
};

export default function PrivacyPolicyPage() {
  return (
    <LegalPage
      title="Privacy Policy"
      version={LEGAL_VERSIONS.privacy_policy}
      effectiveDate="April 3, 2026"
      lastUpdated="April 3, 2026"
      intro="Tempo Bookkeeping ('Tempo', 'we', 'us', or 'our') is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our bookkeeping platform available at gettempo.ca."
      sections={[
        {
          heading: 'Information We Collect',
          body: `We collect information you provide directly to us when you create an account, set up your business profile, or use our services. This includes your name, email address, business name, and financial transaction data you import or connect via bank integrations.

We also collect information automatically when you use our services, including log data, device information, IP addresses, and usage data such as pages visited, features used, and time spent on the platform.

When you connect your bank accounts through our Plaid integration, we access transaction data, account balances, and account metadata solely for the purpose of providing bookkeeping services. We do not store your banking credentials.`,
        },
        {
          heading: 'How We Use Your Information',
          body: `We use the information we collect to provide, maintain, and improve our services, including processing your financial transactions, generating reports, and powering our bookkeeping features.

We use your email address to send you service-related communications, account notifications, and with your consent, marketing communications. You may opt out of marketing emails at any time.

We use aggregated, anonymised data to analyse usage patterns and improve our product. This data cannot be used to identify individual users.`,
        },
        {
          heading: 'Third-Party Integrations',
          body: `Tempo uses the following third-party services to provide our platform:

Plaid Technologies Inc. — We use Plaid to connect to your financial institutions and import transaction data. Your use of Plaid's services is subject to Plaid's Privacy Policy available at plaid.com/legal. We do not store your bank login credentials.

Stripe Inc. — We use Stripe to process subscription payments. Your payment card information is collected and stored directly by Stripe and is not stored on our servers. Stripe's Privacy Policy is available at stripe.com/privacy.

Clerk Inc. — We use Clerk for authentication and user account management. Clerk's Privacy Policy is available at clerk.com/privacy.

These third parties are contractually obligated to use your data only to provide services to Tempo and are prohibited from using it for their own marketing purposes.`,
        },
        {
          heading: 'Data Storage and Security',
          body: `Your data is stored on servers hosted by Railway (railway.app) in secure data centres. We implement industry-standard security measures including AES-256 encryption for sensitive financial credentials, HTTPS/TLS encryption for all data in transit, and role-based access controls.

We retain your data for as long as your account is active or as needed to provide services. If you close your account, we will delete or anonymise your data within 90 days, except where we are required to retain it by law.

No method of transmission over the internet or electronic storage is 100% secure. While we strive to protect your data, we cannot guarantee absolute security.`,
        },
        {
          heading: 'Data Sharing and Disclosure',
          body: `We do not sell, trade, or rent your personal or financial data to third parties for marketing purposes.

We may share your information with service providers who assist us in operating our platform (as described in Section 3), with your explicit consent, or as required by law, regulation, court order, or government authority.

In the event of a merger, acquisition, or sale of all or a portion of our assets, your information may be transferred as part of that transaction. We will provide notice before your information is transferred.`,
        },
        {
          heading: 'Your Rights',
          body: `Depending on your jurisdiction, you may have the following rights regarding your personal data:

Access — You may request a copy of the personal data we hold about you.

Correction — You may request that we correct inaccurate or incomplete data.

Deletion — You may request that we delete your personal data, subject to certain legal obligations.

Portability — You may request that we provide your data in a machine-readable format.

Withdrawal of consent — Where we rely on your consent to process data, you may withdraw it at any time.

To exercise any of these rights, please contact us at legal@gettempo.ca. We will respond within 30 days.`,
        },
        {
          heading: 'Canadian Privacy Law (PIPEDA)',
          body: `Tempo Bookkeeping is a Canadian company and complies with the Personal Information Protection and Electronic Documents Act (PIPEDA). We collect only the personal information necessary to provide our services and with your knowledge and consent.

You have the right to access your personal information and challenge its accuracy. To file a privacy complaint or access your data, contact our Privacy Officer at legal@gettempo.ca.`,
        },
        {
          heading: 'Cookies and Tracking',
          body: `We use cookies and similar tracking technologies to operate our platform. Please refer to our Cookie Policy for full details on what cookies we use and how you can control them.`,
        },
        {
          heading: 'Children\'s Privacy',
          body: `Our services are not directed to individuals under the age of 18. We do not knowingly collect personal information from children. If you believe a child has provided us with personal information, please contact us immediately and we will delete it.`,
        },
        {
          heading: 'Changes to This Policy',
          body: `We may update this Privacy Policy from time to time. When we do, we will update the version number and the "last updated" date at the top of this page. For material changes, we will notify you by email or through a prominent notice in the application. Continued use of our services after changes are posted constitutes your acceptance of the updated policy.`,
        },
      ]}
    />
  );
}
