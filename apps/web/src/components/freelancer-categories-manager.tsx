'use client';

import { useState, useTransition } from 'react';
import { Account } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { createExpenseCategory, toggleCategoryActive } from '@/app/(app)/freelancer/categories/actions';
import { toastSuccess, toastError } from '@/lib/toast';
import { Plus, Tag } from 'lucide-react';

interface FreelancerCategoriesManagerProps {
  accounts: Account[];
}

const EMPTY_FORM = { name: '' };

export function FreelancerCategoriesManager({ accounts: initialAccounts }: FreelancerCategoriesManagerProps) {
  const [categories, setCategories] = useState<Account[]>(initialAccounts);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [isPending, startTransition] = useTransition();

  function handleAdd() {
    if (!form.name.trim()) {
      toastError('Please enter a category name.');
      return;
    }

    startTransition(async () => {
      const result = await createExpenseCategory({
        account_name: form.name.trim(),
        account_code: `6${String(categories.length + 1).padStart(3, '0')}`,
      });

      if (result.success && result.data) {
        setCategories((prev) => [...prev, result.data as Account]);
        setForm(EMPTY_FORM);
        setShowForm(false);
        toastSuccess(`Category "${form.name}" added.`);
      } else {
        toastError(result.error ?? 'Failed to add category.');
      }
    });
  }

  function handleToggle(account: Account) {
    startTransition(async () => {
      const result = await toggleCategoryActive(account.id, !account.is_active);
      if (result.success) {
        setCategories((prev) =>
          prev.map((a) => (a.id === account.id ? { ...a, is_active: !a.is_active } : a)),
        );
        toastSuccess(
          account.is_active
            ? `"${account.account_name}" deactivated.`
            : `"${account.account_name}" activated.`,
        );
      } else {
        toastError(result.error ?? 'Failed to update category.');
      }
    });
  }

  const active = categories.filter((a) => a.is_active);
  const inactive = categories.filter((a) => !a.is_active);

  return (
    <div className="flex flex-col gap-4">
      {/* Header action */}
      <div className="flex justify-between items-center">
        <p className="text-sm text-gray-500">
          {active.length} active {active.length === 1 ? 'category' : 'categories'} · used to tag
          business expenses
        </p>
        {!showForm && (
          <Button
            onClick={() => setShowForm(true)}
            className="bg-primary text-white hover:bg-primary/90"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Category
          </Button>
        )}
      </div>

      {/* Add form */}
      {showForm && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle>New Expense Category</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-3 items-end">
              <div className="flex-1">
                <Label>Category Name</Label>
                <Input
                  placeholder="e.g. Client Gifts"
                  value={form.name}
                  onChange={(e) => setForm({ name: e.target.value })}
                  className="mt-1"
                  onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
                />
              </div>
              <Button
                onClick={handleAdd}
                disabled={isPending}
                className="bg-primary text-white hover:bg-primary/90"
              >
                {isPending ? 'Adding…' : 'Add'}
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setShowForm(false);
                  setForm(EMPTY_FORM);
                }}
              >
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Active categories */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2">
            <Tag className="w-4 h-4 text-gray-400" />
            Active Categories
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          {active.length === 0 ? (
            <div className="py-8 text-center text-sm text-gray-400">
              No active categories yet. Add one above.
            </div>
          ) : (
            <div className="flex flex-col gap-1">
              {active.map((cat) => (
                <div
                  key={cat.id}
                  className="flex items-center justify-between px-3 py-2.5 rounded-lg hover:bg-gray-50 group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-7 h-7 rounded-md bg-primary-light flex items-center justify-center flex-shrink-0">
                      <Tag className="w-3.5 h-3.5 text-primary" />
                    </div>
                    <span className="text-sm font-medium text-gray-900">{cat.account_name}</span>
                  </div>
                  <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => handleToggle(cat)}
                      disabled={isPending}
                      className="text-xs text-gray-400 hover:text-red-500 px-2 py-1 rounded transition-colors"
                    >
                      Deactivate
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Inactive categories */}
      {inactive.length > 0 && (
        <Card className="opacity-70">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm text-gray-500">
              Inactive Categories ({inactive.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="flex flex-col gap-1">
              {inactive.map((cat) => (
                <div
                  key={cat.id}
                  className="flex items-center justify-between px-3 py-2 rounded-lg hover:bg-gray-50 group"
                >
                  <span className="text-sm text-gray-400 line-through">{cat.account_name}</span>
                  <button
                    onClick={() => handleToggle(cat)}
                    disabled={isPending}
                    className="text-xs text-primary opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    Reactivate
                  </button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
