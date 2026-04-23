'use client';

import { useState, useTransition } from 'react';
import { Lock, Unlock, AlertTriangle, X, ShieldCheck } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { lockFiscalYear, FiscalYearSummary } from '@/app/(app)/settings/fiscal-year-lock/actions';
import { toastSuccess, toastError } from '@/lib/toast';

interface FiscalYearLockClientProps {
  initialFiscalYears: FiscalYearSummary[];
}

export function FiscalYearLockClient({ initialFiscalYears }: FiscalYearLockClientProps) {
  const [fiscalYears, setFiscalYears] = useState<FiscalYearSummary[]>(initialFiscalYears);
  const [confirmYear, setConfirmYear] = useState<number | null>(null);
  const [confirmInput, setConfirmInput] = useState('');
  const [isPending, startTransition] = useTransition();

  const yearToConfirm = confirmYear?.toString() ?? '';
  const canConfirm = confirmInput.trim() === yearToConfirm && !isPending;

  function openConfirm(year: number) { setConfirmYear(year); setConfirmInput(''); }
  function closeConfirm() { setConfirmYear(null); setConfirmInput(''); }

  function handleLock() {
    if (!confirmYear) return;
    startTransition(async () => {
      const result = await lockFiscalYear(confirmYear);
      if (result.success && result.data) {
        setFiscalYears((prev) =>
          prev.map((fy) =>
            fy.year === confirmYear
              ? { ...fy, is_locked: true, locked_at: result.data!.locked_at }
              : fy,
          ),
        );
        toastSuccess(`FY${confirmYear} has been locked successfully.`);
        closeConfirm();
      } else {
        toastError(result.error ?? 'Failed to lock fiscal year. Please try again.');
      }
    });
  }

  if (fiscalYears.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center bg-card border border-border rounded-xl">
        <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-3">
          <Lock className="w-5 h-5 text-muted-foreground" />
        </div>
        <p className="text-sm font-medium text-foreground mb-1">No fiscal years found</p>
        <p className="text-sm text-muted-foreground">
          Post journal entries to see fiscal years available for locking.
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="grid grid-cols-[100px_1fr_180px_160px] text-xs font-medium text-muted-foreground uppercase tracking-wide bg-muted px-5 py-3 border-b border-border">
          <span>Year</span>
          <span>Journal Entries</span>
          <span>Status</span>
          <span className="text-right">Action</span>
        </div>

        {fiscalYears.map((fy, idx) => (
          <div
            key={fy.year}
            className={cn(
              'grid grid-cols-[100px_1fr_180px_160px] items-center px-5 py-4',
              idx < fiscalYears.length - 1 && 'border-b border-border',
              fy.is_locked && 'bg-muted/30',
            )}
          >
            <span className="font-semibold text-foreground">FY{fy.year}</span>

            <span className="text-sm text-muted-foreground">
              {fy.entry_count.toLocaleString()} posted entr{fy.entry_count === 1 ? 'y' : 'ies'}
            </span>

            <div className="flex items-center gap-2">
              {fy.is_locked ? (
                <>
                  <Lock className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />
                  <div>
                    <span className="text-xs font-medium text-amber-600 dark:text-amber-400">Locked</span>
                    {fy.locked_at && (
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {new Date(fy.locked_at).toLocaleDateString('en-CA', {
                          month: 'short', day: 'numeric', year: 'numeric',
                        })}
                      </p>
                    )}
                  </div>
                </>
              ) : (
                <>
                  <Unlock className="w-3.5 h-3.5 text-green-500 flex-shrink-0" />
                  <span className="text-xs font-medium text-green-600 dark:text-green-400">Open</span>
                </>
              )}
            </div>

            <div className="flex justify-end">
              {fy.is_locked ? (
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Locked</span>
                </div>
              ) : (
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs border-amber-300 text-amber-700 hover:bg-amber-50 dark:border-amber-700 dark:text-amber-400 dark:hover:bg-amber-900/20"
                  onClick={() => openConfirm(fy.year)}
                >
                  <Lock className="w-3 h-3 mr-1.5" />Lock Year
                </Button>
              )}
            </div>
          </div>
        ))}
      </div>

      <p className="text-xs text-muted-foreground mt-4">
        Locked fiscal years cannot be edited. To unlock a year, contact Tempo Books support.
      </p>

      {/* Confirmation modal */}
      {confirmYear !== null && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4 bg-black/70">
          <div className="bg-card sm:rounded-xl rounded-t-xl shadow-2xl w-full sm:max-w-md border border-border">
            <div className="flex items-start justify-between px-6 py-4 border-b border-border">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center flex-shrink-0">
                  <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                </div>
                <div>
                  <h2 className="text-base font-semibold text-foreground">Lock FY{confirmYear}?</h2>
                  <p className="text-xs text-muted-foreground mt-0.5">This action requires confirmation</p>
                </div>
              </div>
              <button onClick={closeConfirm} className="text-muted-foreground hover:text-foreground transition-colors ml-4">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="px-6 py-5 space-y-4">
              <div className="bg-amber-50 dark:bg-[#494C4F] border border-amber-200 dark:border-[#FBFB47]/40 rounded-lg px-4 py-3 text-sm text-amber-800 dark:text-[#FBFB47]">
                You are about to lock <strong>FY{confirmYear}</strong>. All journal entries for this
                fiscal year will become <strong>read-only</strong>. This cannot be undone without
                contacting Tempo Books support.
              </div>

              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1.5">
                  Type <strong className="text-foreground">{confirmYear}</strong> to confirm
                </label>
                <Input
                  value={confirmInput}
                  onChange={(e) => setConfirmInput(e.target.value)}
                  placeholder={`Enter ${confirmYear}`}
                  className="text-sm"
                  autoFocus
                  onKeyDown={(e) => { if (e.key === 'Enter' && canConfirm) handleLock(); }}
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-border bg-muted sm:rounded-b-xl">
              <Button variant="outline" onClick={closeConfirm} disabled={isPending}>Cancel</Button>
              <Button
                onClick={handleLock}
                disabled={!canConfirm}
                className="bg-amber-600 text-white hover:bg-amber-700 dark:bg-amber-700 dark:hover:bg-amber-600 min-w-[120px]"
              >
                {isPending ? 'Locking…' : `Lock FY${confirmYear}`}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
