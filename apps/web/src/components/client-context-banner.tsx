'use client';

import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';

interface ClientContextBannerProps {
  clientName: string;
  businessId: string;
}

export function ClientContextBanner({ clientName, businessId }: ClientContextBannerProps) {
  const router = useRouter();

  const handleBack = () => {
    // Clear the client context cookie before navigating back
    document.cookie = 'client-business-id=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Strict';
    router.push('/accountant/clients');
  };

  return (
    <div className="flex items-center gap-3 px-4 py-2.5 rounded-lg bg-primary/10 border border-primary/20">
      <button
        onClick={handleBack}
        className="flex items-center gap-1.5 text-sm font-medium text-primary hover:text-primary/80 transition-colors flex-shrink-0"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        Back to Clients
      </button>
      <div className="w-px h-4 bg-primary/20" />
      <span className="text-sm text-muted-foreground">
        Viewing <span className="font-semibold text-foreground">{clientName}</span>
      </span>
    </div>
  );
}
