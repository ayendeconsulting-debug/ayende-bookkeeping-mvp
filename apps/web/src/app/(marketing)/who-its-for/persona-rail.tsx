'use client';

import { useEffect, useRef, useState } from 'react';
import { Building2, Briefcase, Home, BarChart3, type LucideIcon } from 'lucide-react';

interface Persona {
  id: string;
  label: string;
  icon: LucideIcon;
}

const PERSONAS: Persona[] = [
  { id: 'business',    label: 'Business',    icon: Building2 },
  { id: 'freelancer',  label: 'Freelancer',  icon: Briefcase },
  { id: 'personal',    label: 'Personal',    icon: Home },
  { id: 'accountants', label: 'Accountant',  icon: BarChart3 },
];

const NAV_OFFSET = 130; // marketing nav (64) + sticky rail (~56) + breathing room

export function PersonaRail() {
  const [active, setActive] = useState<string>('business');
  const chipRefs = useRef<Map<string, HTMLButtonElement>>(new Map());

  // Active-section detection via IntersectionObserver
  useEffect(() => {
    const sections = PERSONAS
      .map((p) => document.getElementById(p.id))
      .filter((el): el is HTMLElement => el !== null);
    if (sections.length === 0 || typeof IntersectionObserver === 'undefined') return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting);
        if (visible.length === 0) return;
        // Pick the entry whose top is closest to the rail's bottom edge
        const best = visible.reduce((acc, e) =>
          Math.abs(e.boundingClientRect.top - NAV_OFFSET) <
          Math.abs(acc.boundingClientRect.top - NAV_OFFSET)
            ? e
            : acc,
        );
        setActive(best.target.id);
      },
      { rootMargin: `-${NAV_OFFSET}px 0px -50% 0px`, threshold: [0, 0.25, 0.5, 0.75] },
    );
    sections.forEach((s) => observer.observe(s));
    return () => observer.disconnect();
  }, []);

  // Mobile: keep the active chip centered in the horizontal scroll strip
  useEffect(() => {
    const chip = chipRefs.current.get(active);
    if (!chip) return;
    chip.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
  }, [active]);

  function handleClick(id: string) {
    const target = document.getElementById(id);
    if (!target) return;
    const top = target.getBoundingClientRect().top + window.scrollY - NAV_OFFSET;
    window.scrollTo({ top, behavior: 'smooth' });
    setActive(id);
  }

  return (
    <div className="sticky top-16 z-30 bg-card/95 backdrop-blur-sm border-y border-border shadow-sm">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3">
        {/* Desktop: 4-column grid */}
        <div className="hidden md:grid grid-cols-4 gap-2">
          {PERSONAS.map((p) => {
            const Icon = p.icon;
            const isActive = active === p.id;
            return (
              <button
                key={p.id}
                ref={(el) => { if (el) chipRefs.current.set(p.id, el); }}
                onClick={() => handleClick(p.id)}
                className={[
                  'flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-medium transition-all',
                  isActive
                    ? 'border-[#0F6E56] bg-[#EDF7F2] text-[#04342C]'
                    : 'border-border bg-background text-foreground hover:border-[#0F6E56]/40',
                ].join(' ')}
              >
                <span
                  className={[
                    'w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0',
                    isActive ? 'bg-[#9FE1CB]' : 'bg-muted',
                  ].join(' ')}
                >
                  <Icon
                    className={[
                      'w-3.5 h-3.5',
                      isActive ? 'text-[#04342C]' : 'text-muted-foreground',
                    ].join(' ')}
                  />
                </span>
                {p.label}
              </button>
            );
          })}
        </div>

        {/* Mobile: horizontal scroll chip strip */}
        <div className="md:hidden overflow-x-auto">
          <div className="flex gap-2 min-w-max pb-1">
            {PERSONAS.map((p) => {
              const Icon = p.icon;
              const isActive = active === p.id;
              return (
                <button
                  key={p.id}
                  ref={(el) => { if (el) chipRefs.current.set(p.id, el); }}
                  onClick={() => handleClick(p.id)}
                  className={[
                    'flex items-center gap-2 px-3 py-2 rounded-full border text-xs font-medium whitespace-nowrap transition-all flex-shrink-0',
                    isActive
                      ? 'border-[#0F6E56] bg-[#EDF7F2] text-[#04342C]'
                      : 'border-border bg-background text-foreground',
                  ].join(' ')}
                >
                  <Icon
                    className={[
                      'w-3.5 h-3.5',
                      isActive ? 'text-[#04342C]' : 'text-muted-foreground',
                    ].join(' ')}
                  />
                  {p.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
