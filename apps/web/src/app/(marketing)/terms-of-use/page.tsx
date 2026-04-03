import { Metadata } from 'next';
import { LegalPage } from '../legal-page';
import { LEGAL_VERSIONS } from '@/lib/legal-versions';

export const metadata: Metadata = {
  title: 'Terms of Use — Tempo Bookkeeping',
  description: 'Rules and guidelines governing how you interact with and use the Tempo Bookkeeping platform.',
};

export default function TermsOfUsePage() {
  return (
    <LegalPage
      title="Terms of Use"
      version={LEGAL_VERSIONS.terms_of_use}
      effectiveDate="April 3, 2026"
      lastUpdated="April 3, 2026"
      intro="These Terms of Use ('Terms') define the rules and guidelines for how you interact with the Tempo Bookkeeping platform ('the Platform'). They complement the Terms of Service and apply to all users, including visitors to gettempo.ca."
      sections={[
        {
          heading: 'Permitted Use',
          body: `You may use the Platform to manage your business or personal financial records, import and classify transactions, generate financial reports, and access any features available under your subscription plan.

You agree to use the Platform only for its intended purpose — honest, accurate bookkeeping and financial management — and in compliance with all applicable laws in your jurisdiction.`,
        },
        {
          heading: 'User Responsibilities',
          body: `You are responsible for all activity that occurs under your account. This includes ensuring that anyone who accesses the Platform through your account complies with these Terms.

You must keep your login credentials secure and not share them with others. If you believe your account has been compromised, you must notify us immediately at legal@gettempo.ca.

You are responsible for the accuracy of all financial data you enter, import, or classify within the Platform. Tempo provides the tools; the accuracy of your books is your responsibility.`,
        },
        {
          heading: 'Prohibited Activities',
          body: `The following activities are strictly prohibited:

Using the Platform to manage finances for any illegal activity, including tax evasion, money laundering, or fraud.

Entering knowingly false or misleading financial data.

Attempting to bypass, disable, or interfere with any security feature of the Platform.

Using the Platform to store or transmit content that is defamatory, offensive, or infringes on the rights of others.

Reselling, sublicensing, or providing access to the Platform to third parties without our written consent.

Scraping, harvesting, or collecting data from the Platform using automated means.

Any violation may result in immediate suspension or termination of your account without refund.`,
        },
        {
          heading: 'Multi-User Access',
          body: `If your subscription includes multi-user access, you may invite team members or accountants to access your business data within the Platform. You are responsible for managing the permissions and access levels of all users in your account.

You must promptly remove access for any user who is no longer authorised to access your account, such as a former employee or accountant.

Tempo is not liable for any damage caused by users you have invited to your account.`,
        },
        {
          heading: 'Data Input Standards',
          body: `You agree not to input into the Platform any data that you do not have the legal right to use, including confidential information belonging to third parties without their consent.

Do not enter sensitive personal information about third parties (such as Social Insurance Numbers or Social Security Numbers of individuals) beyond what is strictly necessary for your bookkeeping purposes.

We reserve the right to remove any content that violates these standards, though we are under no obligation to monitor user-submitted data.`,
        },
        {
          heading: 'Platform Availability',
          body: `We strive to keep the Platform available 24 hours a day, 7 days a week. However, we do not guarantee uninterrupted access. The Platform may be unavailable due to scheduled maintenance, infrastructure issues, or circumstances beyond our control.

We will endeavour to provide advance notice of scheduled maintenance. We are not liable for any loss or damage resulting from Platform unavailability.`,
        },
        {
          heading: 'Feedback and Suggestions',
          body: `If you submit feedback, ideas, or suggestions about the Platform, you grant Tempo Bookkeeping Inc. a perpetual, irrevocable, royalty-free licence to use that feedback for any purpose, including improving the Platform, without any obligation to compensate you.`,
        },
        {
          heading: 'Enforcement',
          body: `We reserve the right to investigate and take appropriate action against anyone who, in our sole discretion, violates these Terms of Use. This may include removing content, suspending or terminating accounts, reporting activity to law enforcement authorities, and pursuing legal action.

Failure to enforce any provision of these Terms does not constitute a waiver of our right to enforce it in the future.`,
        },
        {
          heading: 'Contact',
          body: `If you become aware of any violation of these Terms of Use by another user, or if you have questions about permitted use, please contact us at legal@gettempo.ca.`,
        },
      ]}
    />
  );
}
