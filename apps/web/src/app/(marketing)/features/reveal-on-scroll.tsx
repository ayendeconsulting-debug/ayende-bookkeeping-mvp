'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';

interface RevealOnScrollProps {
  children: ReactNode;
}

type RevealState = 'initial' | 'hidden' | 'visible';

export function RevealOnScroll({ children }: RevealOnScrollProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [state, setState] = useState<RevealState>('initial');

  useEffect(() => {
    const node = ref.current;
    if (!node || typeof IntersectionObserver === 'undefined') {
      setState('visible');
      return;
    }

    // If the scene is already in the viewport on mount (e.g. above the fold),
    // skip the fade-in and render visible immediately.
    const rect = node.getBoundingClientRect();
    const inViewport = rect.top < window.innerHeight && rect.bottom > 0;
    if (inViewport) {
      setState('visible');
      return;
    }

    // Below the fold: hide first, then observer brings it back into view.
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
      { rootMargin: '0px 0px -10% 0px', threshold: 0.05 }
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const className =
    state === 'hidden'
      ? 'opacity-0'
      : state === 'visible'
        ? 'opacity-100 transition-opacity duration-700 ease-out'
        : '';

  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}
