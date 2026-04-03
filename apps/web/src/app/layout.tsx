import type { Metadata } from 'next';
import { ClerkProvider } from '@clerk/nextjs';
import { Toaster } from 'sonner';
import { ThemeProvider } from '@/components/theme-provider';
import './globals.css';

export const metadata: Metadata = {
  title: 'Ayende Bookkeeping App',
  description: 'Multi-tenant bookkeeping for Canadian and US small businesses',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ClerkProvider>
      {/* suppressHydrationWarning prevents React warning when the dark class
          is added to <html> by the flash-prevention script before hydration */}
      <html lang="en" suppressHydrationWarning>
        <body>
          {/* Flash-prevention: runs before React hydrates, applies dark class
              immediately so the user never sees a white flash in dark mode */}
          <script
            dangerouslySetInnerHTML={{
              __html: `
                try {
                  var t = localStorage.getItem('ayende-theme');
                  if (t === 'dark' || (!t && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
                    document.documentElement.classList.add('dark');
                  }
                } catch(e) {}
              `,
            }}
          />
          <ThemeProvider>
            {children}
            <Toaster
              position="top-right"
              toastOptions={{
                style: {
                  fontFamily: 'inherit',
                },
                classNames: {
                  success: 'border-[#0F6E56]',
                },
              }}
              richColors
              closeButton
            />
          </ThemeProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
