'use client';

import { useState, useTransition } from 'react';
import { cn } from '@/lib/utils';
import { tagTransaction } from '@/app/(app)/transactions/actions';

interface TransactionTagToggleProps {
  transactionId: string;
  isPersonal: boolean;
  onToggle?: () => void;
}

export function TransactionTagToggle({
  transactionId,
  isPersonal,
  onToggle,
}: TransactionTagToggleProps) {
  const [personal, setPersonal] = useState(isPersonal);
  const [isPending, startTransition] = useTransition();

  function handleToggle(newValue: boolean) {
    if (newValue === personal || isPending) return;
    setPersonal(newValue); // optimistic update
    startTransition(async () => {
      const result = await tagTransaction(transactionId, newValue);
      if (!result.success) {
        setPersonal(!newValue); // revert on failure
      } else {
        onToggle?.();
      }
    });
  }

  return (
    <div
      className={cn(
        'inline-flex rounded-full border text-[11px] font-medium transition-all',
        isPending ? 'opacity-50 pointer-events-none' : '',
        personal ? 'border-purple-200 bg-purple-50' : 'border-primary/20 bg-primary-light',
      )}
    >
      <button
        onClick={() => handleToggle(false)}
        className={cn(
          'px-2.5 py-0.5 rounded-full transition-colors',
          !personal
            ? 'bg-primary text-white shadow-sm'
            : 'text-gray-500 hover:text-gray-700',
        )}
      >
        Business
      </button>
      <button
        onClick={() => handleToggle(true)}
        className={cn(
          'px-2.5 py-0.5 rounded-full transition-colors',
          personal
            ? 'bg-purple-500 text-white shadow-sm'
            : 'text-gray-500 hover:text-gray-700',
        )}
      >
        Personal
      </button>
    </div>
  );
}
