'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Pencil, PowerOff, Percent } from 'lucide-react';
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

interface TaxCodesManagerProps {
  initialTaxCodes: TaxCode[];
  taxAccounts: Account[];
}

interface TaxFormData {
  code: string; name: string; rate: string; tax_type: string; tax_account_id: string;
}

const EMPTY_FORM: TaxFormData = { code: '', name: '', rate: '', tax_type: 'output', tax_account_id: '' };

export function TaxCodesManager({ initialTaxCodes, taxAccounts }: TaxCodesManagerProps) {
  const router = useRouter();
  const [taxCodes, setTaxCodes] = useState<TaxCode[]>(initialTaxCodes);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCode, setEditingCode] = useState<TaxCode | null>(null);
  const [form, setForm] = useState<TaxFormData>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function openCreate() { setEditingCode(null); setForm(EMPTY_FORM); setError(null); setDialogOpen(true); }
  function openEdit(code: TaxCode) {
    setEditingCode(code);
    setForm({ code: code.code, name: code.name, rate: String(code.rate), tax_type: code.tax_type, tax_account_id: code.tax_account_id });
    setError(null);
    setDialogOpen(true);
  }

  async function handleSave() {
    if (!form.code || !form.name || !form.rate || !form.tax_account_id) {
      setError('All fields are required.'); return;
    }
    const rate = parseFloat(form.rate);
    if (isNaN(rate) || rate < 0 || rate > 100) { setError('Rate must be between 0 and 100.'); return; }

    setSaving(true); setError(null);
    const result = editingCode
      ? await updateTaxCode(editingCode.id, { name: form.name, rate })
      : await createTaxCode({ code: form.code, name: form.name, rate, tax_type: form.tax_type, tax_account_id: form.tax_account_id });
    setSaving(false);

    if (!result.success) {
      const msg = result.error ?? 'Operation failed.';
      setError(msg);
      toastError(editingCode ? 'Failed to update tax code' : 'Failed to create tax code', msg);
      return;
    }

    toastSuccess(editingCode ? 'Tax code updated' : 'Tax code created', form.name);
    setDialogOpen(false);
    router.refresh();
  }

  async function handleDeactivate(code: TaxCode) {
    const result = await deactivateTaxCode(code.id);
    if (result.success) {
      setTaxCodes((prev) => prev.map((c) => (c.id === code.id ? { ...c, is_active: false } : c)));
      toastSuccess('Tax code deactivated', code.code);
    } else {
      toastError('Failed to deactivate', result.error ?? 'Please try again.');
    }
  }

  return (
    <div className="p-6 max-w-screen-lg mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Tax Codes</h1>
          <p className="text-sm text-gray-500 mt-0.5">Manage GST, HST, PST and other tax rates</p>
        </div>
        <AdminOnly>
          <Button onClick={openCreate} className="flex items-center gap-2">
            <Plus className="w-4 h-4" />New Tax Code
          </Button>
        </AdminOnly>
      </div>

      {taxCodes.length === 0 && (
        <div className="mb-4 bg-blue-50 border border-blue-100 rounded-lg px-4 py-3 text-sm text-blue-700">
          Common Canadian tax codes: HST (13%), GST (5%), PST (varies by province).
        </div>
      )}

      <Card>
        <CardContent className="p-0">
          {taxCodes.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Percent className="w-8 h-8 text-gray-300 mb-3" />
              <p className="text-sm text-gray-400">No tax codes yet. Create your first one.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead><TableHead>Name</TableHead>
                  <TableHead>Rate</TableHead><TableHead>Type</TableHead>
                  <TableHead>Status</TableHead><TableHead className="w-20" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {taxCodes.map((code) => (
                  <TableRow key={code.id}>
                    <TableCell className="font-mono font-medium">{code.code}</TableCell>
                    <TableCell>{code.name}</TableCell>
                    <TableCell className="font-medium">{code.rate}%</TableCell>
                    <TableCell>
                      <Badge variant={code.tax_type === 'output' ? 'classified' : 'pending'}>
                        {code.tax_type === 'output' ? 'Output (collected)' : 'Input (paid)'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {code.is_active ? <Badge variant="posted">Active</Badge> : <Badge variant="review">Inactive</Badge>}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <AdminOnly>
                          <Button variant="ghost" size="sm" onClick={() => openEdit(code)} className="text-gray-400 hover:text-gray-600">
                            <Pencil className="w-3.5 h-3.5" />
                          </Button>
                        </AdminOnly>
                        {code.is_active && (
                          <AdminOnly>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="ghost" size="sm" className="text-gray-400 hover:text-red-500">
                                  <PowerOff className="w-3.5 h-3.5" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Deactivate {code.code}?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    This tax code will be deactivated. Existing tax transactions are not affected.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => handleDeactivate(code)} className="bg-red-500 hover:bg-red-600 text-white">
                                    Deactivate
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </AdminOnly>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingCode ? 'Edit Tax Code' : 'New Tax Code'}</DialogTitle>
          </DialogHeader>
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
                <select value={form.tax_type} onChange={(e) => setForm((f) => ({ ...f, tax_type: e.target.value }))} disabled={!!editingCode} className="text-sm border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-[#0F6E56] disabled:bg-gray-50">
                  <option value="output">Output (collected from customers)</option>
                  <option value="input">Input (paid to suppliers)</option>
                </select>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>Tax Liability Account</Label>
                <select value={form.tax_account_id} onChange={(e) => setForm((f) => ({ ...f, tax_account_id: e.target.value }))} disabled={!!editingCode} className="text-sm border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-[#0F6E56] disabled:bg-gray-50">
                  <option value="">Select account…</option>
                  {taxAccounts.map((a) => <option key={a.id} value={a.id}>{a.account_code} – {a.account_name}</option>)}
                </select>
              </div>
            </div>
            {error && <p className="text-sm text-red-500">{error}</p>}
            <div className="flex justify-end gap-2 mt-2">
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleSave} disabled={saving}>
                {saving ? 'Saving…' : editingCode ? 'Save Changes' : 'Create Tax Code'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
