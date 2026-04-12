'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@clerk/nextjs';
import { Building2, ChevronRight, Loader2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function AccountantSetupPage() {
  const router = useRouter();
  const { getToken } = useAuth();

  const [name, setName] = useState('');
  const [subdomain, setSubdomain] = useState('');
  const [subdomainTouched, setSubdomainTouched] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Auto-generate subdomain from name
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
      const token = await getToken();
      const res = await fetch('/api/proxy/firms', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ name: name.trim(), subdomain: subdomain.trim() }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data?.message ?? 'Failed to create firm. Please try again.');
        setSubmitting(false);
        return;
      }

      // Firm created — go straight to the portal
      router.push('/accountant/clients');
    } catch {
      setError('An unexpected error occurred. Please try again.');
      setSubmitting(false);
    }
  }

  const canSubmit = name.trim().length > 0 && subdomain.trim().length > 0 && !submitting;

  return (
    <div className="min-h-screen bg-[#f7f5f0] dark:bg-[#1a1814] flex items-center justify-center p-4">
      <div className="w-full max-w-md">

        {/* Logo mark */}
        <div className="flex justify-center mb-8">
          <div className="w-12 h-12 rounded-xl bg-[#0F6E56] flex items-center justify-center shadow-lg">
            <svg viewBox="0 0 16 16" className="w-7 h-7">
              <rect x="1"   y="10" width="3" height="5"  rx="0.5" fill="white" opacity="0.5"/>
              <rect x="6.5" y="7"  width="3" height="8"  rx="0.5" fill="white" opacity="0.75"/>
              <rect x="12"  y="3"  width="3" height="12" rx="0.5" fill="white"/>
            </svg>
          </div>
        </div>

        {/* Card */}
        <div className="bg-white dark:bg-[#242220] rounded-2xl border border-[#e5e1d8] dark:border-[#3a3730] shadow-sm p-8">

          {/* Header */}
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-lg bg-[#EDF7F2] dark:bg-[#0F6E56]/20 flex items-center justify-center flex-shrink-0">
              <Building2 className="w-5 h-5 text-[#0F6E56] dark:text-[#4abe94]" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-[#1a1814] dark:text-[#f0ede8]">
                Set Up Your Firm
              </h1>
              <p className="text-sm text-[#888070] dark:text-[#7a7268]">
                Create your accountant firm portal
              </p>
            </div>
          </div>

          <p className="text-sm text-[#4A4438] dark:text-[#c8c0b0] mb-6 leading-relaxed">
            Your firm portal lets you manage multiple clients, view their books, and collaborate with your team — all in one place.
          </p>

          <div className="space-y-5">
            {/* Firm Name */}
            <div className="space-y-1.5">
              <Label htmlFor="name" className="text-sm font-medium text-[#1a1814] dark:text-[#f0ede8]">
                Firm Name
              </Label>
              <Input
                id="name"
                placeholder="e.g. Smith & Associates CPA"
                value={name}
                onChange={(e) => handleNameChange(e.target.value)}
                className="bg-[#faf9f7] dark:bg-[#2e2c28] border-[#e5e1d8] dark:border-[#3a3730]"
              />
            </div>

            {/* Subdomain */}
            <div className="space-y-1.5">
              <Label htmlFor="subdomain" className="text-sm font-medium text-[#1a1814] dark:text-[#f0ede8]">
                Subdomain
              </Label>
              <div className="flex items-center rounded-md border border-[#e5e1d8] dark:border-[#3a3730] bg-[#faf9f7] dark:bg-[#2e2c28] overflow-hidden focus-within:ring-1 focus-within:ring-[#0F6E56]">
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
                  className="flex-1 px-3 py-2 text-sm bg-transparent outline-none text-[#1a1814] dark:text-[#f0ede8] placeholder:text-[#aaa098]"
                />
                <span className="px-3 text-sm text-[#888070] dark:text-[#605850] bg-[#f0ede8] dark:bg-[#2a2825] border-l border-[#e5e1d8] dark:border-[#3a3730] py-2 whitespace-nowrap">
                  .gettempo.ca
                </span>
              </div>
              <p className="text-xs text-[#888070] dark:text-[#7a7268]">
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
              className="w-full bg-[#0F6E56] hover:bg-[#0d5e49] text-white font-medium"
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

        <p className="text-center text-xs text-[#aaa098] dark:text-[#605850] mt-4">
          You can update your firm name, logo, and brand colour in Firm Settings at any time.
        </p>
      </div>
    </div>
  );
}
