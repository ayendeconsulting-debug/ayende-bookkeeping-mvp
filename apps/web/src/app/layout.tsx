import type { Metadata } from 'next';
import { ClerkProvider } from '@clerk/nextjs';
import { Toaster } from 'sonner';
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
      <html lang="en">
        <body>
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
        </body>
      </html>
    </ClerkProvider>
  );
}
