'use client';

import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

interface ClientContextBannerProps {
  clientName: string;
  businessId: string;
}

export function ClientContextBanner({ clientName, businessId }: ClientContextBannerProps) {
  return (
    <div className="flex items-center gap-3 px-4 py-2.5 rounded-lg bg-primary/10 border border-primary/20">
      <Link
        href="/accountant/clients"
        className="flex items-center gap-1.5 text-sm font-medium text-primary hover:text-primary/80 transition-colors flex-shrink-0"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        Back to Clients
      </Link>
      <div className="w-px h-4 bg-primary/20" />
      <span className="text-sm text-muted-foreground">
        Viewing <span className="font-semibold text-foreground">{clientName}</span>
      </span>
    </div>
  );
}
