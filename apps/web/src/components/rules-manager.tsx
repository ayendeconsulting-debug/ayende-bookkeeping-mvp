'use client';

import { useState } from 'react';
import { Plus, Pencil, Trash2, Filter } from 'lucide-react';
import { ClassificationRule, Account } from '@/types';
import { createRule, updateRule, deleteRule } from '@/app/(app)/rules/actions';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

interface RulesManagerProps {
  initialRules: ClassificationRule[];
  accounts: Account[];
}

interface RuleFormData {
  match_type: string;
  match_value: string;
  target_account_id: string;
  priority: string;
}

const EMPTY_FORM: RuleFormData = {
  match_type: 'keyword',
  match_value: '',
  target_account_id: '',
  priority: '10',
};

const MATCH_TYPE_LABELS: Record<string, string> = {
  keyword: 'Keyword',
  vendor: 'Vendor',
  account: 'Account',
};

export function RulesManager({ initialRules, accounts }: RulesManagerProps) {
  const [rules, setRules] = useState<ClassificationRule[]>(
    [...initialRules].sort((a, b) => a.priority - b.priority),
  );
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<ClassificationRule | null>(null);
  const [form, setForm] = useState<RuleFormData>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function openCreate() {
    setEditingRule(null);
    setForm({
      ...EMPTY_FORM,
      priority: String((rules.length + 1) * 10),
    });
    setError(null);
    setDialogOpen(true);
  }

  function openEdit(rule: ClassificationRule) {
    setEditingRule(rule);
    setForm({
      match_type: rule.match_type,
      match_value: rule.match_value,
      target_account_id: rule.target_account_id,
      priority: String(rule.priority),
    });
    setError(null);
    setDialogOpen(true);
  }

  async function handleSave() {
    if (!form.match_value || !form.target_account_id) {
      setError('Match value and target account are required.');
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
      ? await updateRule(editingRule.id, {
          match_value: form.match_value,
          target_account_id: form.target_account_id,
          priority,
        })
      : await createRule({
          match_type: form.match_type,
          match_value: form.match_value,
          target_account_id: form.target_account_id,
          priority,
        });

    setSaving(false);

    if (!result.success) {
      setError(result.error ?? 'Operation failed.');
      return;
    }

    setDialogOpen(false);
    window.location.reload();
  }

  async function handleDelete(id: string) {
    const result = await deleteRule(id);
    if (result.success) {
      setRules((prev) => prev.filter((r) => r.id !== id));
    }
  }

  const accountMap = Object.fromEntries(accounts.map((a) => [a.id, a]));

  return (
    <div className="p-6 max-w-screen-lg mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Classification Rules</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Auto-classify transactions by keyword, vendor, or account match
          </p>
        </div>
        <Button onClick={openCreate} className="flex items-center gap-2">
          <Plus className="w-4 h-4" />
          New Rule
        </Button>
      </div>

      {/* Info box */}
      <div className="mb-4 bg-blue-50 border border-blue-100 rounded-lg px-4 py-3 text-sm text-blue-700">
        Rules are applied in priority order (lowest number first). The first matching rule wins.
      </div>

      <Card>
        <CardContent className="p-0">
          {rules.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Filter className="w-8 h-8 text-gray-300 mb-3" />
              <p className="text-sm text-gray-400">
                No rules yet. Add rules to auto-classify transactions.
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-16">Priority</TableHead>
                  <TableHead>Match Type</TableHead>
                  <TableHead>Match Value</TableHead>
                  <TableHead>Target Account</TableHead>
                  <TableHead className="w-24" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {rules.map((rule) => {
                  const account = accountMap[rule.target_account_id];
                  return (
                    <TableRow key={rule.id}>
                      <TableCell className="font-mono text-sm text-gray-500">
                        {rule.priority}
                      </TableCell>
                      <TableCell>
                        <Badge variant="pending">
                          {MATCH_TYPE_LABELS[rule.match_type] ?? rule.match_type}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-medium">{rule.match_value}</TableCell>
                      <TableCell className="text-sm">
                        {account ? (
                          <span>
                            <span className="text-gray-400 mr-1.5">{account.account_code}</span>
                            {account.account_name}
                          </span>
                        ) : (
                          <span className="text-gray-400">Unknown account</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openEdit(rule)}
                            className="text-gray-400 hover:text-gray-600"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-gray-400 hover:text-red-500"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete rule?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  This rule will be deleted and will no longer auto-classify
                                  matching transactions.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleDelete(rule.id)}
                                  className="bg-red-500 hover:bg-red-600 text-white"
                                >
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
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

      {/* Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingRule ? 'Edit Rule' : 'New Classification Rule'}</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-4 mt-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <Label>Match Type</Label>
                <select
                  value={form.match_type}
                  onChange={(e) => setForm((f) => ({ ...f, match_type: e.target.value }))}
                  disabled={!!editingRule}
                  className="text-sm border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-[#0F6E56] disabled:bg-gray-50"
                >
                  <option value="keyword">Keyword (description contains)</option>
                  <option value="vendor">Vendor (exact match)</option>
                  <option value="account">Account (source account)</option>
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
                placeholder={
                  form.match_type === 'keyword'
                    ? 'e.g. Shopify, AWS, Netflix'
                    : form.match_type === 'vendor'
                    ? 'e.g. Amazon.ca'
                    : 'e.g. account name'
                }
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label>Target Account</Label>
              <select
                value={form.target_account_id}
                onChange={(e) => setForm((f) => ({ ...f, target_account_id: e.target.value }))}
                className="text-sm border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-[#0F6E56]"
              >
                <option value="">Select account…</option>
                {accounts
                  .filter((a) => a.is_active)
                  .map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.account_code} — {a.account_name} ({a.account_type})
                    </option>
                  ))}
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
