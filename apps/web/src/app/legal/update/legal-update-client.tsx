'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircle2, Loader2, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { acceptLegal } from './actions';

interface Document {
  document_type: string;
  current_version: string;
  accepted_version: string | null;
}

const DOC_LABELS: Record<string, { label: string; href: string }> = {
  terms_of_service: { label: 'Terms of Service',  href: '/terms'        },
  terms_of_use:     { label: 'Terms of Use',       href: '/terms-of-use' },
  privacy_policy:   { label: 'Privacy Policy',     href: '/privacy'      },
  cookie_policy:    { label: 'Cookie Policy',      href: '/cookies'      },
};

export function LegalUpdateClient({ documents }: { documents: Document[] }) {
  const router = useRouter();
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const [error, setError]     = useState<string | null>(null);
  const [saving, startSaving] = useTransition();

  const allChecked = documents.every((d) => checked[d.document_type]);

  function toggle(docType: string) {
    setChecked((prev) => ({ ...prev, [docType]: !prev[docType] }));
  }

  function handleAccept() {
    setError(null);
    startSaving(async () => {
      const docsPayload = documents.map((d) => ({
        document_type:     d.document_type,
        document_version:  d.current_version,
        acceptance_source: 're_acceptance',
      }));
      const result = await acceptLegal(docsPayload);
      if (result.success) {
        router.push('/dashboard');
      } else {
        setError(result.error ?? 'Something went wrong. Please try again.');
      }
    });
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Document checkboxes */}
      <div className="flex flex-col gap-3">
        {documents.map((doc) => {
          const meta    = DOC_LABELS[doc.document_type];
          const isChecked = checked[doc.document_type] ?? false;

          return (
            <label
              key={doc.document_type}
              className={`flex items-start gap-3 p-4 rounded-xl border cursor-pointer transition-colors ${
                isChecked
                  ? 'border-[#0F6E56] bg-[#EDF7F2] dark:bg-[#0F6E56]/10'
                  : 'border-border bg-background hover:border-[#0F6E56]/50'
              }`}
            >
              {/* Custom checkbox */}
              <div
                className={`mt-0.5 flex-shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                  isChecked
                    ? 'bg-[#0F6E56] border-[#0F6E56]'
                    : 'border-border bg-background'
                }`}
                onClick={() => toggle(doc.document_type)}
              >
                {isChecked && <CheckCircle2 className="w-3.5 h-3.5 text-white" />}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-foreground">
                    I have read and accept the{' '}
                    <a
                      href={meta?.href ?? '#'}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[#0F6E56] hover:underline inline-flex items-center gap-0.5"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {meta?.label ?? doc.document_type}
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Version {doc.current_version}
                  {doc.accepted_version && doc.accepted_version !== doc.current_version && (
                    <span> — previously accepted v{doc.accepted_version}</span>
                  )}
                </p>
              </div>
            </label>
          );
        })}
      </div>

      {/* Error */}
      {error && (
        <p className="text-sm text-destructive">{error}</p>
      )}

      {/* Submit */}
      <Button
        onClick={handleAccept}
        disabled={!allChecked || saving}
        className="w-full mt-2 bg-[#0F6E56] hover:bg-[#0a5542] text-white"
      >
        {saving ? (
          <><Loader2 className="w-4 h-4 animate-spin mr-2" />Saving…</>
        ) : (
          'Accept & continue to dashboard →'
        )}
      </Button>

      <p className="text-xs text-muted-foreground text-center">
        You must accept all updated documents to continue using Tempo.
      </p>
    </div>
  );
}
