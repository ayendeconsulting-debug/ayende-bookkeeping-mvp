import { MarketingNav } from '@/components/marketing-nav';
import { MarketingFooter } from '@/components/marketing-footer';
import { MarketingThemeEnforcer } from '@/components/marketing-theme-enforcer';

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      {/* Runs synchronously before React hydrates — overrides root layout dark script */}
      <script
        dangerouslySetInnerHTML={{
          __html: `
            try {
              document.documentElement.dataset.forceLight = 'true';
              document.documentElement.classList.remove('dark');
            } catch(e) {}
          `,
        }}
      />
      <MarketingThemeEnforcer />
      <div className="min-h-screen bg-background flex flex-col">
        <MarketingNav />
        <main className="flex-1">
          {children}
        </main>
        <MarketingFooter />
      </div>
    </>
  );
}
