'use client';

import { useRef, useState, useEffect, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useUser, useOrganization, useOrganizationList } from '@clerk/nextjs';
import { ChevronDown, Check, Loader2, Building2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export function BusinessSwitcher() {
  const router = useRouter();
  const { user } = useUser();
  const { organization } = useOrganization();
  const { userMemberships, setActive } = useOrganizationList({ userMemberships: { infinite: true } });

  const [open, setOpen]          = useState(false);
  const [switching, startSwitch] = useTransition();
  const containerRef             = useRef<HTMLDivElement>(null);

  const orgs        = userMemberships?.data ?? [];
  const hasMultiple = orgs.length > 1;

  const isPlatformAdmin = (user?.publicMetadata as any)?.platform_role === 'admin';

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  function handleSelect(orgId: string) {
    if (orgId === organization?.id) { setOpen(false); return; }
    setOpen(false);
    startSwitch(async () => {
      await setActive?.({ organization: orgId });
      router.push(isPlatformAdmin ? '/admin' : '/dashboard');
      router.refresh();
    });
  }

  return (
    <div ref={containerRef} className="relative px-2 py-2 border-b border-border">
      <button onClick={() => hasMultiple && setOpen((v) => !v)} disabled={switching}
        className={cn('w-full flex items-center gap-2 px-2 py-2 min-h-[44px] rounded-md transition-colors text-left',
          hasMultiple ? 'hover:bg-accent cursor-pointer' : 'cursor-default')}
        aria-haspopup="listbox" aria-expanded={open}>
        <div className="w-6 h-6 rounded bg-primary flex items-center justify-center text-primary-foreground text-[10px] font-bold flex-shrink-0">
          {switching ? <Loader2 className="w-3 h-3 animate-spin" /> : (organization?.name?.slice(0, 2).toUpperCase() ?? 'AB')}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-xs font-medium text-foreground truncate">{organization?.name ?? 'My Business'}</div>
          <div className="text-[10px] text-muted-foreground">{switching ? 'Switching…' : 'Owner'}</div>
        </div>
        {hasMultiple && (
          <ChevronDown className={cn('w-3 h-3 text-muted-foreground flex-shrink-0 transition-transform duration-150', open && 'rotate-180')} />
        )}
      </button>

      {open && hasMultiple && (
        <div role="listbox" className="absolute left-2 right-2 top-full mt-1 z-50 bg-card border border-border rounded-lg shadow-lg overflow-hidden">
          <div className="px-3 py-2 border-b border-border">
            <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Switch business</span>
          </div>
          <div className="py-1 max-h-[220px] overflow-y-auto">
            {userMemberships?.isLoading ? (
              <div className="flex items-center justify-center py-4 gap-2 text-sm text-muted-foreground">
                <Loader2 className="w-4 h-4 animate-spin" />Loading…
              </div>
            ) : (
              orgs.map((membership) => {
                const org      = membership.organization;
                const isActive = org.id === organization?.id;
                return (
                  <button key={org.id} role="option" aria-selected={isActive} onClick={() => handleSelect(org.id)}
                    className={cn('w-full flex items-center gap-2.5 px-3 py-2.5 min-h-[44px] text-left transition-colors',
                      isActive ? 'bg-primary-light dark:bg-primary/20' : 'hover:bg-accent')}>
                    <div className={cn('w-7 h-7 rounded-md flex items-center justify-center text-[10px] font-bold flex-shrink-0',
                      isActive ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground')}>
                      {org.name?.slice(0, 2).toUpperCase() ?? <Building2 className="w-3 h-3" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className={cn('text-xs font-medium truncate', isActive ? 'text-primary' : 'text-foreground')}>{org.name}</div>
                      {org.slug && <div className="text-[10px] text-muted-foreground truncate">{org.slug}</div>}
                    </div>
                    {isActive && <Check className="w-3.5 h-3.5 text-primary flex-shrink-0" />}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
