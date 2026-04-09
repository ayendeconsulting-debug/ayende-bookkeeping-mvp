'use client';

import { useEffect } from 'react';

export function MarketingThemeEnforcer() {
  useEffect(() => {
    // Set flag FIRST so ThemeProvider respects it when it runs
    document.documentElement.dataset.forceLight = 'true';
    document.documentElement.classList.remove('dark');

    return () => {
      // Remove flag when leaving marketing pages
      delete document.documentElement.dataset.forceLight;

      // Restore the user's app theme preference
      const stored = localStorage.getItem('tempo-theme');
      if (stored === 'dark') {
        document.documentElement.classList.add('dark');
      }
    };
  }, []);

  return null;
}
