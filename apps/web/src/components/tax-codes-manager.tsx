'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Pencil, PowerOff, Percent, Info } from 'lucide-react';
import { TaxCode, Account } from '@/types';
import { createTaxCode, updateTaxCode, deactivateTaxCode } from '@/app/(app)/tax/actions';
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

interface TaxCodesManagerProps { initialTaxCodes: TaxCode[]; taxAccounts: Account[]; }
interface TaxFormData { code: string; name: string; rate: string; tax_type: string; tax_account_id: string; itc_eligible: boolean; itc_rate: string; tax_category: string; }
const EMPTY_FORM: TaxFormData = { code: '', name: '', rate: '', tax_type: 'output', tax_account_id: '', itc_eligible: true, itc_rate: '100', tax_category: 'standard' };

const TAX_CATEGORIES = [
  { value: 'standard',            label: 'Standard (100% ITC)' },
  { value: 'meals_entertainment', label: 'Meals & Entertainment (50% ITC)' },
  { value: 'personal_use',        label: 'Personal Use (0% ITC)' },
  { value: 'exempt',              label: 'Exempt Supply' },
  { value: 'zero_rated',          label: 'Zero-Rated Supply' },
];

const CATEGORY_ITC_RATE: Record<string, string> = { standard: '100', meals_entertainment: '50', personal_use: '0', exempt: '0', zero_rated: '0' };

