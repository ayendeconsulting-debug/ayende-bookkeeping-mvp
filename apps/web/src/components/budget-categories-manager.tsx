'use client';

import { useState, useTransition, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { BudgetCategoryWithSpending } from '@/types';
import { formatCurrency, cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import {
  createBudgetCategory,
  updateBudgetCategory,
  deleteBudgetCategory,
  reorderBudgetCategories,
} from '@/app/(app)/personal/budget/actions';
import { toastSuccess, toastError } from '@/lib/toast';
import { Plus, Pencil, Trash2, Check, X, GripVertical } from 'lucide-react';

const PRESET_COLORS = [
  '#0F6E56', '#22c55e', '#3b82f6', '#6366f1', '#a855f7',
  '#ec4899', '#f97316', '#f59e0b', '#ef4444', '#14b8a6',
  '#84cc16', '#9ca3af',
];

function ColorPicker({ value, onChange }: { value: string; onChange: (c: string) => void }) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-1.5">
        {PRESET_COLORS.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => onChange(c)}
            className={cn(
              'w-6 h-6 rounded-full border-2 transition-all',
              value === c ? 'border-foreground scale-110' : 'border-transparent hover:scale-105',
            )}
            style={{ backgroundColor: c }}
          />
        ))}
      </div>
      <div className="flex items-center gap-2">
        <div className="w-6 h-6 rounded-full border border-border flex-shrink-0" style={{ backgroundColor: value }} />
        <input
          type="text"
          value={value}
          onChange={(e) => {
            const v = e.target.value;
            if (/^#[0-9a-fA-F]{0,6}$/.test(v)) onChange(v);
          }}
          maxLength={7}
          placeholder="#000000"
          className="w-24 text-xs border border-border rounded px-2 py-1 bg-background text-foreground font-mono outline-none focus:border-primary"
        />
      </div>
    </div>
  );
}

interface BudgetCategoriesManagerProps {
  initialCategories: BudgetCategoryWithSpending[];
}

