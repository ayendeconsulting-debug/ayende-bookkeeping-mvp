import type { Metadata } from 'next';
import { ClerkProvider } from '@clerk/nextjs';
import { Toaster } from 'sonner';
import { ThemeProvider } from '@/components/theme-provider';
import { BrandingProvider } from '@/components/branding-provider';
import './globals.css';

export const metadata: Metadata = {
  title: 'Tempo Books — AI-Assisted Bookkeeping for Canadian & US Small Businesses',
  description: 'Double-entry accounting, bank sync, AI transaction classification, HST/GST filing, and a dedicated Accountant Portal. 60-day free trial.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ClerkProvider>
      <html lang="en" suppressHydrationWarning>
        <body>
          <script
            dangerouslySetInnerHTML={{
              __html: `
                try {
                  var t = localStorage.getItem('tempo-theme');
                  if (t === 'dark' || (!t && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
                    document.documentElement.classList.add('dark');
                  }
                } catch(e) {}
              `,
            }}
          />
          <BrandingProvider>
            <ThemeProvider>
              {children}
              <Toaster
                position="top-right"
                toastOptions={{
                  style: { fontFamily: 'inherit' },
                  classNames: { success: 'border-[#0F6E56]' },
                }}
                richColors
                closeButton
              />
            </ThemeProvider>
          </BrandingProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}

