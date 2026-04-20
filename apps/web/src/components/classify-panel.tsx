'use client';

import { useState, useTransition } from 'react';
import { Sparkles, Loader2, AlertCircle, CheckCircle2, ArrowDownToLine, ArrowUpFromLine } from 'lucide-react';
import { Account, TaxCode, RawTransaction, AiClassificationSuggestion } from '@/types';
import { formatCurrency } from '@/lib/utils';
import { toastSuccess, toastError } from '@/lib/toast';
import { classifyTransaction, postTransaction, getAiSuggestion } from '@/app/(app)/transactions/actions';
import { AdminOnly } from '@/components/admin-only';
import { DocumentAttachments } from '@/components/document-attachments';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';

interface ClassifyPanelProps {
  transaction: RawTransaction | null;
  accounts: Account[];
  taxCodes: TaxCode[];
  open: boolean;
  onClose: () => void;
  onSuccess: (data?: { accountId?: string; sourceAccountId?: string }) => void;
  initialStep?: 'classify' | 'post';
  initialClassifiedId?: string;
  initialSourceAccountId?: string;
  initialAccountId?: string;
  initialOwnerContribution?: boolean;
}

type Step = 'classify' | 'post' | 'done';

export function ClassifyPanel({
  transaction, accounts, taxCodes, open, onClose, onSuccess,
  initialStep = 'classify', initialClassifiedId = '', initialSourceAccountId = '',
  initialAccountId = '', initialOwnerContribution = false,
}: ClassifyPanelProps) {
  const [step,              setStep]              = useState<Step>(initialStep);
  const [accountId,         setAccountId]         = useState(initialAccountId);
  const [sourceAccountId,   setSourceAccountId]   = useState(initialSourceAccountId);
  const [taxCodeId,         setTaxCodeId]         = useState('');
  const [classifiedId,      setClassifiedId]      = useState(initialClassifiedId);
  const [error,             setError]             = useState('');
  const [aiSuggestion,      setAiSuggestion]      = useState<AiClassificationSuggestion | null>(null);
  const [isPending,         startTransition]      = useTransition();
  const [isAiLoading,       setIsAiLoading]       = useState(false);
  const [ownerContribution, setOwnerContribution] = useState(initialOwnerContribution);
  const [ownerDraw,         setOwnerDraw]         = useState(false);

  if (!transaction) return null;

  const bankAccounts              = accounts.filter((a) => a.account_subtype === 'bank' || a.account_subtype === 'credit_card');
  const equityContributionAccounts = accounts.filter((a) => a.account_subtype === 'owner_contribution');
  const equityDrawAccounts        = accounts.filter((a) => a.account_subtype === 'owner_draw');
  const debitAccounts             = accounts.filter((a) => a.account_type === 'expense' || a.account_type === 'asset' || a.account_type === 'revenue');
  const activeTaxCodes            = taxCodes.filter((t) => t.is_active);
  const visibleSourceAccounts     = ownerContribution ? equityContributionAccounts : bankAccounts;
  const visibleDebitAccounts      = ownerDraw ? equityDrawAccounts : debitAccounts;

  function toggleOwnerContribution() {
    const next = !ownerContribution;
    setOwnerContribution(next);
    if (next) setOwnerDraw(false);
    setSourceAccountId(''); setAccountId('');
  }

  function toggleOwnerDraw() {
    const next = !ownerDraw;
    setOwnerDraw(next);
    if (next) setOwnerContribution(false);
    setSourceAccountId(''); setAccountId('');
  }

  function handleClose() {
    setStep(initialStep); setAccountId(initialAccountId); setSourceAccountId(initialSourceAccountId);
    setTaxCodeId(''); setClassifiedId(initialClassifiedId); setError(''); setAiSuggestion(null);
    setOwnerContribution(initialOwnerContribution); setOwnerDraw(false);
    onClose();
  }

  async function handleAiSuggest() {
    if (!transaction) return;
    setIsAiLoading(true); setError('');
    try {
      const result = await getAiSuggestion(transaction!.id);
      if (result.success && result.data) {
        setAiSuggestion(result.data);
        if (result.data.suggested_account_id) setAccountId(result.data.suggested_account_id);
        if (result.data.suggested_tax_code_id) setTaxCodeId(result.data.suggested_tax_code_id);
        toastSuccess('AI suggestion ready', 'Review and confirm before classifying.');
      } else {
        const msg = result.error ?? 'AI suggestion failed';
        setError(msg); toastError('AI suggestion failed', msg);
      }
    } catch {
      const msg = 'AI suggestion unavailable';
      setError(msg); toastError(msg);
    } finally {
      setIsAiLoading(false);
    }
  }

  function handleClassify() {
    if (!accountId || !sourceAccountId) { setError('Please select both a category account and a source account.'); return; }
    setError('');
    startTransition(async () => {
      const result = await classifyTransaction({
        rawTransactionId: transaction!.id, accountId, sourceAccountId,
        taxCodeId: taxCodeId && taxCodeId !== 'none' ? taxCodeId : undefined,
        classificationMethod: 'manual',
      });
      if (result.success) {
        setClassifiedId(result.data.id); setStep('post');
        toastSuccess('Transaction classified', 'Ready to post to the ledger.');
      } else {
        const msg = result.error ?? 'Classification failed';
        setError(msg); toastError('Classification failed', msg);
      }
    });
  }

  function handlePost() {
    const capturedAccountId = accountId;
    const capturedSourceId  = sourceAccountId;
    startTransition(async () => {
      const result = await postTransaction({ classifiedId, sourceAccountId });
      if (result.success) {
        setStep('done');
        toastSuccess('Posted to ledger', 'Journal entry created successfully.');
        setTimeout(() => { handleClose(); onSuccess({ accountId: capturedAccountId, sourceAccountId: capturedSourceId }); }, 1200);
      } else {
        const msg = result.error ?? 'Posting failed';
        setError(msg); toastError('Posting failed', msg);
      }
    });
  }

  const amount = Number(transaction.amount);
  const debitLabel       = ownerDraw ? 'Owner Draw account (debit) *' : 'Category (debit account) *';
  const debitPlaceholder = ownerDraw ? 'Select owner draw account…' : 'Select expense or asset account…';
  const sourceLabel       = ownerContribution ? 'Owner Contribution account (credit) *' : 'Source account (credit) *';
  const sourcePlaceholder = ownerContribution ? 'Select owner contribution account…' : 'Select bank or credit card…';

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {step === 'classify' && (ownerContribution ? 'Owner Contribution' : ownerDraw ? 'Owner Draw' : 'Classify Transaction')}
            {step === 'post'     && 'Post to Ledger'}
            {step === 'done'     && 'Posted Successfully'}
          </DialogTitle>
          <DialogDescription>
            {step === 'classify' && ownerContribution && 'Record a personal payment made on behalf of the business.'}
            {step === 'classify' && ownerDraw         && 'Record a withdrawal from the business by the owner.'}
            {step === 'classify' && !ownerContribution && !ownerDraw && 'Assign an account category to this transaction.'}
            {step === 'post'     && 'Review and post the classified transaction.'}
            {step === 'done'     && 'The transaction has been posted to the general ledger.'}
          </DialogDescription>
        </DialogHeader>

        {step === 'done' && (
          <div className="flex flex-col items-center py-6 gap-3">
            <CheckCircle2 className="w-12 h-12 text-accent-teal" />
            <p className="text-sm text-muted-foreground">Transaction posted successfully</p>
          </div>
        )}

        {step !== 'done' && (
          <>
            <div className="rounded-lg bg-muted border border-border p-3 flex flex-col gap-1.5">
              <div className="flex justify-between items-start gap-2">
                <span className="text-sm font-medium text-foreground flex-1 leading-snug">{transaction.description}</span>
                <span className={`text-sm font-semibold flex-shrink-0 ${amount >= 0 ? 'text-accent-teal' : 'text-accent-coral'}`}>
                  {amount >= 0 ? '+' : ''}{formatCurrency(amount)}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">
                  {new Date(transaction.transaction_date).toLocaleDateString('en-CA', { month: 'long', day: 'numeric', year: 'numeric' })}
                </span>
                {transaction.source_account_name && (
                  <>
                    <span className="text-xs text-border">·</span>
                    <span className="text-xs text-muted-foreground">{transaction.source_account_name}</span>
                  </>
                )}
              </div>
            </div>

            {aiSuggestion && (
              <Alert variant="info">
                <Sparkles className="w-4 h-4" />
                <AlertDescription>
                  <span className="font-medium">AI suggests:</span> {aiSuggestion.suggested_account_name}
                  {aiSuggestion.suggested_tax_code_name && ` with ${aiSuggestion.suggested_tax_code_name}`}
                  {' '}
                  <Badge variant="info" className="text-[10px] ml-1">{aiSuggestion.confidence} confidence</Badge>
                  <p className="text-xs mt-1 text-muted-foreground">{aiSuggestion.reasoning}</p>
                </AlertDescription>
              </Alert>
            )}

            <Separator />

            {step === 'classify' && (
              <div className="flex flex-col gap-4">
                <div className="flex gap-2">
                  <button type="button" onClick={toggleOwnerContribution}
                    className={cn(
                      'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors',
                      ownerContribution
                        ? 'bg-emerald-50 border-emerald-300 text-emerald-700 dark:bg-emerald-900/30 dark:border-emerald-700 dark:text-emerald-400'
                        : 'bg-card border-border text-muted-foreground hover:border-border/80',
                    )}>
                    <ArrowDownToLine className="w-3.5 h-3.5" />Owner Contribution
                  </button>
                  <button type="button" onClick={toggleOwnerDraw}
                    className={cn(
                      'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors',
                      ownerDraw
                        ? 'bg-amber-50 border-amber-300 text-amber-700 dark:bg-amber-900/30 dark:border-amber-700 dark:text-amber-400'
                        : 'bg-card border-border text-muted-foreground hover:border-border/80',
                    )}>
                    <ArrowUpFromLine className="w-3.5 h-3.5" />Owner Draw
                  </button>
                </div>

                {ownerContribution && (
                  <p className="text-xs text-emerald-600 dark:text-emerald-400 -mt-2">
                    Owner Contribution: Debit expense/asset → Credit owner equity. Select the equity contribution account below.
                  </p>
                )}
                {ownerDraw && (
                  <p className="text-xs text-amber-600 dark:text-amber-400 -mt-2">
                    Owner Draw: Debit owner draw equity → Credit bank. Select the equity draw account below.
                  </p>
                )}

                <div className="flex flex-col gap-1.5">
                  <Label>{debitLabel}</Label>
                  <Select value={accountId} onValueChange={setAccountId}>
                    <SelectTrigger><SelectValue placeholder={debitPlaceholder} /></SelectTrigger>
                    <SelectContent>
                      {visibleDebitAccounts.map((a) => (
                        <SelectItem key={a.id} value={a.id}>{a.account_code} - {a.account_name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex flex-col gap-1.5">
                  <Label>{sourceLabel}</Label>
                  <Select value={sourceAccountId} onValueChange={setSourceAccountId}>
                    <SelectTrigger><SelectValue placeholder={sourcePlaceholder} /></SelectTrigger>
                    <SelectContent>
                      {visibleSourceAccounts.map((a) => (
                        <SelectItem key={a.id} value={a.id}>{a.account_code} - {a.account_name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {activeTaxCodes.length > 0 && (
                  <div className="flex flex-col gap-1.5">
                    <Label>Tax code <span className="text-muted-foreground font-normal">(optional)</span></Label>
                    <Select value={taxCodeId} onValueChange={setTaxCodeId}>
                      <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">None</SelectItem>
                        {activeTaxCodes.map((t) => (
                          <SelectItem key={t.id} value={t.id}>{t.code} - {t.name} ({(t.rate * 100).toFixed(0)}%)</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <Separator />
                <DocumentAttachments rawTransactionId={transaction?.id ?? ''} />
              </div>
            )}

            {step === 'post' && (
              <div className="flex flex-col gap-3">
                {(ownerContribution || ownerDraw) && (
                  <div className={cn(
                    'rounded-lg px-3 py-2 text-xs font-medium flex items-center gap-1.5',
                    ownerContribution
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800'
                      : 'bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800',
                  )}>
                    {ownerContribution
                      ? <><ArrowDownToLine className="w-3.5 h-3.5" /> Owner Contribution entry</>
                      : <><ArrowUpFromLine className="w-3.5 h-3.5" /> Owner Draw entry</>}
                  </div>
                )}
                <div className="rounded-lg bg-muted border border-border p-3 text-sm" style={{ borderLeft: "2px solid var(--de-accent-teal)" }}>
                  <div className="flex justify-between mb-1">
                    <span className="text-muted-foreground">Debit account</span>
                    <span className="text-foreground font-medium">{accounts.find((a) => a.id === accountId)?.account_name ?? accountId}</span>
                  </div>
                  <div className="flex justify-between mb-1 items-center">
                    <span className="text-muted-foreground">Credit account</span>
                    {sourceAccountId ? (
                      <span className="text-foreground font-medium">{accounts.find((a) => a.id === sourceAccountId)?.account_name ?? sourceAccountId}</span>
                    ) : (
                      <Select value={sourceAccountId} onValueChange={setSourceAccountId}>
                        <SelectTrigger className="w-48 h-7 text-xs"><SelectValue placeholder="Select account..." /></SelectTrigger>
                        <SelectContent>
                          {bankAccounts.map((a) => (
                            <SelectItem key={a.id} value={a.id}>{a.account_code} - {a.account_name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  </div>
                  {taxCodeId && taxCodeId !== 'none' && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Tax code</span>
                      <span className="text-foreground font-medium">{taxCodes.find((t) => t.id === taxCodeId)?.code}</span>
                    </div>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">Posting creates a balanced journal entry. This action cannot be undone.</p>
              </div>
            )}

            {error && (
              <Alert variant="destructive">
                <AlertCircle className="w-4 h-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <DialogFooter>
              {step === 'classify' && (
                <>
                  <AdminOnly>
                    <Button variant="ghost" size="sm" onClick={handleAiSuggest} disabled={isAiLoading || isPending}>
                      {isAiLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" /> : <Sparkles className="w-3.5 h-3.5 mr-1.5" />}
                      AI Suggest
                    </Button>
                  </AdminOnly>
                  <div className="flex-1" />
                  <Button variant="outline" onClick={handleClose} disabled={isPending}>Cancel</Button>
                  <AdminOnly fallback={<Button disabled>Classify</Button>}>
                    <Button onClick={handleClassify} disabled={isPending}>
                      {isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                      {ownerContribution ? 'Record Contribution' : ownerDraw ? 'Record Draw' : 'Classify'}
                    </Button>
                  </AdminOnly>
                </>
              )}
              {step === 'post' && (
                <>
                  <Button variant="outline" onClick={() => setStep('classify')} disabled={isPending}>Back</Button>
                  <AdminOnly fallback={<Button disabled>Post to Ledger</Button>}>
                    <Button onClick={handlePost} disabled={isPending}>
                      {isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                      Post to Ledger
                    </Button>
                  </AdminOnly>
                </>
              )}
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
