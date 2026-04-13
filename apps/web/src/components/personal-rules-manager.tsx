'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Pencil, Trash2, Filter, Wand2 } from 'lucide-react';
import { PersonalRule, BudgetCategoryWithSpending } from '@/types';
import { createPersonalRule, updatePersonalRule, deletePersonalRule, runPersonalRules } from '@/app/(app)/personal/rules/actions';
import { AdminOnly } from '@/components/admin-only';
import { toastSuccess, toastError } from '@/lib/toast';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

interface PersonalRulesManagerProps {
  initialRules: PersonalRule[];
  categories: BudgetCategoryWithSpending[];
}

interface RuleFormData {
  match_type: string;
  match_value: string;
  budget_category_id: string;
  priority: string;
}

const EMPTY_FORM: RuleFormData = {
  match_type: 'keyword',
  match_value: '',
  budget_category_id: '',
  priority: '10',
};

const MATCH_TYPE_LABELS: Record<string, string> = { keyword: 'Keyword', vendor: 'Vendor' };

const selectCls = "text-sm border border-gray-200 rounded-lg px-3 py-2 w-full outline-none bg-white text-gray-900 focus:border-[#0F6E56] disabled:bg-gray-50 dark:bg-[#222019] dark:border-[#3a3730] dark:text-[#f0ede8] dark:focus:border-[#0F6E56] dark:disabled:bg-[#1a1714]";

