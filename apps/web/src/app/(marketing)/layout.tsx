import { MarketingThemeEnforcer } from '@/components/marketing-theme-enforcer';

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <MarketingThemeEnforcer />
      <div className="min-h-screen bg-background flex flex-col">
        {children}
      </div>
    </>
  );
}
