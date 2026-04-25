'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Mail, Calendar, BookOpen } from 'lucide-react';
import { FaqAccordion, FAQ_TOPICS, getTopicCounts, type FaqTopic } from '../faq-accordion';
import { RequestDemoButton } from '@/components/request-demo-button';

type Selected = FaqTopic | 'All';

export default function FaqPage() {
  const [selected, setSelected] = useState<Selected>('All');
  const counts = getTopicCounts();
  const totalCount = FAQ_TOPICS.reduce((sum, t) => sum + (counts[t] ?? 0), 0);

  return (
    <>
      {/* Hero */}
      <section className="max-w-3xl mx-auto px-6 pt-16 pb-8 text-center">
        <p className="text-xs font-semibold text-[#0F6E56] uppercase tracking-wider mb-3">FAQ</p>
        <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
          The questions worth answering honestly.
        </h1>
        <p className="text-muted-foreground">
          Can&apos;t find the answer?{' '}
          <a
            href="mailto:hello@gettempo.ca"
            className="text-[#0F6E56] hover:underline underline-offset-2"
          >
            Email us.
          </a>
        </p>
      </section>

      {/* Sticky chip strip */}
      <section className="sticky top-16 z-30 bg-card/95 backdrop-blur-sm border-y border-border shadow-sm">
        <div className="max-w-4xl mx-auto px-6 py-3 flex flex-wrap items-center justify-center gap-2">
          <ChipButton label="All" count={totalCount} active={selected === 'All'} onClick={() => setSelected('All')} />
          {FAQ_TOPICS.map(topic => (
            <ChipButton
              key={topic}
              label={topic}
              count={counts[topic] ?? 0}
              active={selected === topic}
              onClick={() => setSelected(topic)}
            />
          ))}
        </div>
      </section>

      {/* Accordion */}
      <section className="max-w-3xl mx-auto px-6 py-12">
        <FaqAccordion selectedTopic={selected} />
      </section>

      {/* Closing band */}
      <section className="bg-card border-t border-border">
        <div className="max-w-4xl mx-auto px-6 py-16 text-center">
          <h2 className="text-2xl font-bold text-foreground mb-2">Still have questions?</h2>
          <p className="text-sm text-muted-foreground mb-8">
            We answer them ourselves. No bots, no ticket queue.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-2xl mx-auto">
            <a
              href="mailto:hello@gettempo.ca"
              className="flex flex-col items-center gap-2 p-6 bg-background border border-border rounded-xl hover:border-[#0F6E56] hover:shadow-sm transition-all"
            >
              <div className="w-10 h-10 rounded-xl bg-card border border-border flex items-center justify-center">
                <Mail className="w-5 h-5 text-[#0F6E56]" />
              </div>
              <p className="text-sm font-semibold text-foreground">Email us</p>
              <p className="text-xs text-muted-foreground">Reply within a day</p>
            </a>
            <div className="flex flex-col items-center gap-2 p-6 bg-background border border-border rounded-xl hover:border-[#0F6E56] hover:shadow-sm transition-all">
              <div className="w-10 h-10 rounded-xl bg-card border border-border flex items-center justify-center">
                <Calendar className="w-5 h-5 text-[#0F6E56]" />
              </div>
              <p className="text-sm font-semibold text-foreground">Book a demo</p>
              <p className="text-xs text-muted-foreground mb-2">15 minutes, screen-share</p>
              <RequestDemoButton variant="nav" label="Request a Demo" />
            </div>
            <Link
              href="/about"
              className="flex flex-col items-center gap-2 p-6 bg-background border border-border rounded-xl hover:border-[#0F6E56] hover:shadow-sm transition-all"
            >
              <div className="w-10 h-10 rounded-xl bg-card border border-border flex items-center justify-center">
                <BookOpen className="w-5 h-5 text-[#0F6E56]" />
              </div>
              <p className="text-sm font-semibold text-foreground">Read the docs</p>
              <p className="text-xs text-muted-foreground">Setup &amp; how-to guides</p>
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}

interface ChipButtonProps {
  label: string;
  count: number;
  active: boolean;
  onClick: () => void;
}

function ChipButton({ label, count, active, onClick }: ChipButtonProps) {
  return (
    <button
      onClick={onClick}
      className={[
        'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors',
        active
          ? 'bg-[#0F6E56] text-white'
          : 'bg-card border border-border text-foreground hover:border-[#0F6E56]',
      ].join(' ')}
    >
      {label}
      <span className={['text-xs', active ? 'text-white/70' : 'text-muted-foreground'].join(' ')}>
        {count}
      </span>
    </button>
  );
}
