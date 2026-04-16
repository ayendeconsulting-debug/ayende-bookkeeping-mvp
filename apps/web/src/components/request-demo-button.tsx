'use client';

import { useState } from 'react';
import { X, Loader2, CheckCircle2, ArrowRight } from 'lucide-react';

interface FormState {
  first_name: string;
  last_name: string;
  email: string;
  company: string;
  phone: string;
}

const EMPTY: FormState = {
  first_name: '', last_name: '', email: '', company: '', phone: '',
};

interface RequestDemoButtonProps {
  variant?: 'hero' | 'footer' | 'nav';
  label?: string;
}

export function RequestDemoButton({
  variant = 'hero',
  label = 'Request a Demo',
}: RequestDemoButtonProps) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  function openModal() { setOpen(true); setSuccess(false); setError(''); setForm(EMPTY); }
  function closeModal() { setOpen(false); }

  async function handleSubmit() {
    if (!form.first_name.trim()) { setError('First name is required.'); return; }
    if (!form.last_name.trim())  { setError('Last name is required.'); return; }
    if (!form.email.trim())      { setError('Email is required.'); return; }

    setSubmitting(true); setError('');
    try {
      const params = new URLSearchParams(window.location.search);
      const utm = {
        utm_source:   params.get('utm_source')   ?? undefined,
        utm_medium:   params.get('utm_medium')   ?? undefined,
        utm_campaign: params.get('utm_campaign') ?? undefined,
      };

      const res = await fetch('/api/public/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, ...utm }),
      });

      if (res.status === 429) throw new Error('Too many submissions. Please try again later.');
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message ?? 'Submission failed — please try again.');
      }

      setSuccess(true);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Something went wrong.');
    } finally {
      setSubmitting(false);
    }
  }

  const btnCls = {
    hero:   'inline-flex items-center gap-2 bg-[#E07B39] text-white px-6 py-3 rounded-xl font-semibold text-sm hover:bg-[#c96a2c] transition-colors shadow-sm',
    footer: 'inline-flex items-center gap-2 bg-[#E07B39] text-white px-5 py-2.5 rounded-xl font-semibold text-sm hover:bg-[#c96a2c] transition-colors',
    nav:    'inline-flex items-center gap-1.5 bg-[#E07B39] text-white px-4 py-2 rounded-lg font-semibold text-xs hover:bg-[#c96a2c] transition-colors',
  }[variant];

  return (
    <>
      <button onClick={openModal} className={btnCls}>
        {label}
        {variant !== 'nav' && <ArrowRight className="w-4 h-4" />}
      </button>

      {open && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">

            {/* Header — Tempo branded */}
            <div className="bg-[#0F6E56] px-6 py-5">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  {/* Tempo Logo lockup */}
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-7 h-7 rounded-lg bg-white/20 flex items-center justify-center flex-shrink-0">
                      <svg viewBox="0 0 16 16" className="w-4 h-4" aria-hidden="true">
                        <rect x="1"   y="10" width="3" height="5" rx="0.5" fill="white" opacity="0.55" />
                        <rect x="6.5" y="7"  width="3" height="8" rx="0.5" fill="white" opacity="0.8"  />
                        <rect x="12"  y="3"  width="3" height="12" rx="0.5" fill="white" />
                      </svg>
                    </div>
                    <span className="text-white font-bold text-base tracking-tight leading-none">
                      Tempo Books
                    </span>
                  </div>
                  <h2 className="text-lg font-bold text-white leading-tight">Request a Demo</h2>
                  <p className="text-sm text-white/75 mt-0.5">
                    We&apos;ll walk you through Tempo Books personally.
                  </p>
                </div>
                <button
                  onClick={closeModal}
                  className="text-white/60 hover:text-white transition-colors mt-0.5 flex-shrink-0 ml-4"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Accent stripe */}
            <div className="h-0.5 bg-gradient-to-r from-[#5ECBA1] via-[#C3E8D8] to-[#EDF7F2]" />

            {/* Body */}
            <div className="px-6 py-5">
              {success ? (
                <div className="flex flex-col items-center text-center py-6 gap-4">
                  <div className="w-14 h-14 rounded-full bg-[#EDF7F2] flex items-center justify-center">
                    <CheckCircle2 className="w-8 h-8 text-[#0F6E56]" />
                  </div>
                  <div>
                    <p className="text-base font-semibold text-gray-900">You&apos;re on the list!</p>
                    <p className="text-sm text-gray-500 mt-1">
                      Thanks &mdash; we&apos;ll be in touch soon to set up your demo.
                    </p>
                  </div>
                  <button
                    onClick={closeModal}
                    className="mt-2 text-sm font-medium text-[#0F6E56] hover:underline underline-offset-2"
                  >
                    Close
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-gray-700">
                        First Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={form.first_name}
                        onChange={(e) => setForm((p) => ({ ...p, first_name: e.target.value }))}
                        placeholder="Adesanya"
                        className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-[#0F6E56] focus:ring-1 focus:ring-[#0F6E56]"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-gray-700">
                        Last Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={form.last_name}
                        onChange={(e) => setForm((p) => ({ ...p, last_name: e.target.value }))}
                        placeholder="Ehinmidu"
                        className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-[#0F6E56] focus:ring-1 focus:ring-[#0F6E56]"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-gray-700">
                      Work Email <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="email"
                      value={form.email}
                      onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
                      placeholder="you@yourcompany.com"
                      className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-[#0F6E56] focus:ring-1 focus:ring-[#0F6E56]"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-gray-700">Company</label>
                    <input
                      type="text"
                      value={form.company}
                      onChange={(e) => setForm((p) => ({ ...p, company: e.target.value }))}
                      placeholder="Your Business Inc."
                      className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-[#0F6E56] focus:ring-1 focus:ring-[#0F6E56]"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-gray-700">
                      Phone <span className="text-gray-400 font-normal">(optional)</span>
                    </label>
                    <input
                      type="tel"
                      value={form.phone}
                      onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))}
                      placeholder="+1 416 000 0000"
                      className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-[#0F6E56] focus:ring-1 focus:ring-[#0F6E56]"
                    />
                  </div>

                  {error && (
                    <p className="text-sm text-red-600">{error}</p>
                  )}

                  <button
                    onClick={handleSubmit}
                    disabled={submitting}
                    className="w-full bg-[#E07B39] text-white font-semibold text-sm py-3 rounded-xl hover:bg-[#c96a2c] transition-colors disabled:opacity-60 flex items-center justify-center gap-2 mt-2"
                  >
                    {submitting
                      ? <><Loader2 className="w-4 h-4 animate-spin" />Submitting&hellip;</>
                      : 'Request Demo'}
                  </button>

                  <p className="text-xs text-gray-400 text-center">
                    No spam. We&apos;ll reach out within one business day.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