export function PersonalRulesManager({ initialRules, categories }: PersonalRulesManagerProps) {
  const router = useRouter();
  const [rules, setRules] = useState<PersonalRule[]>(
    [...initialRules].sort((a, b) => a.priority - b.priority),
  );
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<PersonalRule | null>(null);
  const [form, setForm] = useState<RuleFormData>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const categoryMap = Object.fromEntries(categories.map((c) => [c.id, c]));

  // Split for grouped display in dropdown
  const incomeCategories = categories.filter((c) => c.category_type === 'income');
  const expenseCategories = categories.filter((c) => c.category_type !== 'income');

  function openCreate() {
    setEditingRule(null);
    setForm({ ...EMPTY_FORM, priority: String((rules.length + 1) * 10) });
    setError(null);
    setDialogOpen(true);
  }

  function openEdit(rule: PersonalRule) {
    setEditingRule(rule);
    setForm({
      match_type: rule.match_type,
      match_value: rule.match_value,
      budget_category_id: rule.budget_category_id,
      priority: String(rule.priority),
    });
    setError(null);
    setDialogOpen(true);
  }

  async function handleSave() {
    if (!form.match_value || !form.budget_category_id) {
      setError('Match value and category are required.');
      return;
    }
    const priority = parseInt(form.priority, 10);
    if (isNaN(priority) || priority < 1) {
      setError('Priority must be a positive number.');
      return;
    }

    setSaving(true);
    setError(null);

    const result = editingRule
      ? await updatePersonalRule(editingRule.id, {
          match_value: form.match_value,
          budget_category_id: form.budget_category_id,
          priority,
        })
      : await createPersonalRule({
          match_type: form.match_type,
          match_value: form.match_value,
          budget_category_id: form.budget_category_id,
          priority,
        });

    setSaving(false);

    if (!result.success) {
      const msg = result.error ?? 'Operation failed.';
      setError(msg);
      toastError(editingRule ? 'Failed to update rule' : 'Failed to create rule', msg);
      return;
    }

    toastSuccess(editingRule ? 'Rule updated' : 'Rule created', `Match: ${form.match_value}`);
    setDialogOpen(false);
    router.refresh();
  }

  async function handleDelete(rule: PersonalRule) {
    const result = await deletePersonalRule(rule.id);
    if (result.success) {
      setRules((prev) => prev.filter((r) => r.id !== rule.id));
      toastSuccess('Rule deleted', rule.match_value);
    } else {
      toastError('Failed to delete rule', result.error ?? 'Please try again.');
    }
  }

  async function handleRunRules() {
    setRunning(true);
    const result = await runPersonalRules();
    setRunning(false);
    if (result.success && result.data) {
      const { matched, skipped } = result.data as { matched: number; skipped: number };
      toastSuccess('Rules applied', `${matched} categorized, ${skipped} no match.`);
      router.refresh();
    } else {
      toastError('Failed to run rules', result.error ?? 'Please try again.');
    }
  }

  return (
    <div className="p-6 max-w-screen-lg mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-gray-900 dark:text-[#f0ede8]">Personal Categorization Rules</h1>
          <p className="text-sm text-gray-500 dark:text-[#a09888] mt-0.5">
            Auto-assign budget categories to personal transactions by keyword or vendor match
          </p>
        </div>
        <div className="flex items-center gap-2">
          <AdminOnly>
            <Button variant="outline" onClick={handleRunRules} disabled={running}
              className="border-primary text-primary hover:bg-primary-light">
              <Wand2 className="w-4 h-4 mr-1.5" />
              {running ? 'Running…' : 'Run Rules'}
            </Button>
          </AdminOnly>
          <AdminOnly>
            <Button onClick={openCreate} className="flex items-center gap-2">
              <Plus className="w-4 h-4" />New Rule
            </Button>
          </AdminOnly>
        </div>
      </div>

      <div className="mb-4 bg-blue-50 border border-blue-100 rounded-lg px-4 py-3 text-sm text-blue-700 dark:bg-blue-900/20 dark:border-blue-800 dark:text-blue-400">
        Rules are applied in priority order (lowest number first). The first matching rule wins.
        Only pending personal-tagged transactions without a category are affected.
      </div>

      <Card>
        <CardContent className="p-0">
          {rules.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Filter className="w-8 h-8 text-gray-300 dark:text-[#3a3730] mb-3" />
              <p className="text-sm text-gray-400 dark:text-[#7a7060]">No rules yet. Add rules to auto-categorize personal transactions.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-16">Priority</TableHead>
                  <TableHead>Match Type</TableHead>
                  <TableHead>Match Value</TableHead>
                  <TableHead>Budget Category</TableHead>
                  <TableHead className="w-24" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {rules.map((rule) => {
                  const cat = categoryMap[rule.budget_category_id];
                  return (
                    <TableRow key={rule.id}>
                      <TableCell className="font-mono text-sm text-gray-500 dark:text-[#a09888]">{rule.priority}</TableCell>
                      <TableCell>
                        <Badge variant="pending">{MATCH_TYPE_LABELS[rule.match_type] ?? rule.match_type}</Badge>
                      </TableCell>
                      <TableCell className="font-medium">{rule.match_value}</TableCell>
                      <TableCell className="text-sm">
                        {cat ? (
                          <span className="flex items-center gap-2">
                            <span className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                              style={{ backgroundColor: cat.color ?? '#0F6E56' }} />
                            {cat.name}
                            <span className="text-xs text-gray-400">({cat.category_type})</span>
                          </span>
                        ) : (
                          <span className="text-gray-400 dark:text-[#7a7060]">Unknown category</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <AdminOnly>
                            <Button variant="ghost" size="sm" onClick={() => openEdit(rule)}
                              className="text-gray-400 hover:text-gray-600 dark:text-[#7a7060] dark:hover:text-[#c8c0b0]">
                              <Pencil className="w-3.5 h-3.5" />
                            </Button>
                          </AdminOnly>
                          <AdminOnly>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="ghost" size="sm"
                                  className="text-gray-400 hover:text-red-500 dark:text-[#7a7060] dark:hover:text-red-400">
                                  <Trash2 className="w-3.5 h-3.5" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Delete rule?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    This rule will be deleted and will no longer auto-categorize matching transactions.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => handleDelete(rule)}
                                    className="bg-red-500 hover:bg-red-600 text-white">
                                    Delete
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </AdminOnly>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingRule ? 'Edit Rule' : 'New Personal Rule'}</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-4 mt-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <Label>Match Type</Label>
                <select
                  value={form.match_type}
                  onChange={(e) => setForm((f) => ({ ...f, match_type: e.target.value }))}
                  disabled={!!editingRule}
                  className={selectCls}
                >
                  <option value="keyword">Keyword (description contains)</option>
                  <option value="vendor">Vendor (exact match)</option>
                </select>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>Priority</Label>
                <Input
                  type="number"
                  value={form.priority}
                  onChange={(e) => setForm((f) => ({ ...f, priority: e.target.value }))}
                  min="1"
                  placeholder="e.g. 10"
                />
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Match Value</Label>
              <Input
                value={form.match_value}
                onChange={(e) => setForm((f) => ({ ...f, match_value: e.target.value }))}
                placeholder={form.match_type === 'keyword' ? 'e.g. Netflix, Uber' : 'e.g. LCBO'}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Budget Category</Label>
              <select
                value={form.budget_category_id}
                onChange={(e) => setForm((f) => ({ ...f, budget_category_id: e.target.value }))}
                className={selectCls}
              >
                <option value="">Select category…</option>
                {incomeCategories.length > 0 && (
                  <optgroup label="Income">
                    {incomeCategories.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </optgroup>
                )}
                {expenseCategories.length > 0 && (
                  <optgroup label="Expenses">
                    {expenseCategories.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </optgroup>
                )}
              </select>
            </div>
            {error && <p className="text-sm text-red-500">{error}</p>}
            <div className="flex justify-end gap-2 mt-2">
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleSave} disabled={saving}>
                {saving ? 'Saving…' : editingRule ? 'Save Changes' : 'Create Rule'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
