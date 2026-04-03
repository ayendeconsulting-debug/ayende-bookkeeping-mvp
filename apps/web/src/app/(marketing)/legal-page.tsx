import Link from 'next/link';

interface Section {
  heading: string;
  body: string | React.ReactNode;
}

interface LegalPageProps {
  title: string;
  version: string;
  effectiveDate: string;
  lastUpdated: string;
  intro: string;
  sections: Section[];
  contactEmail?: string;
}

export function LegalPage({
  title,
  version,
  effectiveDate,
  lastUpdated,
  intro,
  sections,
  contactEmail = 'legal@gettempo.ca',
}: LegalPageProps) {
  return (
    <div className="max-w-3xl mx-auto px-6 py-14">

      {/* ── Header ────────────────────────────────────────────────────── */}
      <div className="mb-10 pb-8 border-b border-border">
        <div className="inline-flex items-center gap-2 bg-[#EDF7F2] dark:bg-primary/10 text-[#0F6E56] dark:text-primary text-xs font-medium px-3 py-1 rounded-full mb-4">
          Version {version}
        </div>
        <h1 className="text-3xl font-bold text-foreground mb-3">{title}</h1>
        <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm text-muted-foreground">
          <span>Effective: {effectiveDate}</span>
          <span>Last updated: {lastUpdated}</span>
        </div>
        <p className="mt-4 text-base text-foreground/80 leading-relaxed">{intro}</p>
      </div>

      {/* ── Table of contents ─────────────────────────────────────────── */}
      <nav className="mb-10 bg-card border border-border rounded-xl p-5">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
          Table of Contents
        </p>
        <ol className="space-y-1.5">
          {sections.map((s, i) => (
            <li key={i}>
              <a
                href={`#section-${i + 1}`}
                className="text-sm text-[#0F6E56] hover:underline underline-offset-2"
              >
                {i + 1}. {s.heading}
              </a>
            </li>
          ))}
        </ol>
      </nav>

      {/* ── Sections ──────────────────────────────────────────────────── */}
      <div className="space-y-10">
        {sections.map((s, i) => (
          <section key={i} id={`section-${i + 1}`}>
            <h2 className="text-lg font-semibold text-foreground mb-3 flex items-center gap-2">
              <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-[#EDF7F2] dark:bg-primary/10 text-[#0F6E56] dark:text-primary text-xs font-bold flex-shrink-0">
                {i + 1}
              </span>
              {s.heading}
            </h2>
            <div className="text-sm text-foreground/80 leading-relaxed pl-8">
              {typeof s.body === 'string'
                ? s.body.split('\n').map((line, j) =>
                    line.trim() ? (
                      <p key={j} className="mb-3">{line.trim()}</p>
                    ) : null
                  )
                : s.body}
            </div>
          </section>
        ))}
      </div>

      {/* ── Contact ───────────────────────────────────────────────────── */}
      <div className="mt-14 pt-8 border-t border-border">
        <p className="text-sm text-muted-foreground">
          Questions about this document?{' '}
          <a
            href={`mailto:${contactEmail}`}
            className="text-[#0F6E56] hover:underline underline-offset-2"
          >
            {contactEmail}
          </a>
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          {[
            { label: 'Terms of Service', href: '/terms'        },
            { label: 'Terms of Use',     href: '/terms-of-use' },
            { label: 'Privacy Policy',   href: '/privacy'      },
            { label: 'Cookie Policy',    href: '/cookies'      },
          ].map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="text-xs text-muted-foreground border border-border rounded-lg px-3 py-1.5 hover:border-[#0F6E56] hover:text-[#0F6E56] transition-colors"
            >
              {l.label}
            </Link>
          ))}
        </div>
      </div>

    </div>
  );
}
