'use client';

import { useState, useTransition, useEffect } from 'react';
import { Plus, Trash2, Loader2, RefreshCw } from 'lucide-react';
import { Account, TaxCode, Invoice } from '@/types';
import { createInvoice, updateInvoice } from '@/app/(app)/invoices/actions';
import { toastSuccess, toastError } from '@/lib/toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';

interface LineItem {
  description: string;
  quantity: string;
  unit_price: string;
  tax_code_id: string;
}

const EMPTY_LINE: LineItem = { description: '', quantity: '1', unit_price: '', tax_code_id: '' };

interface InvoiceFormProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  accounts: Account[];
  taxCodes: TaxCode[];
  editingInvoice?: Invoice | null;
}

export function InvoiceForm({ open, onClose, onSuccess, accounts, taxCodes, editingInvoice }: InvoiceFormProps) {
  const today = new Date().toISOString().split('T')[0];
  const net30 = new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0];

  const [clientName,          setClientName]          = useState('');
  const [clientEmail,         setClientEmail]         = useState('');
  const [issueDate,           setIssueDate]           = useState(today);
  const [dueDate,             setDueDate]             = useState(net30);
  const [invoiceNumber,       setInvoiceNumber]       = useState('');
  const [notes,               setNotes]               = useState('');
  const [lineItems,           setLineItems]           = useState<LineItem[]>([{ ...EMPTY_LINE }]);
  const [isRecurring,         setIsRecurring]         = useState(false);
  const [recurringFrequency,  setRecurringFrequency]  = useState('monthly');
  const [autoSend,            setAutoSend]            = useState(false);
  const [error,               setError]               = useState<string | null>(null);
  const [isPending,           startTransition]        = useTransition();

  useEffect(() => {
    if (!open) return;
    const inv = editingInvoice;
    setClientName(inv?.client_name ?? '');
    setClientEmail(inv?.client_email ?? '');
    setIssueDate(inv?.issue_date ? String(inv.issue_date).slice(0, 10) : today);
    setDueDate(inv?.due_date ? String(inv.due_date).slice(0, 10) : net30);
    setInvoiceNumber(inv?.invoice_number ?? '');
    setNotes(inv?.notes ?? '');
    setIsRecurring(inv?.is_recurring ?? false);
    setRecurringFrequency(inv?.recurring_frequency ?? 'monthly');
    setAutoSend(inv?.auto_send ?? false);
    setLineItems(
      (inv?.line_items ?? inv?.lineItems)?.length
        ? (inv.line_items ?? inv.lineItems!).map((li) => ({
            description: li.description,
            quantity: String(li.quantity),
            unit_price: String(li.unit_price),
            tax_code_id: li.tax_code_id ?? '',
          }))
        : [{ ...EMPTY_LINE }],
    );
    setError(null);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, editingInvoice?.id]);

  const activeTaxCodes = taxCodes.filter((t) => t.is_active);

  function handleClose() { setError(null); onClose(); }
  function addLine() { setLineItems((prev) => [...prev, { ...EMPTY_LINE }]); }
  function removeLine(idx: number) { setLineItems((prev) => prev.filter((_, i) => i !== idx)); }
  function updateLine(idx: number, field: keyof LineItem, value: string) {
    setLineItems((prev) => prev.map((item, i) => (i === idx ? { ...item, [field]: value } : item)));
  }

  const lineItemsWithTotals = lineItems.map((item) => {
    const qty      = parseFloat(item.quantity) || 0;
    const price    = parseFloat(item.unit_price) || 0;
    const lineTotal = qty * price;
    const taxCode  = activeTaxCodes.find((t) => t.id === item.tax_code_id);
    return { lineTotal, taxAmount: taxCode ? lineTotal * Number(taxCode.rate) : 0 };
  });
  const subtotal = lineItemsWithTotals.reduce((s, l) => s + l.lineTotal, 0);
  const taxTotal = lineItemsWithTotals.reduce((s, l) => s + l.taxAmount, 0);
  const total    = subtotal + taxTotal;

  function handleSubmit() {
    if (!clientName.trim()) { setError('Client name is required.'); return; }
    if (!issueDate || !dueDate) { setError('Issue date and due date are required.'); return; }
    const validLines = lineItems.filter((l) => l.description && parseFloat(l.unit_price) > 0);
    if (validLines.length === 0) { setError('Each line item must have a description and price.'); return; }

    setError(null);
    startTransition(async () => {
      const payload = {
        client_name: clientName.trim(),
        client_email: clientEmail || undefined,
        issue_date: issueDate,
        due_date: dueDate,
        invoice_number: invoiceNumber || undefined,
        notes: notes || undefined,
        is_recurring: isRecurring,
        recurring_frequency: isRecurring ? recurringFrequency : undefined,
        auto_send: isRecurring ? autoSend : false,
        line_items: validLines.map((l, idx) => ({
          description: l.description,
          quantity: parseFloat(l.quantity) || 1,
          unit_price: parseFloat(l.unit_price),
          tax_code_id: l.tax_code_id || undefined,
          sort_order: idx,
        })),
      };

      const result = editingInvoice
        ? await updateInvoice(editingInvoice.id, payload)
        : await createInvoice(payload);

      if (result.success) {
        toastSuccess(
          editingInvoice ? 'Invoice updated' : 'Invoice created',
          `${invoiceNumber || 'INV'} – ${clientName}`,
        );
        handleClose(); onSuccess();
      } else {
        const msg = result.error ?? 'Operation failed';
        setError(msg);
        toastError(editingInvoice ? 'Failed to update invoice' : 'Failed to create invoice', msg);
      }
    });
  }

  const selectCls = 'text-sm border border-input rounded-lg px-3 py-2 w-full outline-none bg-card text-foreground focus:border-primary';
  const toggleCls = (on: boolean) =>
    `relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none ${on ? 'bg-primary' : 'bg-muted-foreground/30'}`;
  const thumbCls = (on: boolean) =>
    `inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${on ? 'translate-x-4' : 'translate-x-0.5'}`;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editingInvoice ? 'Edit Invoice' : 'New Invoice'}</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4 mt-2">
          {/* Client + dates */}
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label>Client Name *</Label>
              <Input value={clientName} onChange={(e) => setClientName(e.target.value)} placeholder="Acme Corp" />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Client Email</Label>
              <Input type="email" value={clientEmail} onChange={(e) => setClientEmail(e.target.value)} placeholder="billing@acme.com" />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label>Invoice # <span className="text-muted-foreground font-normal">(auto)</span></Label>
              <Input value={invoiceNumber} onChange={(e) => setInvoiceNumber(e.target.value)} placeholder="INV-2026-001" />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Issue Date *</Label>
              <Input type="date" value={issueDate} onChange={(e) => setIssueDate(e.target.value)} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Due Date *</Label>
              <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
            </div>
          </div>

          <Separator />

          {/* Recurring settings */}
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <RefreshCw className="w-4 h-4 text-muted-foreground" />
                <Label className="cursor-pointer">Recurring Invoice</Label>
              </div>
              <button type="button" onClick={() => setIsRecurring((v) => !v)} className={toggleCls(isRecurring)}>
                <span className={thumbCls(isRecurring)} />
              </button>
            </div>

            {isRecurring && (
              <div className="grid grid-cols-2 gap-3 pl-6 border-l-2 border-primary/20">
                <div className="flex flex-col gap-1.5">
                  <Label>Frequency</Label>
                  <select value={recurringFrequency} onChange={(e) => setRecurringFrequency(e.target.value)} className={selectCls}>
                    <option value="weekly">Weekly</option>
                    <option value="biweekly">Bi-weekly</option>
                    <option value="monthly">Monthly</option>
                    <option value="quarterly">Quarterly</option>
                    <option value="annually">Annually</option>
                  </select>
                </div>
                <div className="flex flex-col gap-1.5 justify-end">
                  <div className="flex items-center justify-between h-10 px-3 border border-border rounded-lg">
                    <Label className="cursor-pointer text-sm">Auto-send when generated</Label>
                    <button type="button" onClick={() => setAutoSend((v) => !v)}
                      className={`${toggleCls(autoSend)} flex-shrink-0 ml-2`}>
                      <span className={thumbCls(autoSend)} />
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          <Separator />

          {/* Line Items */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <Label>Line Items</Label>
              <Button type="button" variant="outline" size="sm" onClick={addLine} className="flex items-center gap-1.5">
                <Plus className="w-3.5 h-3.5" />Add Line
              </Button>
            </div>

            <div className="flex flex-col gap-2">
              <div className="grid grid-cols-12 gap-2 text-xs text-muted-foreground px-1">
                <span className="col-span-5">Description</span>
                <span className="col-span-2">Qty</span>
                <span className="col-span-2">Unit Price</span>
                <span className="col-span-2">Tax</span>
                <span className="col-span-1" />
              </div>

              {lineItems.map((item, idx) => {
                const lineTotal = (parseFloat(item.quantity) || 0) * (parseFloat(item.unit_price) || 0);
                return (
                  <div key={idx} className="grid grid-cols-12 gap-2 items-center">
                    <div className="col-span-5">
                      <Input value={item.description} onChange={(e) => updateLine(idx, 'description', e.target.value)}
                        placeholder="Service description" className="text-sm" />
                    </div>
                    <div className="col-span-2">
                      <Input type="number" value={item.quantity} onChange={(e) => updateLine(idx, 'quantity', e.target.value)}
                        min="0.01" step="0.01" className="text-sm" />
                    </div>
                    <div className="col-span-2">
                      <Input type="number" value={item.unit_price} onChange={(e) => updateLine(idx, 'unit_price', e.target.value)}
                        placeholder="0.00" min="0" step="0.01" className="text-sm" />
                    </div>
                    <div className="col-span-2">
                      <select value={item.tax_code_id} onChange={(e) => updateLine(idx, 'tax_code_id', e.target.value)}
                        className="w-full text-xs border border-input rounded-lg px-2 py-1.5 outline-none focus:border-primary bg-card text-foreground">
                        <option value="">None</option>
                        {activeTaxCodes.map((t) => (
                          <option key={t.id} value={t.id}>{t.code} ({(Number(t.rate) * 100).toFixed(0)}%)</option>
                        ))}
                      </select>
                    </div>
                    <div className="col-span-1 flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">${lineTotal.toFixed(2)}</span>
                      {lineItems.length > 1 && (
                        <button onClick={() => removeLine(idx)} className="text-muted-foreground/40 hover:text-destructive ml-1">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="mt-4 flex flex-col gap-1 items-end text-sm">
              <div className="flex gap-8 text-muted-foreground">
                <span>Subtotal</span>
                <span className="font-medium text-foreground w-24 text-right">${subtotal.toFixed(2)}</span>
              </div>
              {taxTotal > 0 && (
                <div className="flex gap-8 text-muted-foreground">
                  <span>Tax</span>
                  <span className="font-medium text-foreground w-24 text-right">${taxTotal.toFixed(2)}</span>
                </div>
              )}
              <div className="flex gap-8 text-primary font-semibold">
                <span>Total</span>
                <span className="w-24 text-right">${total.toFixed(2)}</span>
              </div>
            </div>
          </div>

          <Separator />

          <div className="flex flex-col gap-1.5">
            <Label>Notes <span className="text-muted-foreground font-normal">(optional)</span></Label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              placeholder="Payment terms, bank details, etc."
              className="w-full text-sm border border-input rounded-lg px-3 py-2 outline-none focus:border-primary resize-none bg-card text-foreground placeholder:text-muted-foreground"
            />
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isPending}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={isPending}>
            {isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
            {editingInvoice ? 'Save Changes' : 'Create Invoice'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
