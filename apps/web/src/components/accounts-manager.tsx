'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Pencil, PowerOff, ChevronDown, ChevronRight, Wand2 } from 'lucide-react';
import { Account, AccountType } from '@/types';
import { createAccount, updateAccount, deactivateAccount, seedDefaultAccounts } from '@/app/(app)/accounts/actions';
import { AdminOnly } from '@/components/admin-only';
import { toastSuccess, toastError } from '@/lib/toast';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const ACCOUNT_TYPES: AccountType[] = ['asset', 'liability', 'equity', 'revenue', 'expense'];

const SUBTYPES_BY_TYPE: Record<string, { value: string; label: string }[]> = {
  asset:     [{ value: '', label: 'None' }, { value: 'bank', label: 'Bank' }, { value: 'accounts_receivable', label: 'Accounts Receivable' }, { value: 'fixed_asset', label: 'Fixed Asset' }, { value: 'general', label: 'General' }],
  liability: [{ value: '', label: 'None' }, { value: 'credit_card', label: 'Credit Card' }, { value: 'accounts_payable', label: 'Accounts Payable' }, { value: 'tax_payable', label: 'Tax Payable' }, { value: 'general', label: 'General' }],
  equity:    [{ value: '', label: 'None' }, { value: 'owner_contribution', label: 'Owner Contribution' }, { value: 'owner_draw', label: 'Owner Draw' }, { value: 'retained_earnings', label: 'Retained Earnings' }, { value: 'general', label: 'General' }],
  revenue:   [{ value: '', label: 'None' }, { value: 'other_income', label: 'Other Income' }, { value: 'general', label: 'General' }],
  expense:   [{ value: '', label: 'None' }, { value: 'operating_expense', label: 'Operating Expense' }, { value: 'cost_of_goods_sold', label: 'Cost of Goods Sold' }, { value: 'other_expense', label: 'Other Expense' }, { value: 'general', label: 'General' }],
};

const TYPE_COLORS: Record<AccountType, string> = {
  asset:     'text-blue-600 bg-blue-50 dark:text-blue-400 dark:bg-blue-900/20',
  liability: 'text-red-600 bg-red-50 dark:text-red-400 dark:bg-red-900/20',
  equity:    'text-purple-600 bg-purple-50 dark:text-purple-400 dark:bg-purple-900/20',
  revenue:   'text-green-600 bg-green-50 dark:text-green-400 dark:bg-green-900/20',
  expense:   'text-orange-600 bg-orange-50 dark:text-orange-400 dark:bg-orange-900/20',
};

interface AccountsManagerProps { initialAccounts: Account[]; }
interface AccountFormData { account_code: string; account_name: string; account_type: string; account_subtype: string; }
const EMPTY_FORM: AccountFormData = { account_code: '', account_name: '', account_type: 'asset', account_subtype: '' };

const selectCls = 'text-sm border border-input rounded-lg px-3 py-2 outline-none focus:border-primary disabled:bg-muted disabled:text-muted-foreground bg-card text-foreground';

