export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-6">
        {/* Logo */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-[#0F6E56] flex items-center justify-center">
            {/* Rising bars — Tempo logo mark */}
            <svg viewBox="0 0 16 16" className="w-5 h-5">
              <rect x="1"   y="10" width="3" height="5"  rx="0.5" fill="white" opacity="0.5"/>
              <rect x="6.5" y="7"  width="3" height="8"  rx="0.5" fill="white" opacity="0.75"/>
              <rect x="12"  y="3"  width="3" height="12" rx="0.5" fill="white"/>
            </svg>
          </div>
          <div>
            <div className="text-base font-semibold text-foreground leading-tight">
              Tempo
            </div>
            <div className="text-xs text-muted-foreground uppercase tracking-wider leading-tight">
              Bookkeeping
            </div>
          </div>
        </div>

        {/* Clerk component renders here */}
        {children}
      </div>
    </div>
  );
}
