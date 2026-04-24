import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import { ClerkProvider } from '@clerk/nextjs';
import { Toaster } from 'sonner';
import { ThemeProvider } from '@/components/theme-provider';
import { BrandingProvider } from '@/components/branding-provider';
import { PwaRegister } from '@/components/pwa-register';
import './globals.css';

// Phase 27.1.a – load Inter properly via next/font/google.
// Exposes --font-inter for use in globals.css --font-sans stack.
const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
});

export const metadata: Metadata = {
  title: 'Tempo Books - AI-Assisted Bookkeeping for Canadian and US Small Businesses',
  description: 'Double-entry accounting, bank sync, AI transaction classification, HST/GST filing, and a dedicated Accountant Portal. Free trial available.',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Tempo Books',
  },
  icons: {
    apple: '/icons/apple-touch-icon.png',
    icon: '/icons/icon-192.png',
  },
};

export const viewport: Viewport = {
  themeColor: '#0F6E56',
  width: 'device-width',
  initialScale: 1,
  minimumScale: 1,
  viewportFit: 'cover',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ClerkProvider>
      <html lang="en" suppressHydrationWarning className={inter.variable}>
        <body>
          <script
            dangerouslySetInnerHTML={{
              __html: `
                try {
                  var p = window.location.pathname;
                  var marketingRoutes = ['/', '/pricing', '/about', '/faq', '/cookies', '/privacy', '/terms', '/terms-of-use'];
                  var isMarketing = marketingRoutes.indexOf(p) !== -1;
                  if (isMarketing) {
                    document.documentElement.dataset.forceLight = 'true';
                    document.documentElement.classList.remove('dark');
                  } else {
                    var t = localStorage.getItem('tempo-theme');
                    if (t === 'dark' || (!t && window.matchMedia('(max-width: 767px)').matches)) {
                      document.documentElement.classList.add('dark');
                    }
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
          <PwaRegister />
        </body>
      </html>
    </ClerkProvider>
  );
}