export function AccountsManager({ initialAccounts }: AccountsManagerProps) {
  const router = useRouter();
  const [accounts, setAccounts] = useState<Account[]>(initialAccounts);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
  const [form, setForm] = useState<AccountFormData>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [collapsedTypes, setCollapsedTypes] = useState<Set<string>>(new Set());
  const [isSeedPending, startSeedTransition] = useTransition();

  function openCreate() { setEditingAccount(null); setForm(EMPTY_FORM); setError(null); setDialogOpen(true); }
  function openEdit(account: Account) {
    setEditingAccount(account);
    setForm({ account_code: account.account_code, account_name: account.account_name, account_type: account.account_type, account_subtype: account.account_subtype ?? '' });
    setError(null); setDialogOpen(true);
  }

  async function handleSave() {
    if (!form.account_code || !form.account_name) { setError('Account code and name are required.'); return; }
    setSaving(true); setError(null);
    const result = editingAccount
      ? await updateAccount(editingAccount.id, { account_name: form.account_name, account_code: form.account_code })
      : await createAccount({ account_code: form.account_code, account_name: form.account_name, account_type: form.account_type, account_subtype: form.account_subtype || undefined });
    setSaving(false);
    if (!result.success) { const msg = result.error ?? 'Operation failed.'; setError(msg); toastError(editingAccount ? 'Failed to update account' : 'Failed to create account', msg); return; }
    toastSuccess(editingAccount ? 'Account updated' : 'Account created', form.account_name);
    setDialogOpen(false); router.refresh();
  }

  async function handleDeactivate(account: Account) {
    const result = await deactivateAccount(account.id);
    if (result.success) { setAccounts((prev) => prev.map((a) => (a.id === account.id ? { ...a, is_active: false } : a))); toastSuccess('Account deactivated', account.account_name); }
    else toastError('Failed to deactivate account', result.error ?? 'Please try again.');
  }

  function handleSeedDefaults() {
    startSeedTransition(async () => {
      const result = await seedDefaultAccounts();
      if (result.success && result.data) { const { added, skipped } = result.data; toastSuccess(`${added} account${added !== 1 ? 's' : ''} added, ${skipped} already existed.`); router.refresh(); }
      else toastError(result.error ?? 'Failed to load default accounts.');
    });
  }

  function toggleType(type: string) {
    setCollapsedTypes((prev) => { const next = new Set(prev); next.has(type) ? next.delete(type) : next.add(type); return next; });
  }

  const grouped = ACCOUNT_TYPES.reduce((acc, type) => { acc[type] = accounts.filter((a) => a.account_type === type); return acc; }, {} as Record<string, Account[]>);
  const showLoadDefaults = accounts.length < 5;

  return (
    <div className="p-6 max-w-screen-lg mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Chart of Accounts</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{accounts.filter((a) => a.is_active).length} active accounts</p>
        </div>
        <div className="flex items-center gap-2">
          {showLoadDefaults && (
            <AdminOnly>
              <Button variant="outline" onClick={handleSeedDefaults} disabled={isSeedPending}
                className="flex items-center gap-2 border-primary text-primary hover:bg-primary-light">
                <Wand2 className="w-4 h-4" />{isSeedPending ? 'Loading...' : 'Load Default Accounts'}
              </Button>
            </AdminOnly>
          )}
          <AdminOnly>
            <Button onClick={openCreate} className="flex items-center gap-2">
              <Plus className="w-4 h-4" />New Account
            </Button>
          </AdminOnly>
        </div>
      </div>

      {accounts.length === 0 && (
        <div className="mb-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 rounded-lg px-4 py-3 text-sm text-blue-700 dark:text-blue-400">
          Your chart of accounts is empty. Click <strong>Load Default Accounts</strong> to add a standard set of 27 accounts, or create them manually.
        </div>
      )}

      <div className="flex flex-col gap-4">
        {ACCOUNT_TYPES.map((type) => {
          const typeAccounts = grouped[type] ?? [];
          const collapsed = collapsedTypes.has(type);
          return (
            <Card key={type}>
              <CardHeader className="flex-row items-center justify-between pb-2 cursor-pointer select-none" onClick={() => toggleType(type)}>
                <div className="flex items-center gap-2">
                  {collapsed ? <ChevronRight className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                  <CardTitle className="capitalize">{type}</CardTitle>
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${TYPE_COLORS[type]}`}>{typeAccounts.length}</span>
                </div>
              </CardHeader>
              {!collapsed && (
                <CardContent className="pt-0">
                  {typeAccounts.length === 0 ? (
                    <p className="text-sm text-muted-foreground py-3 text-center">No {type} accounts yet.</p>
                  ) : (
                    <div className="divide-y divide-border">
                      {typeAccounts.map((account) => (
                        <div key={account.id} className="flex items-center justify-between py-2.5">
                          <div className="flex items-center gap-3">
                            <span className="text-xs font-mono text-muted-foreground w-14 flex-shrink-0">{account.account_code}</span>
                            <div>
                              <span className="text-sm font-medium text-foreground">{account.account_name}</span>
                              {account.account_subtype && (
                                <span className="ml-2 text-xs text-muted-foreground capitalize">({account.account_subtype.replace('_', ' ')})</span>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {!account.is_active && <Badge variant="review">Inactive</Badge>}
                            {account.balance !== undefined && (
                              <span className="text-sm font-medium text-foreground w-24 text-right">${Number(account.balance).toFixed(2)}</span>
                            )}
                            <AdminOnly>
                              <Button variant="ghost" size="sm" onClick={() => openEdit(account)} className="text-muted-foreground hover:text-foreground">
                                <Pencil className="w-3.5 h-3.5" />
                              </Button>
                            </AdminOnly>
                            {account.is_active && (
                              <AdminOnly>
                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-destructive">
                                      <PowerOff className="w-3.5 h-3.5" />
                                    </Button>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent>
                                    <AlertDialogHeader>
                                      <AlertDialogTitle>Deactivate {account.account_name}?</AlertDialogTitle>
                                      <AlertDialogDescription>This account will be deactivated and hidden from new transactions. Existing journal entries are not affected.</AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                                      <AlertDialogAction onClick={() => handleDeactivate(account)} className="bg-destructive hover:bg-destructive/90 text-destructive-foreground">Deactivate</AlertDialogAction>
                                    </AlertDialogFooter>
                                  </AlertDialogContent>
                                </AlertDialog>
                              </AdminOnly>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              )}
            </Card>
          );
        })}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editingAccount ? 'Edit Account' : 'New Account'}</DialogTitle></DialogHeader>
          <div className="flex flex-col gap-4 mt-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <Label>Account Code</Label>
                <Input value={form.account_code} onChange={(e) => setForm((f) => ({ ...f, account_code: e.target.value }))} placeholder="e.g. 1000" />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>Account Type</Label>
                <select value={form.account_type} onChange={(e) => setForm((f) => ({ ...f, account_type: e.target.value, account_subtype: '' }))}
                  disabled={!!editingAccount} className={selectCls}>
                  {ACCOUNT_TYPES.map((t) => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
                </select>
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Account Name</Label>
              <Input value={form.account_name} onChange={(e) => setForm((f) => ({ ...f, account_name: e.target.value }))} placeholder="e.g. Cash and Cash Equivalents" />
            </div>
            {!editingAccount && (
              <div className="flex flex-col gap-1.5">
                <Label>Subtype (optional)</Label>
                <select value={form.account_subtype} onChange={(e) => setForm((f) => ({ ...f, account_subtype: e.target.value }))} className={selectCls}>
                  {(SUBTYPES_BY_TYPE[form.account_type] ?? []).map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                </select>
              </div>
            )}
            {error && <p className="text-sm text-destructive">{error}</p>}
            <div className="flex justify-end gap-2 mt-2">
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleSave} disabled={saving}>{saving ? 'Saving...' : editingAccount ? 'Save Changes' : 'Create Account'}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
