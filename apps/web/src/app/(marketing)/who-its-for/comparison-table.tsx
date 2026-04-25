'use client';

import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { CheckCircle2 } from 'lucide-react';

type ComparisonValue = boolean | string;

interface ComparisonRow {
  feature: string;
  tempo: ComparisonValue;
  qbo: ComparisonValue;
  wave: ComparisonValue;
}

interface ComparisonTableProps {
  rows: ComparisonRow[];
}

type RevealState = 'initial' | 'hidden' | 'visible';

export function ComparisonTable({ rows }: ComparisonTableProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [state, setState] = useState<RevealState>('initial');

  useEffect(() => {
    const node = ref.current;
    if (!node || typeof IntersectionObserver === 'undefined') {
      setState('visible');
      return;
    }
    const rect = node.getBoundingClientRect();
    if (rect.top < window.innerHeight && rect.bottom > 0) {
      setState('visible');
      return;
    }
    setState('hidden');

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setState('visible');
            observer.disconnect();
          }
        }
      },
      { rootMargin: '0px 0px -10% 0px', threshold: 0.05 },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  function rowStyle(idx: number): CSSProperties {
    if (state === 'initial') return {};
    if (state === 'hidden') return { opacity: 0, transform: 'translateY(8px)' };
    return {
      opacity: 1,
      transform: 'translateY(0)',
      transition: `opacity 400ms ease-out ${idx * 80}ms, transform 400ms ease-out ${idx * 80}ms`,
    };
  }

  return (
    <div ref={ref} className="overflow-x-auto rounded-2xl border border-border">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border">
            <th className="text-left px-5 py-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider w-1/3">
              Feature
            </th>
            <th className="px-5 py-4 text-center w-1/5">
              <div className="flex flex-col items-center gap-1">
                <div className="w-7 h-7 rounded-lg bg-[#0F6E56] flex items-center justify-center">
                  <svg viewBox="0 0 16 16" className="w-4 h-4">
                    <rect x="1" y="10" width="3" height="5" rx="0.5" fill="white" opacity="0.5"/>
                    <rect x="6.5" y="7" width="3" height="8" rx="0.5" fill="white" opacity="0.75"/>
                    <rect x="12" y="3" width="3" height="12" rx="0.5" fill="white"/>
                  </svg>
                </div>
                <span className="text-xs font-semibold text-[#0F6E56]">Tempo Books</span>
              </div>
            </th>
            <th className="px-5 py-4 text-center w-1/5">
              <span className="text-xs font-semibold text-muted-foreground">QuickBooks Online</span>
            </th>
            <th className="px-5 py-4 text-center w-1/5">
              <span className="text-xs font-semibold text-muted-foreground">Wave</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, idx) => (
            <tr
              key={row.feature}
              style={rowStyle(idx)}
              className={idx % 2 === 0 ? 'bg-background' : 'bg-card'}
            >
              <td className="px-5 py-3.5 text-sm font-medium text-foreground">
                {row.feature}
              </td>
              {([
                { val: row.tempo, accent: true },
                { val: row.qbo,   accent: false },
                { val: row.wave,  accent: false },
              ] as { val: ComparisonValue; accent: boolean }[]).map((cell, ci) => (
                <td key={ci} className="px-5 py-3.5 text-center">
                  {cell.val === true ? (
                    <div className="flex justify-center">
                      <div className={[
                        'w-5 h-5 rounded-full flex items-center justify-center',
                        cell.accent ? 'bg-[#EDF7F2]' : 'bg-muted',
                      ].join(' ')}>
                        <CheckCircle2 className={[
                          'w-3 h-3',
                          cell.accent ? 'text-[#0F6E56]' : 'text-muted-foreground',
                        ].join(' ')} />
                      </div>
                    </div>
                  ) : cell.val === false ? (
                    <span className="text-muted-foreground/40">&mdash;</span>
                  ) : (
                    <span className={[
                      'text-xs font-medium',
                      cell.accent ? 'text-[#0F6E56]' : 'text-muted-foreground',
                    ].join(' ')}>
                      {cell.val}
                    </span>
                  )}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
