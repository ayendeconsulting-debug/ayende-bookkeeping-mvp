import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { getLegalStatus } from './actions';
import { LegalUpdateClient } from './legal-update-client';

export default async function LegalUpdatePage() {
  const { userId } = await auth();
  if (!userId) redirect('/sign-in');

  const status = await getLegalStatus();

  // If all docs are current, nothing to do — send to dashboard
  if (!status || !status.requires_reacceptance) {
    redirect('/dashboard');
  }

  const outdatedDocs = status.documents.filter((d: any) => !d.is_current);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="w-full max-w-lg">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <div className="flex items-end gap-1 h-8">
            <div className="w-2 h-3 rounded-sm bg-[#0F6E56] opacity-50" />
            <div className="w-2 h-5 rounded-sm bg-[#0F6E56] opacity-75" />
            <div className="w-2 h-8 rounded-sm bg-[#0F6E56]" />
          </div>
          <span className="text-xl font-semibold text-foreground">Tempo</span>
        </div>

        <div className="bg-card border border-border rounded-2xl p-8">
          {/* Title */}
          <div className="mb-6">
            <div className="inline-flex items-center gap-2 bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400 text-xs font-medium px-3 py-1 rounded-full mb-4">
              Action required
            </div>
            <h1 className="text-xl font-semibold text-foreground mb-2">
              We've updated our policies
            </h1>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Please review and accept the updated documents below to continue using Tempo.
              Your data and bookkeeping records are safe.
            </p>
          </div>

          <LegalUpdateClient documents={outdatedDocs} />
        </div>

        <p className="text-center text-xs text-muted-foreground mt-6">
          Questions?{' '}
          <a href="mailto:legal@gettempo.ca" className="text-[#0F6E56] hover:underline">
            legal@gettempo.ca
          </a>
        </p>
      </div>
    </div>
  );
}
