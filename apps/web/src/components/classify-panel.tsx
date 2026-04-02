'use client';

import { useState, useTransition } from 'react';
import { Sparkles, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';
import { Account, TaxCode, RawTransaction, AiClassificationSuggestion } from '@/types';
import { formatCurrency } from '@/lib/utils';
import { classifyTransaction, postTransaction, getAiSuggestion } from '@/app/(app)/transactions/actions';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';

interface ClassifyPanelProps {
  transaction: RawTransaction | null;
  accounts: Account[];
  taxCodes: TaxCode[];
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

type Step = 'classify' | 'post' | 'done';

export function ClassifyPanel({
  transaction,
  accounts,
  taxCodes,
  open,
  onClose,
  onSuccess,
}: ClassifyPanelProps) {
  const [step, setStep] = useState<Step>('classify');
  const [accountId, setAccountId] = useState('');
  const [sourceAccountId, setSourceAccountId] = useState('');
  const [taxCodeId, setTaxCodeId] = useState('');
  const [classifiedId, setClassifiedId] = useState('');
  const [error, setError] = useState('');
  const [aiSuggestion, setAiSuggestion] = useState<AiClassificationSuggestion | null>(null);
  const [isPending, startTransition] = useTransition();
  const [isAiLoading, setIsAiLoading] = useState(false);

  if (!transaction) return null;

  const bankAccounts = accounts.filter(
    (a) => a.account_subtype === 'bank' || a.account_subtype === 'credit_card',
  );
  const debitAccounts = accounts.filter(
    (a) => a.account_type === 'expense' || a.account_type === 'asset',
  );
  const activeTaxCodes = taxCodes.filter((t) => t.is_active);

  function handleClose() {
    setStep('classify');
    setAccountId('');
    setSourceAccountId('');
    setTaxCodeId('');
    setClassifiedId('');
    setError('');
    setAiSuggestion(null);
    onClose();
  }

  async function handleAiSuggest() {
    setIsAiLoading(true);
    setError('');
    if (!transaction) return;
    try {
      const result = await getAiSuggestion(transaction.id);
      if (result.success && result.data) {
        setAiSuggestion(result.data);
        if (result.data.suggested_account_id) {
          setAccountId(result.data.suggested_account_id);
        }
        if (result.data.suggested_tax_code_id) {
          setTaxCodeId(result.data.suggested_tax_code_id);
        }
      } else {
        setError(result.error ?? 'AI suggestion failed');
      }
    } catch {
      setError('AI suggestion unavailable');
    } finally {
      setIsAiLoading(false);
    }
  }

  function handleClassify() {
    if (!accountId || !sourceAccountId) {
      setError('Please select both a category account and a source account.');
      return;
    }
    setError('');
    startTransition(async () => {
      if (!transaction) return;
      const result = await classifyTransaction({
        rawTransactionId: transaction.id,
        accountId,
        sourceAccountId,
        taxCodeId: taxCodeId || undefined,
        classificationMethod: 'manual',
      });
      if (result.success) {
        setClassifiedId(result.data.id);
        setStep('post');
      } else {
        setError(result.error ?? 'Classification failed');
      }
    });
  }

  function handlePost() {
    startTransition(async () => {
      if (!transaction) return;
      const result = await postTransaction({
        classifiedId,
        sourceAccountId,
      });
      if (result.success) {
        setStep('done');
        setTimeout(() => {
          handleClose();
          onSuccess();
        }, 1200);
      } else {
        setError(result.error ?? 'Posting failed');
      }
    });
  }

  const amount = Number(transaction.amount);

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {step === 'classify' && 'Classify Transaction'}
            {step === 'post' && 'Post to Ledger'}
            {step === 'done' && 'Posted Successfully'}
          </DialogTitle>
          <DialogDescription>
            {step === 'classify' && 'Assign an account category to this transaction.'}
            {step === 'post' && 'Review and post the classified transaction.'}
            {step === 'done' && 'The transaction has been posted to the general ledger.'}
          </DialogDescription>
        </DialogHeader>

        {/* Done state */}
        {step === 'done' && (
          <div className="flex flex-col items-center py-6 gap-3">
            <CheckCircle2 className="w-12 h-12 text-primary" />
            <p className="text-sm text-gray-600">Transaction posted successfully</p>
          </div>
        )}

        {/* Classify / Post states */}
        {step !== 'done' && (
          <>
            {/* Transaction summary */}
            <div className="rounded-lg bg-gray-50 border border-gray-200 p-3 flex flex-col gap-1.5">
              <div className="flex justify-between items-start gap-2">
                <span className="text-sm font-medium text-gray-900 flex-1 leading-snug">
                  {transaction.description}
                </span>
                <span className={`text-sm font-semibold flex-shrink-0 ${amount >= 0 ? 'text-primary' : 'text-danger'}`}>
                  {amount >= 0 ? '+' : ''}{formatCurrency(amount)}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-400">
                  {new Date(transaction.transaction_date).toLocaleDateString('en-CA', {
                    month: 'long', day: 'numeric', year: 'numeric',
                  })}
                </span>
                {transaction.source_account_name && (
                  <>
                    <span className="text-xs text-gray-300">·</span>
                    <span className="text-xs text-gray-400">{transaction.source_account_name}</span>
                  </>
                )}
              </div>
            </div>

            {/* AI suggestion banner */}
            {aiSuggestion && (
              <Alert variant="info">
                <Sparkles className="w-4 h-4" />
                <AlertDescription>
                  <span className="font-medium">AI suggests:</span> {aiSuggestion.suggested_account_name}
                  {aiSuggestion.suggested_tax_code_name && ` with ${aiSuggestion.suggested_tax_code_name}`}
                  {' '}
                  <Badge variant="info" className="text-[10px] ml-1">
                    {aiSuggestion.confidence} confidence
                  </Badge>
                  <p className="text-xs mt-1 text-gray-500">{aiSuggestion.reasoning}</p>
                </AlertDescription>
              </Alert>
            )}

            <Separator />

            {step === 'classify' && (
              <div className="flex flex-col gap-4">
                {/* Debit account */}
                <div className="flex flex-col gap-1.5">
                  <Label>Category (debit account) *</Label>
                  <Select value={accountId} onValueChange={setAccountId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select expense or asset account…" />
                    </SelectTrigger>
                    <SelectContent>
                      {debitAccounts.map((a) => (
                        <SelectItem key={a.id} value={a.id}>
                          {a.account_code} — {a.account_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Source / credit account */}
                <div className="flex flex-col gap-1.5">
                  <Label>Source account (credit) *</Label>
                  <Select value={sourceAccountId} onValueChange={setSourceAccountId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select bank or credit card…" />
                    </SelectTrigger>
                    <SelectContent>
                      {bankAccounts.map((a) => (
                        <SelectItem key={a.id} value={a.id}>
                          {a.account_code} — {a.account_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Tax code (optional) */}
                {activeTaxCodes.length > 0 && (
                  <div className="flex flex-col gap-1.5">
                    <Label>Tax code <span className="text-gray-400 font-normal">(optional)</span></Label>
                    <Select value={taxCodeId} onValueChange={setTaxCodeId}>
                      <SelectTrigger>
                        <SelectValue placeholder="None" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">None</SelectItem>
                        {activeTaxCodes.map((t) => (
                          <SelectItem key={t.id} value={t.id}>
                            {t.code} — {t.name} ({(t.rate * 100).toFixed(0)}%)
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
            )}

            {step === 'post' && (
              <div className="flex flex-col gap-3">
                <div className="rounded-lg bg-gray-50 border border-gray-200 p-3 text-sm">
                  <div className="flex justify-between mb-1">
                    <span className="text-gray-500">Debit account</span>
                    <span className="text-gray-900 font-medium">
                      {accounts.find((a) => a.id === accountId)?.account_name ?? accountId}
                    </span>
                  </div>
                  <div className="flex justify-between mb-1">
                    <span className="text-gray-500">Credit account</span>
                    <span className="text-gray-900 font-medium">
                      {accounts.find((a) => a.id === sourceAccountId)?.account_name ?? sourceAccountId}
                    </span>
                  </div>
                  {taxCodeId && (
                    <div className="flex justify-between">
                      <span className="text-gray-500">Tax code</span>
                      <span className="text-gray-900 font-medium">
                        {taxCodes.find((t) => t.id === taxCodeId)?.code}
                      </span>
                    </div>
                  )}
                </div>
                <p className="text-xs text-gray-500">
                  Posting creates a balanced journal entry and moves this transaction to the general ledger. This action cannot be undone.
                </p>
              </div>
            )}

            {/* Error */}
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="w-4 h-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <DialogFooter>
              {step === 'classify' && (
                <>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleAiSuggest}
                    disabled={isAiLoading || isPending}
                  >
                    {isAiLoading ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
                    ) : (
                      <Sparkles className="w-3.5 h-3.5 mr-1.5" />
                    )}
                    AI Suggest
                  </Button>
                  <div className="flex-1" />
                  <Button variant="outline" onClick={handleClose} disabled={isPending}>
                    Cancel
                  </Button>
                  <Button onClick={handleClassify} disabled={isPending}>
                    {isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                    Classify
                  </Button>
                </>
              )}
              {step === 'post' && (
                <>
                  <Button
                    variant="outline"
                    onClick={() => setStep('classify')}
                    disabled={isPending}
                  >
                    Back
                  </Button>
                  <Button onClick={handlePost} disabled={isPending}>
                    {isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                    Post to Ledger
                  </Button>
                </>
              )}
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}


