'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Pencil, Trash2, Filter, Wand2 } from 'lucide-react';
import { ClassificationRule, Account, TaxCode } from '@/types';
import { createRule, updateRule, deleteRule } from '@/app/(app)/rules/actions';
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
import { cn } from '@/lib/utils';

interface RulesManagerProps {
  initialRules: ClassificationRule[];
  accounts: Account[];
  taxCodes: TaxCode[];
}

interface RuleFormData {
  match_type: string;
  match_value: string;
  target_account_id: string;
  priority: string;
  tax_code_id: string;
}

const EMPTY_FORM: RuleFormData = { match_type: 'keyword', match_value: '', target_account_id: '', priority: '10', tax_code_id: '' };
const MATCH_TYPE_LABELS: Record<string, string> = { keyword: 'Keyword', vendor: 'Vendor', account: 'Account' };

function SourceBadge({ source }: { source?: string }) {
  if (source === 'user_learned') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800">
        <Wand2 className="w-3 h-3" />Learned
      </span>
    );
  }
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-muted text-muted-foreground border border-border">
      Manual
    </span>
  );
}

export function RulesManager({ initialRules, accounts, taxCodes }: RulesManagerProps) {
  const router = useRouter();
  const [rules, setRules] = useState<ClassificationRule[]>(
    [...initialRules].sort((a, b) => a.priority - b.priority),
  );
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<ClassificationRule | null>(null);
  const [form, setForm] = useState<RuleFormData>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectCls = 'text-sm border border-input rounded-lg px-3 py-2 w-full outline-none bg-card text-foreground focus:border-primary disabled:bg-muted disabled:opacity-60';

  function openCreate() {
    setEditingRule(null); setForm({ ...EMPTY_FORM, priority: String((rules.length + 1) * 10) }); setError(null); setDialogOpen(true);
  }
  function openEdit(rule: ClassificationRule) {
    setEditingRule(rule);
    setForm({ match_type: rule.match_type, match_value: rule.match_value, target_account_id: rule.target_account_id, priority: String(rule.priority), tax_code_id: rule.tax_code_id ?? '' });
    setError(null); setDialogOpen(true);
  }

  async function handleSave() {
    if (!form.match_value || !form.target_account_id) { setError('Match value and target account are required.'); return; }
    const priority = parseInt(form.priority, 10);
    if (isNaN(priority) || priority < 1) { setError('Priority must be a positive number.'); return; }

    setSaving(true); setError(null);
    const taxCodeId = form.tax_code_id || undefined;
    const result = editingRule
      ? await updateRule(editingRule.id, { match_value: form.match_value, target_account_id: form.target_account_id, priority, tax_code_id: taxCodeId })
      : await createRule({ match_type: form.match_type, match_value: form.match_value, target_account_id: form.target_account_id, priority, tax_code_id: taxCodeId });
    setSaving(false);

    if (!result.success) {
      const msg = result.error ?? 'Operation failed.';
      setError(msg); toastError(editingRule ? 'Failed to update rule' : 'Failed to create rule', msg); return;
    }
    toastSuccess(editingRule ? 'Rule updated' : 'Rule created', `Match: ${form.match_value}`);
    setDialogOpen(false); router.refresh();
  }

  async function handleDelete(rule: ClassificationRule) {
    const result = await deleteRule(rule.id);
    if (result.success) { setRules((prev) => prev.filter((r) => r.id !== rule.id)); toastSuccess('Rule deleted', rule.match_value); }
    else toastError('Failed to delete rule', result.error ?? 'Please try again.');
  }

  const accountMap  = Object.fromEntries(accounts.map((a) => [a.id, a]));
  const taxCodeMap  = Object.fromEntries(taxCodes.map((t) => [t.id, t]));
  const learnedCount = rules.filter((r) => r.source === 'user_learned').length;
  const manualCount  = rules.filter((r) => r.source !== 'user_learned').length;

  return (
    <div className="p-6 max-w-screen-lg mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Classification Rules</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Auto-classify transactions by keyword, vendor, or account match
            {rules.length > 0 && (
              <span className="ml-2 text-muted-foreground/60">
                · {manualCount} manual{learnedCount > 0 ? `, ${learnedCount} learned` : ''}
              </span>
            )}
          </p>
        </div>
        <AdminOnly>
          <Button onClick={openCreate} className="flex items-center gap-2">
            <Plus className="w-4 h-4" />New Rule
          </Button>
        </AdminOnly>
      </div>

      <div className="mb-4 bg-blue-50 border border-blue-100 rounded-lg px-4 py-3 text-sm text-blue-700 dark:bg-blue-900/20 dark:border-blue-800 dark:text-blue-400">
        Rules are applied in priority order (lowest number first). The first matching rule wins.
        <span className="ml-2">
          <Wand2 className="inline w-3.5 h-3.5 mr-0.5" />
          Learned rules are created automatically when you classify a transaction and confirm the suggestion.
        </span>
      </div>

      <Card>
        <CardContent className="p-0">
          {rules.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Filter className="w-8 h-8 text-muted-foreground/20 mb-3" />
              <p className="text-sm text-muted-foreground">No rules yet. Add rules to auto-classify transactions.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-16">Priority</TableHead>
                  <TableHead className="w-28">Source</TableHead>
                  <TableHead>Match Type</TableHead>
                  <TableHead>Match Value</TableHead>
                  <TableHead>Target Account</TableHead>
                  <TableHead>Tax Code</TableHead>
                  <TableHead className="w-24" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {rules.map((rule) => {
                  const account = accountMap[rule.target_account_id];
                  const taxCode = rule.tax_code_id ? taxCodeMap[rule.tax_code_id] : null;
                  return (
                    <TableRow key={rule.id} className={cn(rule.source === 'user_learned' && 'bg-amber-50/30 dark:bg-amber-900/10')}>
                      <TableCell className="font-mono text-sm text-muted-foreground">{rule.priority}</TableCell>
                      <TableCell><SourceBadge source={rule.source} /></TableCell>
                      <TableCell><Badge variant="pending">{MATCH_TYPE_LABELS[rule.match_type] ?? rule.match_type}</Badge></TableCell>
                      <TableCell className="font-medium">{rule.match_value}</TableCell>
                      <TableCell className="text-sm">
                        {account
                          ? <span><span className="text-muted-foreground mr-1.5">{account.account_code}</span>{account.account_name}</span>
                          : <span className="text-muted-foreground">Unknown account</span>}
                      </TableCell>
                      <TableCell className="text-sm">
                        {taxCode ? <Badge variant="outline">{taxCode.name} ({taxCode.rate}%)</Badge> : <span className="text-muted-foreground">–</span>}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <AdminOnly>
                            <Button variant="ghost" size="sm" onClick={() => openEdit(rule)} className="text-muted-foreground hover:text-foreground">
                              <Pencil className="w-3.5 h-3.5" />
                            </Button>
                          </AdminOnly>
                          <AdminOnly>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-destructive">
                                  <Trash2 className="w-3.5 h-3.5" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Delete rule?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    {rule.source === 'user_learned'
                                      ? 'This learned rule will be deleted. Transactions matching this pattern will no longer be auto-classified.'
                                      : 'This rule will be deleted and will no longer auto-classify matching transactions.'}
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => handleDelete(rule)} className="bg-destructive hover:bg-destructive/90 text-destructive-foreground">Delete</AlertDialogAction>
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
            <DialogTitle>{editingRule ? 'Edit Rule' : 'New Classification Rule'}</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-4 mt-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <Label>Match Type</Label>
                <select value={form.match_type} onChange={(e) => setForm((f) => ({ ...f, match_type: e.target.value }))}
                  disabled={!!editingRule} className={selectCls}>
                  <option value="keyword">Keyword (description contains)</option>
                  <option value="vendor">Vendor (exact match)</option>
                  <option value="account">Account (source account)</option>
                </select>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>Priority</Label>
                <Input type="number" value={form.priority} onChange={(e) => setForm((f) => ({ ...f, priority: e.target.value }))} min="1" placeholder="e.g. 10" />
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Match Value</Label>
              <Input value={form.match_value} onChange={(e) => setForm((f) => ({ ...f, match_value: e.target.value }))}
                placeholder={form.match_type === 'keyword' ? 'e.g. Shopify, AWS' : form.match_type === 'vendor' ? 'e.g. Amazon.ca' : 'e.g. account name'} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Target Account</Label>
              <select value={form.target_account_id} onChange={(e) => setForm((f) => ({ ...f, target_account_id: e.target.value }))} className={selectCls}>
                <option value="">Select account…</option>
                {accounts.filter((a) => a.is_active).map((a) => (
                  <option key={a.id} value={a.id}>{a.account_code} – {a.account_name} ({a.account_type})</option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Tax Code <span className="text-muted-foreground text-xs font-normal">(optional)</span></Label>
              <select value={form.tax_code_id} onChange={(e) => setForm((f) => ({ ...f, tax_code_id: e.target.value }))} className={selectCls}>
                <option value="">No tax code</option>
                {taxCodes.map((t) => <option key={t.id} value={t.id}>{t.name} ({t.rate}%)</option>)}
              </select>
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
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
