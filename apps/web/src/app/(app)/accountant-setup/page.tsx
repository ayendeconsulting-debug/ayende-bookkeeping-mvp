'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createFirm } from './actions';
import { Building2, ChevronRight, Loader2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function AccountantSetupPage() {
  const router = useRouter();

  const [name, setName] = useState('');
  const [subdomain, setSubdomain] = useState('');
  const [subdomainTouched, setSubdomainTouched] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleNameChange(value: string) {
    setName(value);
    if (!subdomainTouched) {
      setSubdomain(
        value
          .toLowerCase()
          .replace(/[^a-z0-9\s-]/g, '')
          .trim()
          .replace(/\s+/g, '-')
          .slice(0, 40),
      );
    }
  }

  async function handleSubmit() {
    setError(null);
    if (!name.trim() || !subdomain.trim()) return;

    setSubmitting(true);
    try {
      const result = await createFirm(name.trim(), subdomain.trim());
      if (!result.success) {
        setError(result.error);
        setSubmitting(false);
        return;
      }
      router.push('/accountant/clients');
    } catch {
      setError('An unexpected error occurred. Please try again.');
      setSubmitting(false);
    }
  }

  const canSubmit = name.trim().length > 0 && subdomain.trim().length > 0 && !submitting;

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">

        {/* Logo mark */}
        <div className="flex justify-center mb-8">
          <div className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center shadow-lg">
            <svg viewBox="0 0 16 16" className="w-7 h-7">
              <rect x="1"   y="10" width="3" height="5"  rx="0.5" fill="white" opacity="0.5"/>
              <rect x="6.5" y="7"  width="3" height="8"  rx="0.5" fill="white" opacity="0.75"/>
              <rect x="12"  y="3"  width="3" height="12" rx="0.5" fill="white"/>
            </svg>
          </div>
        </div>

        {/* Card */}
        <div className="bg-card rounded-2xl border border-border shadow-sm p-8">

          {/* Header */}
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-lg bg-primary-light dark:bg-primary/20 flex items-center justify-center flex-shrink-0">
              <Building2 className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground">
                Set Up Your Firm
              </h1>
              <p className="text-sm text-muted-foreground">
                Create your accountant firm portal
              </p>
            </div>
          </div>

          <p className="text-sm text-foreground mb-6 leading-relaxed">
            Your firm portal lets you manage multiple clients, view their books, and collaborate with your team — all in one place.
          </p>

          <div className="space-y-5">
            {/* Firm Name */}
            <div className="space-y-1.5">
              <Label htmlFor="name">Firm Name</Label>
              <Input
                id="name"
                placeholder="e.g. Smith & Associates CPA"
                value={name}
                onChange={(e) => handleNameChange(e.target.value)}
              />
            </div>

            {/* Subdomain */}
            <div className="space-y-1.5">
              <Label htmlFor="subdomain">Subdomain</Label>
              <div className="flex items-center rounded-md border border-input bg-card overflow-hidden focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-1 focus-within:ring-offset-background">
                <input
                  id="subdomain"
                  value={subdomain}
                  onChange={(e) => {
                    setSubdomainTouched(true);
                    setSubdomain(
                      e.target.value
                        .toLowerCase()
                        .replace(/[^a-z0-9-]/g, '')
                        .slice(0, 40),
                    );
                  }}
                  placeholder="smith-associates"
                  className="flex-1 px-3 py-2 text-sm bg-transparent outline-none text-foreground placeholder:text-muted-foreground"
                />
                <span className="px-3 text-sm text-muted-foreground bg-muted border-l border-border py-2 whitespace-nowrap">
                  .gettempo.ca
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                Lowercase letters, numbers, and hyphens only.
              </p>
            </div>

            {/* Error */}
            {error && (
              <div className="flex items-start gap-2 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-lg px-3 py-2.5">
                <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
              </div>
            )}

            {/* Submit */}
            <Button
              onClick={handleSubmit}
              disabled={!canSubmit}
              className="w-full"
            >
              {submitting ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <ChevronRight className="w-4 h-4 mr-2" />
              )}
              {submitting ? 'Creating Firm…' : 'Create Firm & Continue'}
            </Button>
          </div>
        </div>

        <p className="text-center text-xs text-muted-foreground mt-4">
          You can update your firm name, logo, and brand colour in Firm Settings at any time.
        </p>
      </div>
    </div>
  );
}