export function TaxCodesManager({ initialTaxCodes, taxAccounts }: TaxCodesManagerProps) {
  const router = useRouter();
  const [taxCodes, setTaxCodes] = useState<TaxCode[]>(initialTaxCodes);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCode, setEditingCode] = useState<TaxCode | null>(null);
  const [form, setForm] = useState<TaxFormData>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectCls = 'text-sm border border-input rounded-lg px-3 py-2 outline-none focus:border-primary disabled:bg-muted bg-card text-foreground';

  function openCreate() { setEditingCode(null); setForm(EMPTY_FORM); setError(null); setDialogOpen(true); }
  function openEdit(code: TaxCode) {
    setEditingCode(code);
    setForm({ code: code.code, name: code.name, rate: String(Math.round(Number(code.rate) * 100)), tax_type: code.tax_type, tax_account_id: code.tax_account_id,
      itc_eligible: (code as any).itc_eligible ?? true, itc_rate: String(Math.round(((code as any).itc_rate ?? 1) * 100)), tax_category: (code as any).tax_category ?? 'standard' });
    setError(null); setDialogOpen(true);
  }

  function handleCategoryChange(category: string) {
    setForm((f) => ({ ...f, tax_category: category, itc_rate: CATEGORY_ITC_RATE[category] ?? '100', itc_eligible: category !== 'personal_use' && category !== 'exempt' }));
  }

  async function handleSave() {
    if (!form.code || !form.name || !form.rate || !form.tax_account_id) { setError('All fields are required.'); return; }
    const rate = parseFloat(form.rate) / 100;
    if (isNaN(rate) || rate < 0 || rate > 100) { setError('Rate must be between 0 and 100.'); return; }
    const itcRatePct = parseFloat(form.itc_rate);
    if (form.tax_type === 'input' && (isNaN(itcRatePct) || itcRatePct < 0 || itcRatePct > 100)) { setError('ITC rate must be between 0 and 100.'); return; }

    setSaving(true); setError(null);
    const itcPayload = form.tax_type === 'input' ? { itc_eligible: form.itc_eligible, itc_rate: itcRatePct / 100, tax_category: form.tax_category || null } : {};
    const result = editingCode
      ? await updateTaxCode(editingCode.id, { name: form.name, rate, ...itcPayload })
      : await createTaxCode({ code: form.code, name: form.name, rate, tax_type: form.tax_type, tax_account_id: form.tax_account_id, ...itcPayload });
    setSaving(false);

    if (!result.success) { const msg = result.error ?? 'Operation failed.'; setError(msg); toastError(editingCode ? 'Failed to update tax code' : 'Failed to create tax code', msg); return; }
    toastSuccess(editingCode ? 'Tax code updated' : 'Tax code created', form.name);
    setDialogOpen(false); router.refresh();
  }

  async function handleDeactivate(code: TaxCode) {
    const result = await deactivateTaxCode(code.id);
    if (result.success) { setTaxCodes((prev) => prev.map((c) => (c.id === code.id ? { ...c, is_active: false } : c))); toastSuccess('Tax code deactivated', code.code); }
    else toastError('Failed to deactivate', result.error ?? 'Please try again.');
  }

  const isInputType = form.tax_type === 'input';

  return (
    <div className="p-6 max-w-screen-lg mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Tax Codes</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Manage GST, HST, PST and other tax rates</p>
        </div>
        <AdminOnly>
          <Button onClick={openCreate} className="flex items-center gap-2"><Plus className="w-4 h-4" />New Tax Code</Button>
        </AdminOnly>
      </div>

      {taxCodes.length === 0 && (
        <div className="mb-4 bg-blue-50 dark:bg-[#494C4F] border border-blue-100 dark:border-[#60A5FA]/40 rounded-lg px-4 py-3 text-sm text-blue-700 dark:text-[#60A5FA]">
          Common Canadian tax codes: HST (13%), GST (5%), PST (varies by province).
        </div>
      )}

      <Card>
        <CardContent className="p-0">
          {taxCodes.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Percent className="w-8 h-8 text-muted-foreground/20 mb-3" />
              <p className="text-sm text-muted-foreground">No tax codes yet. Create your first one.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead><TableHead>Name</TableHead><TableHead>Rate</TableHead>
                  <TableHead>Type</TableHead><TableHead>ITC</TableHead><TableHead>Status</TableHead>
                  <TableHead className="w-20" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {taxCodes.map((code) => {
                  const itcRate     = (code as any).itc_rate;
                  const itcEligible = (code as any).itc_eligible;
                  const taxCategory = (code as any).tax_category;
                  return (
                    <TableRow key={code.id}>
                      <TableCell className="font-mono font-medium">{code.code}</TableCell>
                      <TableCell>{code.name}</TableCell>
                      <TableCell className="font-medium">{code.rate}%</TableCell>
                      <TableCell><Badge variant={code.tax_type === 'output' ? 'classified' : 'pending'}>{code.tax_type === 'output' ? 'Output' : 'Input'}</Badge></TableCell>
                      <TableCell>
                        {code.tax_type === 'input' ? (
                          <span className="text-xs text-muted-foreground">
                            {itcEligible === false ? <span className="text-destructive">None</span>
                              : itcRate != null ? `${Math.round(itcRate * 100)}%${taxCategory === 'meals_entertainment' ? ' (M&E)' : ''}` : '100%'}
                          </span>
                        ) : <span className="text-xs text-muted-foreground">–</span>}
                      </TableCell>
                      <TableCell>{code.is_active ? <Badge variant="posted">Active</Badge> : <Badge variant="review">Inactive</Badge>}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <AdminOnly><Button variant="ghost" size="sm" onClick={() => openEdit(code)} className="text-muted-foreground hover:text-foreground"><Pencil className="w-3.5 h-3.5" /></Button></AdminOnly>
                          {code.is_active && (
                            <AdminOnly>
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-destructive"><PowerOff className="w-3.5 h-3.5" /></Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Deactivate {code.code}?</AlertDialogTitle>
                                    <AlertDialogDescription>This tax code will be deactivated. Existing tax transactions are not affected.</AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction onClick={() => handleDeactivate(code)} className="bg-destructive hover:bg-destructive/90 text-destructive-foreground">Deactivate</AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </AdminOnly>
                          )}
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
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{editingCode ? 'Edit Tax Code' : 'New Tax Code'}</DialogTitle></DialogHeader>
          <div className="flex flex-col gap-4 mt-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <Label>Code</Label>
                <Input value={form.code} onChange={(e) => setForm((f) => ({ ...f, code: e.target.value.toUpperCase() }))} placeholder="e.g. HST" disabled={!!editingCode} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>Rate (%)</Label>
                <Input type="number" value={form.rate} onChange={(e) => setForm((f) => ({ ...f, rate: e.target.value }))} placeholder="e.g. 13" min="0" max="100" step="0.01" />
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Name</Label>
              <Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="e.g. Harmonized Sales Tax" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <Label>Type</Label>
                <select value={form.tax_type} onChange={(e) => setForm((f) => ({ ...f, tax_type: e.target.value }))} disabled={!!editingCode} className={selectCls}>
                  <option value="output">Output (collected from customers)</option>
                  <option value="input">Input (paid to suppliers)</option>
                </select>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>Tax Liability Account</Label>
                <select value={form.tax_account_id} onChange={(e) => setForm((f) => ({ ...f, tax_account_id: e.target.value }))} disabled={!!editingCode} className={selectCls}>
                  <option value="">Select account…</option>
                  {taxAccounts.map((a) => <option key={a.id} value={a.id}>{a.account_code} – {a.account_name}</option>)}
                </select>
              </div>
            </div>

            {isInputType && (
              <div className="flex flex-col gap-3 pt-2 border-t border-border">
                <div className="flex items-center gap-1.5">
                  <Info className="w-3.5 h-3.5 text-muted-foreground" />
                  <span className="text-xs font-medium text-foreground">Input Tax Credit (ITC) Settings</span>
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label>Tax Category</Label>
                  <select value={form.tax_category} onChange={(e) => handleCategoryChange(e.target.value)} className={selectCls}>
                    {TAX_CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
                  </select>
                  <p className="text-xs text-muted-foreground">CRA rules limit ITCs on certain expense types (e.g. meals & entertainment are 50% recoverable).</p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1.5">
                    <Label>ITC Eligible</Label>
                    <select value={form.itc_eligible ? 'true' : 'false'} onChange={(e) => setForm((f) => ({ ...f, itc_eligible: e.target.value === 'true' }))} className={selectCls}>
                      <option value="true">Yes – ITC may be claimed</option>
                      <option value="false">No – not recoverable</option>
                    </select>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label>ITC Recovery Rate (%)</Label>
                    <Input type="number" min="0" max="100" step="1" value={form.itc_rate} onChange={(e) => setForm((f) => ({ ...f, itc_rate: e.target.value }))} disabled={!form.itc_eligible} placeholder="100" />
                    <p className="text-xs text-muted-foreground">100% = fully recoverable · 50% = M&E · 0% = none</p>
                  </div>
                </div>
              </div>
            )}

            {error && <p className="text-sm text-destructive">{error}</p>}
            <div className="flex justify-end gap-2 mt-2">
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleSave} disabled={saving}>{saving ? 'Saving…' : editingCode ? 'Save Changes' : 'Create Tax Code'}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