export function BudgetCategoriesManager({ initialCategories }: BudgetCategoriesManagerProps) {
  const router = useRouter();
  const [categories, setCategories] = useState(initialCategories);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [addForm, setAddForm] = useState({ name: '', monthly_target: '', color: '#0F6E56' });
  const [editForm, setEditForm] = useState({ name: '', monthly_target: '', color: '#0F6E56' });
  const [isPending, startTransition] = useTransition();

  const dragIndex = useRef<number | null>(null);
  const dragOverIndex = useRef<number | null>(null);

  const totalBudgeted = categories.reduce((s, c) => s + (c.monthly_target ?? 0), 0);
  const totalSpent    = categories.reduce((s, c) => s + c.spent_this_month, 0);
  const overBudget    = categories.filter((c) => c.over_budget);
  const budgetPct     = totalBudgeted > 0 ? Math.min(100, (totalSpent / totalBudgeted) * 100) : 0;

  function handleDragStart(index: number) { dragIndex.current = index; }

  function handleDragOver(e: React.DragEvent, index: number) {
    e.preventDefault();
    dragOverIndex.current = index;
  }

  function handleDrop() {
    if (dragIndex.current === null || dragOverIndex.current === null) return;
    if (dragIndex.current === dragOverIndex.current) return;

    const reordered = [...categories];
    const [moved] = reordered.splice(dragIndex.current, 1);
    reordered.splice(dragOverIndex.current, 0, moved);

    const updated = reordered.map((cat, i) => ({ ...cat, sort_order: i + 1 }));
    setCategories(updated);

    startTransition(async () => {
      const result = await reorderBudgetCategories(
        updated.map((c) => ({ id: c.id, sort_order: c.sort_order })),
      );
      if (!result.success) {
        toastError('Failed to save order.');
        setCategories(categories);
      }
    });

    dragIndex.current = null;
    dragOverIndex.current = null;
  }

  function handleAdd() {
    if (!addForm.name.trim()) { toastError('Category name is required.'); return; }
    const target = addForm.monthly_target ? parseFloat(addForm.monthly_target) : undefined;
    if (target !== undefined && isNaN(target)) { toastError('Invalid budget amount.'); return; }

    startTransition(async () => {
      const result = await createBudgetCategory({
        name: addForm.name.trim(),
        monthly_target: target,
        color: addForm.color,
      });
      if (result.success && result.data) {
        setCategories((prev) => [...prev, {
          ...result.data!,
          spent_this_month: 0,
          remaining: target ?? null,
          over_budget: false,
          percentage_spent: null,
        }]);
        setAddForm({ name: '', monthly_target: '', color: '#0F6E56' });
        setShowAddForm(false);
        toastSuccess(`"${addForm.name}" added.`);
        router.refresh();
      } else {
        toastError(result.error ?? 'Failed to add category.');
      }
    });
  }

  function startEdit(cat: BudgetCategoryWithSpending) {
    setEditingId(cat.id);
    setEditForm({
      name: cat.name,
      monthly_target: cat.monthly_target?.toString() ?? '',
      color: cat.color ?? '#0F6E56',
    });
  }

  function handleEdit(id: string) {
    const target = editForm.monthly_target ? parseFloat(editForm.monthly_target) : undefined;
    if (target !== undefined && isNaN(target)) { toastError('Invalid budget amount.'); return; }

    startTransition(async () => {
      const result = await updateBudgetCategory(id, {
        name: editForm.name.trim() || undefined,
        monthly_target: target ?? null,
        color: editForm.color,
      });
      if (result.success) {
        setCategories((prev) => prev.map((c) =>
          c.id === id ? {
            ...c,
            name: editForm.name || c.name,
            monthly_target: target ?? null,
            color: editForm.color,
            remaining: target ? Math.max(0, target - c.spent_this_month) : null,
            over_budget: target ? c.spent_this_month > target : false,
            percentage_spent: target && target > 0
              ? parseFloat(Math.min(100, (c.spent_this_month / target) * 100).toFixed(1)) : null,
          } : c,
        ));
        setEditingId(null);
        toastSuccess('Category updated.');
        router.refresh();
      } else {
        toastError(result.error ?? 'Failed to update.');
      }
    });
  }

  function handleDelete(id: string, name: string) {
    startTransition(async () => {
      const result = await deleteBudgetCategory(id);
      if (result.success) {
        setCategories((prev) => prev.filter((c) => c.id !== id));
        toastSuccess(`"${name}" removed.`);
        router.refresh();
      } else {
        toastError(result.error ?? 'Failed to delete.');
      }
    });
  }

  return (
    <div className="flex flex-col gap-4">

      {/* Summary hero */}
      <div className="rounded-2xl bg-card border border-border p-5">
        <div className="flex items-end justify-between mb-3">
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">This month</p>
            <p className="text-4xl font-bold text-foreground tabular-nums">{formatCurrency(totalSpent)}</p>
            <p className="text-sm text-muted-foreground mt-1">
              {totalBudgeted > 0
                ? `${formatCurrency(Math.max(0, totalBudgeted - totalSpent))} left of ${formatCurrency(totalBudgeted)}`
                : 'No budget set'}
            </p>
          </div>
          {overBudget.length > 0 && (
            <span className="text-xs font-semibold text-red-500 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800 px-2.5 py-1 rounded-full">
              {overBudget.length} over budget
            </span>
          )}
        </div>
        {totalBudgeted > 0 && (
          <div className="h-3 bg-muted rounded-full overflow-hidden">
            <div
              className={cn('h-full rounded-full transition-all',
                budgetPct >= 100 ? 'bg-red-400' : budgetPct >= 80 ? 'bg-amber-400' : 'bg-primary')}
              style={{ width: `${budgetPct}%` }}
            />
          </div>
        )}
      </div>

      {/* Add form */}
      {showAddForm && (
        <div className="rounded-2xl bg-card border border-border p-5">
          <h3 className="text-sm font-semibold text-foreground mb-4">New category</h3>
          <div className="flex flex-col gap-4">
            <div className="flex gap-3 items-end flex-wrap">
              <div className="flex-1 min-w-[160px]">
                <Label>Category name</Label>
                <Input
                  placeholder="e.g. Gym & Fitness"
                  value={addForm.name}
                  onChange={(e) => setAddForm((p) => ({ ...p, name: e.target.value }))}
                  className="mt-1"
                  onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
                />
              </div>
              <div className="w-40">
                <Label>Monthly budget ($)</Label>
                <Input
                  type="number" min="0" step="10" placeholder="Optional"
                  value={addForm.monthly_target}
                  onChange={(e) => setAddForm((p) => ({ ...p, monthly_target: e.target.value }))}
                  className="mt-1"
                />
              </div>
            </div>
            <div>
              <Label className="mb-2 block">Colour</Label>
              <ColorPicker value={addForm.color} onChange={(c) => setAddForm((p) => ({ ...p, color: c }))} />
            </div>
            <div className="flex gap-2">
              <Button onClick={handleAdd} disabled={isPending}>
                {isPending ? 'Adding…' : 'Add'}
              </Button>
              <Button variant="outline" onClick={() => { setShowAddForm(false); setAddForm({ name: '', monthly_target: '', color: '#0F6E56' }); }}>
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Category list */}
      <div className="rounded-2xl bg-card border border-border overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <div>
            <h3 className="text-base font-semibold text-foreground">All categories</h3>
            <p className="text-xs text-muted-foreground mt-0.5">Drag to reorder</p>
          </div>
          {!showAddForm && (
            <Button onClick={() => setShowAddForm(true)} size="sm">
              <Plus className="w-4 h-4 mr-1.5" />Add Category
            </Button>
          )}
        </div>

        <div className="divide-y divide-border">
          {categories.map((cat, index) => (
            <div
              key={cat.id}
              draggable
              onDragStart={() => handleDragStart(index)}
              onDragOver={(e) => handleDragOver(e, index)}
              onDrop={handleDrop}
              className="px-5 py-4 cursor-default"
            >
              {editingId === cat.id ? (
                <div className="flex flex-col gap-3">
                  <div className="flex gap-2 items-center flex-wrap">
                    <Input
                      value={editForm.name}
                      onChange={(e) => setEditForm((p) => ({ ...p, name: e.target.value }))}
                      className="flex-1 h-8 text-sm min-w-[120px]"
                    />
                    <Input
                      type="number" min="0" placeholder="Budget $"
                      value={editForm.monthly_target}
                      onChange={(e) => setEditForm((p) => ({ ...p, monthly_target: e.target.value }))}
                      className="w-32 h-8 text-sm"
                    />
                    <button onClick={() => handleEdit(cat.id)} disabled={isPending}
                      className="p-1 text-primary hover:text-primary/80">
                      <Check className="w-4 h-4" />
                    </button>
                    <button onClick={() => setEditingId(null)}
                      className="p-1 text-muted-foreground hover:text-foreground">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  <ColorPicker value={editForm.color} onChange={(c) => setEditForm((p) => ({ ...p, color: c }))} />
                </div>
              ) : (
                <div className="group">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <GripVertical className="w-4 h-4 text-muted-foreground/30 cursor-grab flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
                      <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: cat.color ?? '#0F6E56' }} />
                      <span className="text-sm font-medium text-foreground truncate">{cat.name}</span>
                      {cat.over_budget && (
                        <span className="text-[10px] font-bold text-red-500 uppercase flex-shrink-0">Over budget</span>
                      )}
                      {cat.monthly_target && (cat.percentage_spent ?? 0) >= 80 && !cat.over_budget && (
                        <span className="text-[10px] font-bold text-amber-500 uppercase flex-shrink-0">Almost there</span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0">
                      <span className="text-sm font-medium text-foreground tabular-nums text-right w-[90px]">
                        {formatCurrency(cat.spent_this_month)}
                        {cat.monthly_target != null && (
                          <span className="text-muted-foreground text-xs"> / {formatCurrency(cat.monthly_target)}</span>
                        )}
                      </span>
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity w-[52px] justify-end">
                        <button onClick={() => startEdit(cat)} className="p-1 text-muted-foreground hover:text-primary">
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        {!cat.is_system && (
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <button className="p-1 text-muted-foreground hover:text-destructive">
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Remove "{cat.name}"?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  This will deactivate the category. Historical spending data is retained.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleDelete(cat.id, cat.name)}
                                  className="bg-destructive hover:bg-destructive/90 text-destructive-foreground">
                                  Remove
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        )}
                      </div>
                    </div>
                  </div>
                  {cat.monthly_target != null ? (
                    <div className="h-3 bg-muted rounded-full overflow-hidden">
                      <div
                        className={cn('h-full rounded-full transition-all',
                          cat.over_budget ? 'bg-red-400'
                          : (cat.percentage_spent ?? 0) >= 80 ? 'bg-amber-400'
                          : '')}
                        style={{
                          width: `${Math.min(100, cat.percentage_spent ?? 0)}%`,
                          backgroundColor: !cat.over_budget && (cat.percentage_spent ?? 0) < 80
                            ? (cat.color ?? '#0F6E56') : undefined,
                        }}
                      />
                    </div>
                  ) : (
                    <div className="h-1 bg-muted rounded-full" />
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
