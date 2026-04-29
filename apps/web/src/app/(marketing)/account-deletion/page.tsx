import { Metadata } from 'next';
import { LegalPage } from '../legal-page';

export const metadata: Metadata = {
  title: 'Account Deletion — Tempo Bookkeeping',
  description: 'How to request deletion of your Tempo Bookkeeping account and what data is deleted or retained.',
};

export default function AccountDeletionPage() {
  return (
    <LegalPage
      title="Account Deletion"
      version="1.0"
      effectiveDate="April 28, 2026"
      lastUpdated="April 28, 2026"
      intro="Tempo Bookkeeping ('Tempo', 'we', 'us', or 'our') gives you the right to delete your account and your associated data at any time. This page explains how to request account deletion, what is removed, what is retained and why, and how long the process takes. It applies to accounts created via gettempo.ca and to the Tempo Books mobile app on Google Play."
      sections={[
        {
          heading: 'How to Request Account Deletion',
          body: `You can request deletion of your Tempo Books account in either of the following ways.

By email — Send an email to support@gettempo.ca from the email address registered to your account, with the subject line "Delete my account". Include your business name so we can locate your records. We will confirm receipt within two business days and complete deletion within 30 days.

From the web app — Sign in at gettempo.ca, open Settings, and use the Delete Account option. You will be asked to confirm the request and to type your email address before deletion proceeds. Account deletion from the web app removes data on the same timeline as email requests.

If you no longer have access to the email address registered to your account, contact support@gettempo.ca with proof of identity and ownership of the business so we can verify your request.`,
        },
        {
          heading: 'Before You Delete: Export Your Records',
          body: `Tempo Books holds your bookkeeping ledger, invoices, receipts, and reports. Canadian and US tax authorities require business owners to retain books and records for several years — six years in Canada under the Income Tax Act, and up to seven years in the United States. Once your account is deleted, we cannot recover this data for you.

Before you submit a deletion request, sign in to gettempo.ca and export your records:

Reports — Income Statement, Balance Sheet, Trial Balance, and General Ledger can be downloaded as PDF or CSV from the Reports section.

Transactions — The full transaction list can be exported as CSV from the Transactions section.

Invoices and receipts — Individual PDF copies are available from the Invoices and Receipts sections.

We recommend keeping these exports somewhere safe before requesting deletion.`,
        },
        {
          heading: 'What We Delete',
          body: `When your account is deleted, we permanently remove:

Your user profile, name, and email address from our authentication system (Clerk).

Your business profile, including business name, contact details, and any branding settings.

All bookkeeping data tied to your business — chart of accounts, journal entries, journal lines, raw transactions, classified transactions, invoices, customers, vendors, receipts, attached documents, and reports.

All bank connections, including the Plaid access tokens that allow us to sync your bank data. We instruct Plaid to disconnect any active bank links associated with your account.

Your Stripe customer record and active subscription, ending any billing relationship. Already-issued Stripe invoices and payment receipts are retained by Stripe under their own retention policy and are not within Tempo's control.

Push notification tokens registered for your mobile devices.`,
        },
        {
          heading: 'What May Be Retained, and for How Long',
          body: `A small set of data may be retained briefly after your account is deleted, for the reasons below.

Backups — Our database backups roll forward on a 30 to 90 day schedule. Until those backups expire, a snapshot of your data may exist in encrypted backup storage. We do not access these backups except for disaster recovery.

Audit and security logs — Records of significant account events (sign-ins, password changes, deletion requests) are retained for up to 12 months for fraud prevention and security investigation. These logs are pseudonymised and do not include financial transaction content.

Legally required records — If we are required by Canadian law, court order, or regulatory obligation to retain specific records, we will do so for the period required and no longer. We will inform you if a legal hold applies to your data.

Aggregated, anonymised analytics — Information about platform usage that has been stripped of any personal identifiers may be retained indefinitely. This data cannot be linked back to you.

All other data is deleted within 30 days of your request, with full purge from backups completed within 90 days.`,
        },
        {
          heading: 'Contact',
          body: `Account deletion requests and questions about this policy:

Email — support@gettempo.ca

Privacy Officer — legal@gettempo.ca

Postal — Ayende CX Inc., Toronto, Ontario, Canada

We respond to deletion requests within two business days and complete deletion within 30 days.`,
        },
      ]}
    />
  );
}