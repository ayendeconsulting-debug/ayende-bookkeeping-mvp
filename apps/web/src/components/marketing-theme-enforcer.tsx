'use client';

import { useEffect } from 'react';

export function MarketingThemeEnforcer() {
  useEffect(() => {
    // Save whatever the app theme currently is
    const stored = localStorage.getItem('tempo-theme');
    const hadDark = document.documentElement.classList.contains('dark');

    // Force light on all marketing pages
    document.documentElement.classList.remove('dark');

    return () => {
      // Restore user's app theme when they navigate away from marketing
      if (stored === 'dark' || (!stored && hadDark)) {
        document.documentElement.classList.add('dark');
      }
    };
  }, []);

  return null;
}
