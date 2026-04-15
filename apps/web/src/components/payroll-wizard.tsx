'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, ChevronRight, ChevronLeft, CheckCircle2, Loader2, AlertCircle, Users } from 'lucide-react';
import { Account, JournalEntry } from '@/types';
import { postPayroll } from '@/app/(app)/payroll/actions';
import { toastSuccess, toastError } from '@/lib/toast';
import { AdminOnly } from '@/components/admin-only';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { formatCurrency } from '@/lib/utils';

interface DeductionTemplate {
  key: string;
  label: string;
  description: string;
  typical_rate?: string;
}

interface PayrollTemplate {
  country: string;
  deductions: DeductionTemplate[];
}

interface PayrollWizardProps {
  pastEntries: JournalEntry[];
  accounts: Account[];
  template: PayrollTemplate;
}

interface DeductionState {
  key: string;
  label: string;
  amount: string;
  account_id: string;
}

export function PayrollWizard({ pastEntries, accounts, template }: PayrollWizardProps) {
  const router = useRouter();
  const [showWizard, setShowWizard] = useState(false);
  const [step, setStep] = useState<1 | 2>(1);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const today = new Date().toISOString().split('T')[0];

  const [payrollPeriod, setPayrollPeriod] = useState('');
  const [payDate, setPayDate] = useState(today);
  const [grossWages, setGrossWages] = useState('');
  const [wagesAccountId, setWagesAccountId] = useState('');
  const [bankAccountId, setBankAccountId] = useState('');
  const [deductions, setDeductions] = useState<DeductionState[]>(
    template.deductions.map((d) => ({ key: d.key, label: d.label, amount: '', account_id: '' })),
  );
  const [notes, setNotes] = useState('');

  const wageAccounts      = accounts.filter((a) => a.account_type === 'expense');
  const bankAccounts      = accounts.filter((a) => a.account_subtype === 'bank' || a.account_subtype === 'credit_card');
  const liabilityAccounts = accounts.filter((a) => a.account_type === 'liability');

  function updateDeduction(idx: number, field: 'amount' | 'account_id', value: string) {
    setDeductions((prev) => prev.map((d, i) => (i === idx ? { ...d, [field]: value } : d)));
  }

  const grossNum        = parseFloat(grossWages) || 0;
  const totalDeductions = deductions.reduce((s, d) => s + (parseFloat(d.amount) || 0), 0);
  const netPay          = parseFloat((grossNum - totalDeductions).toFixed(2));

  function validateStep1(): string | null {
    if (!payrollPeriod.trim()) return 'Payroll period is required.';
    if (!payDate) return 'Pay date is required.';
    if (!grossWages || grossNum <= 0) return 'Gross wages must be greater than zero.';
    if (!wagesAccountId) return 'Select a wages expense account.';
    if (!bankAccountId) return 'Select a bank account for net pay.';
    if (netPay < 0) return `Deductions ($${totalDeductions.toFixed(2)}) exceed gross wages.`;
    return null;
  }

  function handleNext() {
    const err = validateStep1();
    if (err) { setError(err); return; }
    setError(null);
    setStep(2);
  }

  function handlePost() {
    setError(null);
    startTransition(async () => {
      const result = await postPayroll({
        payroll_period: payrollPeriod.trim(),
        pay_date: payDate,
        gross_wages: grossNum,
        wages_account_id: wagesAccountId,
        bank_account_id: bankAccountId,
        deductions: deductions
          .filter((d) => parseFloat(d.amount) > 0 && d.account_id)
          .map((d) => ({ label: d.label, amount: parseFloat(d.amount), account_id: d.account_id })),
        notes: notes || undefined,
      });

      if (result.success) {
        toastSuccess('Payroll posted', `${payrollPeriod} — ${formatCurrency(grossNum)} gross`);
        setShowWizard(false);
        setStep(1);
        setPayrollPeriod('');
        setGrossWages('');
        setDeductions(template.deductions.map((d) => ({ key: d.key, label: d.label, amount: '', account_id: '' })));
        router.refresh();
      } else {
        const msg = result.error ?? 'Failed to post payroll entry';
        setError(msg);
        toastError('Payroll failed', msg);
      }
    });
  }

  const previewLines = [
    {
      account: accounts.find((a) => a.id === wagesAccountId)?.account_name ?? 'Wages Expense',
      debit: grossNum, credit: 0,
      description: `Gross wages – ${payrollPeriod}`,
    },
    ...deductions
      .filter((d) => parseFloat(d.amount) > 0 && d.account_id)
      .map((d) => ({
        account: accounts.find((a) => a.id === d.account_id)?.account_name ?? d.label,
        debit: 0, credit: parseFloat(d.amount),
        description: `${d.label} – ${payrollPeriod}`,
      })),
    {
      account: accounts.find((a) => a.id === bankAccountId)?.account_name ?? 'Bank',
      debit: 0, credit: netPay,
      description: `Net pay – ${payrollPeriod}`,
    },
  ];

  const isBalanced = previewLines.reduce((s, l) => s + l.debit - l.credit, 0) === 0;

  const selectClass = 'w-full text-sm border border-input rounded-lg px-3 py-2 outline-none focus:border-primary bg-card text-foreground';

  return (
    <div className="p-6 max-w-screen-lg mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Payroll</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {template.country === 'CA' ? '🇨🇦 Canadian payroll (CPP, EI)' : '🇺🇸 US payroll (FICA)'}
            {' · '}{pastEntries.length} past {pastEntries.length === 1 ? 'entry' : 'entries'}
          </p>
        </div>
        <AdminOnly>
          <Button onClick={() => { setShowWizard(true); setStep(1); }} className="flex items-center gap-2">
            <Plus className="w-4 h-4" />New Payroll Entry
          </Button>
        </AdminOnly>
      </div>

      {/* Wizard */}
      {showWizard && (
        <Card className="mb-6 border-primary/20">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <Users className="w-4 h-4 text-primary" />
                {step === 1 ? 'Step 1 — Enter Payroll Amounts' : 'Step 2 — Review & Post'}
              </CardTitle>
              <div className="flex items-center gap-1.5">
                <div className={`w-2 h-2 rounded-full ${step >= 1 ? 'bg-primary' : 'bg-muted'}`} />
                <div className={`w-2 h-2 rounded-full ${step >= 2 ? 'bg-primary' : 'bg-muted'}`} />
              </div>
            </div>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">

            {step === 1 && (
              <>
                <div className="grid grid-cols-3 gap-3">
                  <div className="flex flex-col gap-1.5 col-span-2">
                    <Label>Payroll Period *</Label>
                    <Input value={payrollPeriod} onChange={(e) => setPayrollPeriod(e.target.value)}
                      placeholder="e.g. April 2026 or 2026-Q1" />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label>Pay Date *</Label>
                    <Input type="date" value={payDate} onChange={(e) => setPayDate(e.target.value)} />
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <Label>Gross Wages *</Label>
                  <Input type="number" value={grossWages} onChange={(e) => setGrossWages(e.target.value)}
                    placeholder="0.00" min="0.01" step="0.01" />
                </div>

                <Separator />

                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Deductions</p>
                  <div className="flex flex-col gap-3">
                    {deductions.map((d, idx) => {
                      const tmpl = template.deductions[idx];
                      return (
                        <div key={d.key} className="grid grid-cols-5 gap-3 items-end">
                          <div className="col-span-2 flex flex-col gap-1">
                            <Label className="text-xs">
                              {d.label}
                              {tmpl?.typical_rate && (
                                <span className="text-muted-foreground font-normal ml-1">({tmpl.typical_rate})</span>
                              )}
                            </Label>
                            <Input type="number" value={d.amount}
                              onChange={(e) => updateDeduction(idx, 'amount', e.target.value)}
                              placeholder="0.00" min="0" step="0.01" />
                          </div>
                          <div className="col-span-3 flex flex-col gap-1">
                            <Label className="text-xs">Liability Account</Label>
                            <select value={d.account_id}
                              onChange={(e) => updateDeduction(idx, 'account_id', e.target.value)}
                              className={selectClass}>
                              <option value="">Select account…</option>
                              {liabilityAccounts.map((a) => (
                                <option key={a.id} value={a.id}>{a.account_code} – {a.account_name}</option>
                              ))}
                            </select>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <Separator />

                <div className="rounded-lg bg-muted border border-border px-4 py-3 flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Net Pay (calculated)</span>
                  <span className={`text-sm font-semibold ${netPay < 0 ? 'text-destructive' : 'text-primary'}`}>
                    {formatCurrency(netPay)}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1.5">
                    <Label>Wages Expense Account *</Label>
                    <select value={wagesAccountId} onChange={(e) => setWagesAccountId(e.target.value)} className={selectClass}>
                      <option value="">Select account…</option>
                      {wageAccounts.map((a) => (
                        <option key={a.id} value={a.id}>{a.account_code} – {a.account_name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label>Bank Account (net pay) *</Label>
                    <select value={bankAccountId} onChange={(e) => setBankAccountId(e.target.value)} className={selectClass}>
                      <option value="">Select account…</option>
                      {bankAccounts.map((a) => (
                        <option key={a.id} value={a.id}>{a.account_code} – {a.account_name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <Label>Notes <span className="text-muted-foreground font-normal">(optional)</span></Label>
                  <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="e.g. Semi-monthly payroll run" />
                </div>

                {error && (
                  <div className="flex items-center gap-1.5 text-sm text-destructive">
                    <AlertCircle className="w-4 h-4" />{error}
                  </div>
                )}

                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setShowWizard(false)}>Cancel</Button>
                  <Button onClick={handleNext} className="flex items-center gap-1.5">
                    Review <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </>
            )}

            {step === 2 && (
              <>
                <div className="rounded-lg border border-border overflow-hidden">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-muted border-b border-border">
                        <th className="text-left px-4 py-2 text-xs font-medium text-muted-foreground">Account</th>
                        <th className="text-right px-4 py-2 text-xs font-medium text-muted-foreground">Debit</th>
                        <th className="text-right px-4 py-2 text-xs font-medium text-muted-foreground">Credit</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {previewLines.map((line, idx) => (
                        <tr key={idx}>
                          <td className="px-4 py-2.5">
                            <div className="font-medium text-foreground">{line.account}</div>
                            <div className="text-xs text-muted-foreground">{line.description}</div>
                          </td>
                          <td className="px-4 py-2.5 text-right font-mono text-sm">
                            {line.debit > 0 ? formatCurrency(line.debit) : '—'}
                          </td>
                          <td className="px-4 py-2.5 text-right font-mono text-sm">
                            {line.credit > 0 ? formatCurrency(line.credit) : '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="bg-muted border-t border-border font-medium">
                        <td className="px-4 py-2 text-sm">
                          {isBalanced ? (
                            <span className="flex items-center gap-1.5 text-primary">
                              <CheckCircle2 className="w-4 h-4" />Balanced
                            </span>
                          ) : (
                            <span className="flex items-center gap-1.5 text-destructive">
                              <AlertCircle className="w-4 h-4" />Not balanced
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-2 text-right font-mono text-sm">{formatCurrency(grossNum)}</td>
                        <td className="px-4 py-2 text-right font-mono text-sm">{formatCurrency(totalDeductions + netPay)}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>

                <p className="text-xs text-muted-foreground">
                  This will create a posted journal entry. This action cannot be undone.
                </p>

                {error && (
                  <div className="flex items-center gap-1.5 text-sm text-destructive">
                    <AlertCircle className="w-4 h-4" />{error}
                  </div>
                )}

                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setStep(1)} disabled={isPending}>
                    <ChevronLeft className="w-4 h-4 mr-1" />Back
                  </Button>
                  <Button onClick={handlePost} disabled={isPending || !isBalanced}>
                    {isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                    Post Payroll Entry
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      )}

      {/* Past payroll entries */}
      <div>
        <h2 className="text-sm font-semibold text-foreground mb-3">Payroll History</h2>
        {pastEntries.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12 text-center">
              <Users className="w-8 h-8 text-muted-foreground/30 mb-3" />
              <p className="text-sm text-muted-foreground">No payroll entries yet.</p>
              <p className="text-xs text-muted-foreground mt-1">Click "New Payroll Entry" to post your first payroll run.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="flex flex-col gap-2">
            {pastEntries.map((entry) => (
              <div key={entry.id} className="flex items-center justify-between rounded-lg border border-border bg-card px-4 py-3">
                <div>
                  <div className="text-sm font-medium text-foreground">{entry.description}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    {new Date(entry.entry_date).toLocaleDateString('en-CA', {
                      year: 'numeric', month: 'long', day: 'numeric',
                    })}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium text-foreground">
                    {formatCurrency(
                      entry.journal_lines?.find((l) => Number(l.debit_amount) > 0)
                        ? Number(entry.journal_lines.find((l) => Number(l.debit_amount) > 0)!.debit_amount)
                        : 0,
                    )}
                  </span>
                  <Badge variant="posted">Posted</Badge>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
