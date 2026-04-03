'use client';

import { useState, useTransition } from 'react';
import { BudgetCategoryWithSpending } from '@/types';
import { formatCurrency, cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import {
  createBudgetCategory,
  updateBudgetCategory,
  deleteBudgetCategory,
} from '@/app/(app)/personal/budget/actions';
import { toastSuccess, toastError } from '@/lib/toast';
import { Plus, Pencil, Trash2, Check, X } from 'lucide-react';

interface BudgetCategoriesManagerProps {
  initialCategories: BudgetCategoryWithSpending[];
}

export function BudgetCategoriesManager({ initialCategories }: BudgetCategoriesManagerProps) {
  const [categories, setCategories] = useState(initialCategories);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [addForm, setAddForm] = useState({ name: '', monthly_target: '' });
  const [editForm, setEditForm] = useState({ name: '', monthly_target: '' });
  const [isPending, startTransition] = useTransition();

  const totalBudgeted = categories.reduce((s, c) => s + (c.monthly_target ?? 0), 0);
  const totalSpent = categories.reduce((s, c) => s + c.spent_this_month, 0);
  const overBudget = categories.filter((c) => c.over_budget);

  function handleAdd() {
    if (!addForm.name.trim()) { toastError('Category name is required.'); return; }
    const target = addForm.monthly_target ? parseFloat(addForm.monthly_target) : undefined;
    if (target !== undefined && isNaN(target)) { toastError('Invalid budget amount.'); return; }

    startTransition(async () => {
      const result = await createBudgetCategory({
        name: addForm.name.trim(),
        monthly_target: target,
      });
      if (result.success && result.data) {
        setCategories((prev) => [
          ...prev,
          { ...result.data!, spent_this_month: 0, remaining: target ?? null, over_budget: false, percentage_spent: null },
        ]);
        setAddForm({ name: '', monthly_target: '' });
        setShowAddForm(false);
        toastSuccess(`"${addForm.name}" added.`);
      } else {
        toastError(result.error ?? 'Failed to add category.');
      }
    });
  }

  function startEdit(cat: BudgetCategoryWithSpending) {
    setEditingId(cat.id);
    setEditForm({ name: cat.name, monthly_target: cat.monthly_target?.toString() ?? '' });
  }

  function handleEdit(id: string) {
    const target = editForm.monthly_target ? parseFloat(editForm.monthly_target) : undefined;
    if (target !== undefined && isNaN(target)) { toastError('Invalid budget amount.'); return; }

    startTransition(async () => {
      const result = await updateBudgetCategory(id, {
        name: editForm.name.trim() || undefined,
        monthly_target: target ?? null,
      });
      if (result.success) {
        setCategories((prev) =>
          prev.map((c) =>
            c.id === id
              ? {
                  ...c,
                  name: editForm.name || c.name,
                  monthly_target: target ?? null,
                  remaining: target ? Math.max(0, target - c.spent_this_month) : null,
                  over_budget: target ? c.spent_this_month > target : false,
                  percentage_spent: target && target > 0
                    ? parseFloat(Math.min(100, (c.spent_this_month / target) * 100).toFixed(1))
                    : null,
                }
              : c,
          ),
        );
        setEditingId(null);
        toastSuccess('Category updated.');
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
      } else {
        toastError(result.error ?? 'Failed to delete.');
      }
    });
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Summary bar */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-5">
            <div className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">Total Budgeted</div>
            <div className="text-2xl font-semibold text-gray-900">{formatCurrency(totalBudgeted)}</div>
            <div className="text-xs text-gray-400 mt-1">per month</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <div className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">Spent This Month</div>
            <div className="text-2xl font-semibold text-gray-900">{formatCurrency(totalSpent)}</div>
            <div className="text-xs text-gray-400 mt-1">
              {formatCurrency(Math.max(0, totalBudgeted - totalSpent))} remaining
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <div className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">Over Budget</div>
            <div className={cn('text-2xl font-semibold', overBudget.length > 0 ? 'text-red-500' : 'text-primary')}>
              {overBudget.length}
            </div>
            <div className="text-xs text-gray-400 mt-1">
              {overBudget.length === 0 ? 'All within limits' : overBudget.map((c) => c.name).join(', ')}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Add form */}
      {showAddForm && (
        <Card>
          <CardHeader className="pb-3"><CardTitle>New Category</CardTitle></CardHeader>
          <CardContent>
            <div className="flex gap-3 items-end">
              <div className="flex-1">
                <Label>Category Name</Label>
                <Input
                  placeholder="e.g. Gym & Fitness"
                  value={addForm.name}
                  onChange={(e) => setAddForm((p) => ({ ...p, name: e.target.value }))}
                  className="mt-1"
                  onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
                />
              </div>
              <div className="w-40">
                <Label>Monthly Budget ($)</Label>
                <Input
                  type="number"
                  min="0"
                  step="10"
                  placeholder="Optional"
                  value={addForm.monthly_target}
                  onChange={(e) => setAddForm((p) => ({ ...p, monthly_target: e.target.value }))}
                  className="mt-1"
                />
              </div>
              <Button onClick={handleAdd} disabled={isPending} className="bg-primary text-white hover:bg-primary/90">
                {isPending ? 'Adding…' : 'Add'}
              </Button>
              <Button variant="outline" onClick={() => { setShowAddForm(false); setAddForm({ name: '', monthly_target: '' }); }}>
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Category list */}
      <Card>
        <CardHeader className="flex-row items-center justify-between pb-3">
          <CardTitle>All Categories</CardTitle>
          {!showAddForm && (
            <Button onClick={() => setShowAddForm(true)} size="sm" className="bg-primary text-white hover:bg-primary/90">
              <Plus className="w-4 h-4 mr-1.5" />Add Category
            </Button>
          )}
        </CardHeader>
        <CardContent className="pt-0">
          <div className="flex flex-col gap-4">
            {categories.map((cat) => (
              <div key={cat.id}>
                {editingId === cat.id ? (
                  <div className="flex gap-2 items-center">
                    <Input
                      value={editForm.name}
                      onChange={(e) => setEditForm((p) => ({ ...p, name: e.target.value }))}
                      className="flex-1 h-8 text-sm"
                    />
                    <Input
                      type="number"
                      min="0"
                      placeholder="Budget $"
                      value={editForm.monthly_target}
                      onChange={(e) => setEditForm((p) => ({ ...p, monthly_target: e.target.value }))}
                      className="w-32 h-8 text-sm"
                    />
                    <button onClick={() => handleEdit(cat.id)} disabled={isPending} className="p-1 text-primary hover:text-primary/80">
                      <Check className="w-4 h-4" />
                    </button>
                    <button onClick={() => setEditingId(null)} className="p-1 text-gray-400 hover:text-gray-600">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <div className="group">
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: cat.color }} />
                        <span className="text-sm font-medium text-gray-800">{cat.name}</span>
                        {cat.over_budget && (
                          <span className="text-[10px] font-bold text-red-500 uppercase">Over budget</span>
                        )}
                        {cat.monthly_target && cat.percentage_spent !== null && cat.percentage_spent >= 80 && !cat.over_budget && (
                          <span className="text-[10px] font-bold text-amber-500 uppercase">Almost there</span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-500">
                          {formatCurrency(cat.spent_this_month)}
                          {cat.monthly_target != null && (
                            <span className="text-gray-400"> / {formatCurrency(cat.monthly_target)}</span>
                          )}
                        </span>
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => startEdit(cat)} className="p-1 text-gray-400 hover:text-primary">
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          {!cat.is_system && (
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <button className="p-1 text-gray-400 hover:text-red-500">
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
                                  <AlertDialogAction onClick={() => handleDelete(cat.id, cat.name)} className="bg-red-600 hover:bg-red-700 text-white">
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
                      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className={cn('h-full rounded-full transition-all', cat.over_budget ? 'bg-red-400' : (cat.percentage_spent ?? 0) >= 80 ? 'bg-amber-400' : 'bg-primary')}
                          style={{ width: `${Math.min(100, cat.percentage_spent ?? 0)}%` }}
                        />
                      </div>
                    ) : (
                      <div className="h-1 bg-gray-50 rounded-full" />
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
