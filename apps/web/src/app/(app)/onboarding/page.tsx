'use client';

import { useState, useTransition } from 'react';
import { saveModeSelection } from './actions';
import { toastError } from '@/lib/toast';

type Mode = 'business' | 'freelancer' | 'personal';
type Country = 'CA' | 'US';

interface ModeCard {
  id: Mode;
  icon: string;
  title: string;
  subtitle: string;
  features: string[];
}

const MODE_CARDS: ModeCard[] = [
  {
    id: 'business',
    icon: '🏢',
    title: 'Business',
    subtitle: 'Incorporated companies, partnerships, registered businesses',
    features: [
      'Full double-entry accounting',
      'Accounts payable & receivable',
      'Financial reports & tax filing',
      'Invoice creation & tracking',
      'Multi-user access control',
    ],
  },
  {
    id: 'freelancer',
    icon: '💼',
    title: 'Freelancer / Sole Proprietor',
    subtitle: 'Independent contractors, consultants, self-employed',
    features: [
      'Personal & business expense split',
      'Simplified income categories',
      'Quarterly tax estimates',
      'Invoice creation',
      'Mileage tracker',
    ],
  },
  {
    id: 'personal',
    icon: '🏠',
    title: 'Personal Finance',
    subtitle: 'Household budgeting, savings goals, spending tracking',
    features: [
      'Budget categories & targets',
      'Savings goals tracker',
      'Net worth tracker',
      'Recurring payment detection',
      'Upcoming payment reminders',
    ],
  },
];

export default function OnboardingPage() {
  const [selectedMode, setSelectedMode] = useState<Mode | null>(null);
  const [selectedCountry, setSelectedCountry] = useState<Country | null>(null);
  const [isPending, startTransition] = useTransition();

  const canSubmit = selectedMode !== null && selectedCountry !== null && !isPending;

  function handleSubmit() {
    if (!selectedMode || !selectedCountry) return;

    startTransition(async () => {
      const result = await saveModeSelection(selectedMode, selectedCountry);
      if (result?.error) {
        toastError('Could not save your selection', result.error);
      }
      // On success, server action redirects to /dashboard
    });
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
      <div className="w-full max-w-4xl">
        {/* Header */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-[#0F6E56] text-white text-2xl mb-4">
            A
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Welcome to Ayende CX</h1>
          <p className="text-gray-500 text-lg">
            Tell us how you use money — we'll tailor the experience for you.
          </p>
        </div>

        {/* Mode Selection */}
        <div className="mb-8">
          <p className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-4">
            How will you use Ayende CX?
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {MODE_CARDS.map((card) => {
              const isSelected = selectedMode === card.id;
              return (
                <button
                  key={card.id}
                  onClick={() => setSelectedMode(card.id)}
                  className={[
                    'text-left p-6 rounded-2xl border-2 transition-all duration-150 bg-white',
                    'hover:border-[#0F6E56] hover:shadow-md',
                    isSelected ? 'border-[#0F6E56] shadow-md ring-2 ring-[#0F6E56]/20' : 'border-gray-200',
                  ].join(' ')}
                >
                  <div className="text-3xl mb-3">{card.icon}</div>
                  <div className="font-semibold text-gray-900 text-base mb-1">{card.title}</div>
                  <div className="text-gray-500 text-sm mb-4">{card.subtitle}</div>
                  <ul className="space-y-1">
                    {card.features.map((f) => (
                      <li key={f} className="flex items-center gap-2 text-sm text-gray-600">
                        <span className={isSelected ? 'text-[#0F6E56]' : 'text-gray-400'}>✓</span>
                        {f}
                      </li>
                    ))}
                  </ul>
                  {isSelected && (
                    <div className="mt-4 flex items-center gap-1.5 text-[#0F6E56] text-sm font-medium">
                      <span className="w-4 h-4 rounded-full bg-[#0F6E56] flex items-center justify-center text-white text-xs">✓</span>
                      Selected
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Country Selection */}
        <div className="mb-8">
          <p className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-4">
            Where are you based?
          </p>
          <div className="grid grid-cols-2 gap-4 max-w-sm">
            {(['CA', 'US'] as Country[]).map((c) => {
              const isSelected = selectedCountry === c;
              return (
                <button
                  key={c}
                  onClick={() => setSelectedCountry(c)}
                  className={[
                    'flex items-center gap-3 p-4 rounded-xl border-2 transition-all duration-150 bg-white',
                    'hover:border-[#0F6E56]',
                    isSelected ? 'border-[#0F6E56] ring-2 ring-[#0F6E56]/20' : 'border-gray-200',
                  ].join(' ')}
                >
                  <span className="text-2xl">{c === 'CA' ? '🇨🇦' : '🇺🇸'}</span>
                  <div className="text-left">
                    <div className="font-semibold text-gray-900 text-sm">
                      {c === 'CA' ? 'Canada' : 'United States'}
                    </div>
                    <div className="text-xs text-gray-500">
                      {c === 'CA' ? 'CAD · CRA rates' : 'USD · IRS rates'}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Submit */}
        <div className="flex items-center gap-4">
          <button
            onClick={handleSubmit}
            disabled={!canSubmit}
            className={[
              'px-8 py-3 rounded-xl font-semibold text-white transition-all duration-150',
              canSubmit
                ? 'bg-[#0F6E56] hover:bg-[#0a5540] cursor-pointer shadow-sm hover:shadow-md'
                : 'bg-gray-300 cursor-not-allowed',
            ].join(' ')}
          >
            {isPending ? 'Saving…' : 'Get Started →'}
          </button>
          {!canSubmit && !isPending && (
            <p className="text-sm text-gray-400">
              {!selectedMode && !selectedCountry
                ? 'Select a mode and country to continue'
                : !selectedMode ? 'Select a mode to continue'
                : 'Select your country to continue'}
            </p>
          )}
        </div>

        <p className="mt-6 text-xs text-gray-400">
          You can change your mode at any time in Settings.
        </p>
      </div>
    </div>
  );
}
