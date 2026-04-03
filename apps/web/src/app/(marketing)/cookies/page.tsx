import { Metadata } from 'next';
import { LegalPage } from '../legal-page';
import { LEGAL_VERSIONS } from '@/lib/legal-versions';

export const metadata: Metadata = {
  title: 'Cookie Policy — Tempo Bookkeeping',
  description: 'How Tempo Bookkeeping uses cookies and similar tracking technologies.',
};

export default function CookiePolicyPage() {
  return (
    <LegalPage
      title="Cookie Policy"
      version={LEGAL_VERSIONS.cookie_policy}
      effectiveDate="April 3, 2026"
      lastUpdated="April 3, 2026"
      intro="This Cookie Policy explains how Tempo Bookkeeping ('Tempo', 'we', 'us') uses cookies and similar tracking technologies on our platform at gettempo.ca. By using the Platform, you acknowledge this policy."
      sections={[
        {
          heading: 'What Are Cookies',
          body: `Cookies are small text files that are stored on your device (computer, tablet, or mobile phone) when you visit a website or use a web application. They allow the website to remember your actions and preferences over a period of time, so you don't have to keep re-entering them.

Cookies can be 'session cookies' which are deleted when you close your browser, or 'persistent cookies' which remain on your device for a set period or until you delete them.

Similar technologies include local storage, session storage, and pixel tags. In this policy, we refer to all these technologies collectively as 'cookies'.`,
        },
        {
          heading: 'Cookies We Use',
          body: `We use the following categories of cookies:

Essential Cookies — These cookies are necessary for the Platform to function. They enable core features such as authentication, session management, and security. You cannot opt out of essential cookies as the Platform cannot function without them.

Preference Cookies — These cookies remember your settings and preferences, such as your selected display theme (light or dark mode). They are stored in your browser's local storage under the key 'tempo-theme'.

Analytics Cookies — We may use analytics tools to understand how users interact with the Platform. This data is aggregated and anonymised and cannot be used to identify individual users.

Third-Party Cookies — Some of our third-party integrations (Clerk for authentication, Stripe for payments) may set their own cookies. These are governed by the respective third-party cookie policies.`,
        },
        {
          heading: 'Specific Cookies in Use',
          body: `The following is a summary of the key cookies and storage items used by the Platform:

tempo-theme (localStorage) — Stores your dark/light mode preference. Persistent until cleared. No personal data.

__clerk_* (cookies) — Set by Clerk for authentication session management. Session and persistent. Contains encrypted session tokens.

__stripe_* (cookies) — Set by Stripe during payment flows. Governed by Stripe's cookie policy.

_ga, _gid (cookies, if analytics enabled) — Set by Google Analytics if enabled. Used to distinguish users and sessions. Expire after 2 years and 24 hours respectively.`,
        },
        {
          heading: 'Why We Use Cookies',
          body: `We use cookies for the following purposes:

Authentication — To keep you logged in securely during your session and across sessions when you choose to remain signed in.

Security — To detect and prevent fraudulent activity and protect your account.

Preferences — To remember your settings so you don't have to reconfigure them each visit.

Performance — To understand how the Platform is used so we can improve it.`,
        },
        {
          heading: 'Managing and Disabling Cookies',
          body: `You can control and manage cookies through your browser settings. Most browsers allow you to view, delete, and block cookies. Please note that disabling essential cookies will prevent the Platform from functioning correctly.

To manage cookies in common browsers:

Google Chrome — Settings > Privacy and Security > Cookies and other site data.

Mozilla Firefox — Settings > Privacy & Security > Cookies and Site Data.

Safari — Preferences > Privacy > Manage Website Data.

Microsoft Edge — Settings > Cookies and site permissions.

For third-party cookies set by our integrations, please refer to the respective privacy and cookie policies of Clerk (clerk.com), Stripe (stripe.com), and Plaid (plaid.com).`,
        },
        {
          heading: 'Do Not Track',
          body: `Some browsers have a 'Do Not Track' feature that signals to websites that you do not want to be tracked. Our Platform does not currently respond to Do Not Track signals, as there is no consistent industry standard for how to respond to them.`,
        },
        {
          heading: 'Updates to This Policy',
          body: `We may update this Cookie Policy from time to time to reflect changes in technology, law, or our practices. When we make changes, we will update the version number and last updated date at the top of this page. For significant changes, we will notify you through the Platform or by email.`,
        },
        {
          heading: 'Contact',
          body: `If you have questions about our use of cookies, please contact us at legal@gettempo.ca.`,
        },
      ]}
    />
  );
}
