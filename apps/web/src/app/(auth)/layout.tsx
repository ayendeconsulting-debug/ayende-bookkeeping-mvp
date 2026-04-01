export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="flex flex-col items-center gap-6">
        {/* Logo */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-[#0F6E56] flex items-center justify-center">
            <svg
              viewBox="0 0 16 16"
              fill="white"
              className="w-5 h-5"
            >
              <path d="M2 12 L8 4 L14 12 Z" />
            </svg>
          </div>
          <div>
            <div className="text-base font-semibold text-gray-900 leading-tight">
              Ayende
            </div>
            <div className="text-xs text-gray-500 uppercase tracking-wider leading-tight">
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
