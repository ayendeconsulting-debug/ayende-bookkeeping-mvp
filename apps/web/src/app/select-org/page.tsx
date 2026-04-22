'use client';
import { OrganizationList } from '@clerk/nextjs';
import { useUser } from '@clerk/nextjs';

export default function SelectOrgPage() {
  const { user } = useUser();
  const adminIds = (process.env.NEXT_PUBLIC_ADMIN_USER_IDS ?? '').split(',').map(s => s.trim()).filter(Boolean);
  const isPlatformAdmin = !!user && adminIds.includes(user.id);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="flex flex-col items-center gap-6">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-[#0F6E56] mb-3">
            <svg viewBox="0 0 16 16" className="w-7 h-7">
              <rect x="1"   y="10" width="3" height="5"  rx="0.5" fill="white" opacity="0.5"/>
              <rect x="6.5" y="7"  width="3" height="8"  rx="0.5" fill="white" opacity="0.75"/>
              <rect x="12"  y="3"  width="3" height="12" rx="0.5" fill="white"/>
            </svg>
          </div>
          <h1 className="text-xl font-bold text-foreground">Select your workspace</h1>
          <p className="text-sm text-muted-foreground mt-1">Choose or create your Tempo Books organization.</p>
        </div>
        <OrganizationList
          hidePersonal
          afterSelectOrganizationUrl={isPlatformAdmin ? '/admin' : '/dashboard'}
          afterCreateOrganizationUrl={isPlatformAdmin ? '/admin' : '/onboarding'}
        />
      </div>
    </div>
  );
}
