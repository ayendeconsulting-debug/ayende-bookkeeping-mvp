'use client';

import { useState, useTransition, useEffect } from 'react';
import { Check, X, Tag, TrendingUp, TrendingDown } from 'lucide-react';
import { RawTransaction, BudgetCategoryWithSpending } from '@/types';
import { formatCurrency, cn } from '@/lib/utils';
import { toastSuccess, toastError } from '@/lib/toast';
import { assignPersonalCategory } from '@/app/(app)/personal/transactions/actions';
import { Button } from '@/components/ui/button';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog';

interface PersonalCategoryPanelProps {
  transaction: RawTransaction | null;
  categories: BudgetCategoryWithSpending[];
  open: boolean;
  onClose: () => void;
  onSuccess: (data?: { categoryId?: string }) => void;
}

export function PersonalCategoryPanel({
  transaction, categories, open, onClose, onSuccess,
}: PersonalCategoryPanelProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (open && transaction) {
      setSelectedId(transaction.personal_category_id ?? null);
    }
  }, [open, transaction]);

  if (!transaction) return null;

  const amount = Number(transaction.amount);
  const incomeCategories  = categories.filter((c) => c.category_type === 'income');
  const expenseCategories = categories.filter((c) => c.category_type !== 'income');

  function handleSave(categoryId: string | null) {
    startTransition(async () => {
      const result = await assignPersonalCategory(transaction!.id, categoryId);
      if (result.success) {
        const cat = categories.find((c) => c.id === categoryId);
        toastSuccess(categoryId ? `Categorized as "${cat?.name}"` : 'Category cleared');
        onSuccess({ categoryId: categoryId ?? undefined });
      } else {
        toastError(result.error ?? 'Failed to assign category');
      }
    });
  }

  function CategoryButton({ cat }: { cat: BudgetCategoryWithSpending }) {
    const isSelected = selectedId === cat.id;
    return (
      <button
        onClick={() => setSelectedId(isSelected ? null : cat.id)}
        disabled={isPending}
        className={cn(
          'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all',
          isSelected ? 'bg-primary/10 dark:bg-primary/20 ring-1 ring-primary/30' : 'hover:bg-muted',
        )}
      >
        <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: cat.color ?? '#0F6E56' }} />
        <div className="flex-1 min-w-0">
          <p className={cn('text-sm font-medium truncate', isSelected ? 'text-primary' : 'text-foreground')}>
            {cat.name}
          </p>
          {cat.spent_this_month > 0 && (
            <p className="text-xs text-muted-foreground">
              {formatCurrency(cat.spent_this_month)} this month
              {cat.monthly_target ? ` / ${formatCurrency(cat.monthly_target)} budget` : ''}
            </p>
          )}
        </div>
        {isSelected && <Check className="w-4 h-4 text-primary flex-shrink-0" />}
      </button>
    );
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md max-h-[85vh] flex flex-col p-0 gap-0">
        <DialogHeader className="px-5 pt-5 pb-4 border-b border-border">
          <DialogTitle className="text-base font-semibold">Categorize Transaction</DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground mt-0.5">
            Assign a budget category to track this spending.
          </DialogDescription>
        </DialogHeader>

        {/* Transaction summary */}
        <div className="px-5 py-3 bg-muted/50 border-b border-border">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm font-medium text-foreground truncate">{transaction.description}</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {new Date(transaction.transaction_date).toLocaleDateString('en-CA', {
                  month: 'long', day: 'numeric', year: 'numeric',
                })}
                {transaction.source_account_name && ` · ${transaction.source_account_name}`}
              </p>
            </div>
            <span className={cn('text-sm font-semibold flex-shrink-0', amount >= 0 ? 'text-primary' : 'text-destructive')}>
              {amount >= 0 ? '+' : ''}{formatCurrency(amount)}
            </span>
          </div>
          {transaction.plaid_category && !transaction.personal_category_id && (
            <p className="text-xs text-muted-foreground mt-1.5">
              Plaid suggests: <span className="font-medium">{transaction.plaid_category}</span>
            </p>
          )}
        </div>

        {/* Category list */}
        <div className="flex-1 overflow-y-auto px-3 py-3">
          <div className="flex flex-col gap-1">

            {incomeCategories.length > 0 && (
              <>
                <div className="flex items-center gap-2 px-2 pt-1 pb-1">
                  <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />
                  <span className="text-xs font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">Income</span>
                </div>
                {incomeCategories.map((cat) => <CategoryButton key={cat.id} cat={cat} />)}
                {expenseCategories.length > 0 && <div className="border-t border-border my-2" />}
              </>
            )}

            {expenseCategories.length > 0 && (
              <>
                {incomeCategories.length > 0 && (
                  <div className="flex items-center gap-2 px-2 pt-1 pb-1">
                    <TrendingDown className="w-3.5 h-3.5 text-muted-foreground" />
                    <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Expenses</span>
                  </div>
                )}
                {expenseCategories.map((cat) => <CategoryButton key={cat.id} cat={cat} />)}
              </>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-border flex items-center gap-2">
          {transaction.personal_category_id && (
            <Button variant="outline" size="sm" onClick={() => handleSave(null)} disabled={isPending}
              className="text-muted-foreground hover:text-destructive hover:border-destructive/50">
              <X className="w-3.5 h-3.5 mr-1.5" />Clear
            </Button>
          )}
          <div className="flex-1" />
          <Button variant="outline" onClick={onClose} disabled={isPending}>Cancel</Button>
          <Button
            onClick={() => handleSave(selectedId)}
            disabled={isPending || selectedId === (transaction.personal_category_id ?? null)}
          >
            <Tag className="w-3.5 h-3.5 mr-1.5" />
            {isPending ? 'Saving…' : 'Save'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
