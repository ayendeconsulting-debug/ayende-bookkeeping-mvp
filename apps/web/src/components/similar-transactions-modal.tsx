'use client';

import { useState, useTransition } from 'react';
import { X, CheckCircle2, Loader2, Wand2, Filter } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { bulkClassifyTransactions, createClassificationRule } from '@/app/(app)/transactions/actions';
import { toastSuccess, toastError } from '@/lib/toast';

interface SimilarTx {
  id: string;
  transaction_date: string;
  description: string;
  amount: number;
  source_account_name: string;
}

interface SimilarTransactionsModalProps {
  similar: SimilarTx[];
  keyword: string;
  suggested_account_id: string | null;
  suggested_account_name: string | null;
  suggested_account_code: string | null;
  suggested_source_account_id: string | null;
  onClose: () => void;
  onApplied: () => void;
}

export function SimilarTransactionsModal({
  similar,
  keyword,
  suggested_account_id,
  suggested_account_name,
  suggested_account_code,
  suggested_source_account_id,
  onClose,
  onApplied,
}: SimilarTransactionsModalProps) {
  const [isPending, start] = useTransition();
  const [isRulePending, startRule] = useTransition();
  const [selected, setSelected] = useState<Set<string>>(new Set(similar.map((t) => t.id)));
  const [ruleCreated, setRuleCreated] = useState(false);
  const [applied, setApplied] = useState(false);

  const allSelected = similar.every((t) => selected.has(t.id));

  function toggleAll() {
    if (allSelected) setSelected(new Set());
    else setSelected(new Set(similar.map((t) => t.id)));
  }

  function toggleOne(id: string) {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id); else next.add(id);
    setSelected(next);
  }

  function handleApply() {
    if (!suggested_account_id) { toastError('No account suggestion available.'); return; }
    if (selected.size === 0) { toastError('No transactions selected.'); return; }
    start(async () => {
      const result = await bulkClassifyTransactions({
        rawTransactionIds: Array.from(selected),
        accountId: suggested_account_id,
      });
      if (result.success && result.data) {
        toastSuccess(
          `${result.data.classified} classified`,
          `Applied "${suggested_account_name}" to ${result.data.classified} transactions.`,
        );
        setApplied(true);
        onApplied();
      } else {
        toastError('Classification failed', result.error ?? 'Please try again.');
      }
    });
  }

  function handleCreateRule() {
    if (!suggested_account_id) return;
    startRule(async () => {
      const result = await createClassificationRule({
        match_type: 'keyword',
        match_value: keyword,
        account_id: suggested_account_id,
        priority: 10,
      });
      if (result.success) {
        setRuleCreated(true);
        toastSuccess('Rule created', `Future transactions matching "${keyword}" will be auto-classified.`);
      } else {
        toastError('Rule creation failed', result.error ?? 'Please try again.');
      }
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/50">
      <div className="bg-card border border-border rounded-2xl w-full max-w-lg shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <div>
            <h2 className="text-sm font-semibold text-foreground">Similar transactions found</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              {similar.length} transaction{similar.length !== 1 ? 's' : ''} matching
              <span className="font-medium text-foreground"> "{keyword}"</span>
              {suggested_account_name && (
                <> · Suggested account: <span className="font-medium text-[#0F6E56]">{suggested_account_code} – {suggested_account_name}</span></>
              )}
            </p>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Transaction list */}
        <div className="max-h-64 overflow-y-auto">
          <div className="flex items-center gap-3 px-5 py-2.5 border-b border-border bg-muted/30">
            <input type="checkbox" checked={allSelected} onChange={toggleAll}
              className="rounded border-border cursor-pointer" />
            <span className="text-xs font-medium text-muted-foreground">
              {selected.size} of {similar.length} selected
            </span>
          </div>
          <div className="divide-y divide-border">
            {similar.map((tx) => (
              <label key={tx.id} className="flex items-center gap-3 px-5 py-2.5 cursor-pointer hover:bg-muted/30 transition-colors">
                <input type="checkbox" checked={selected.has(tx.id)}
                  onChange={() => toggleOne(tx.id)}
                  className="rounded border-border cursor-pointer flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-foreground truncate">{tx.description}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(tx.transaction_date).toLocaleDateString('en-CA', { month: 'short', day: 'numeric', year: '2-digit' })}
                  </p>
                </div>
                <span className={`text-xs font-semibold flex-shrink-0 ${tx.amount >= 0 ? 'text-[#0F6E56]' : 'text-foreground'}`}>
                  {tx.amount >= 0 ? '+' : ''}{formatCurrency(tx.amount)}
                </span>
              </label>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-2 px-5 py-4 border-t border-border">
          {applied ? (
            <div className="flex items-center gap-2 text-[#0F6E56] text-sm font-medium">
              <CheckCircle2 className="w-4 h-4" />
              Classifications applied successfully
            </div>
          ) : (
            <div className="flex items-center gap-2 flex-wrap">
              <button onClick={handleApply}
                disabled={isPending || selected.size === 0 || !suggested_account_id}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-[#0F6E56] text-white text-xs font-medium rounded-lg hover:bg-[#085041] transition-colors disabled:opacity-50">
                {isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Wand2 className="w-3.5 h-3.5" />}
                Apply to {selected.size} selected
              </button>

              {!ruleCreated && suggested_account_id && (
                <button onClick={handleCreateRule} disabled={isRulePending}
                  className="flex items-center gap-1.5 px-3 py-1.5 border border-border text-xs font-medium rounded-lg text-muted-foreground hover:text-foreground hover:border-[#0F6E56] transition-colors disabled:opacity-50">
                  {isRulePending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Filter className="w-3.5 h-3.5" />}
                  Create rule for "{keyword}"
                </button>
              )}
              {ruleCreated && (
                <span className="flex items-center gap-1.5 text-xs text-[#0F6E56] font-medium">
                  <CheckCircle2 className="w-3.5 h-3.5" />Rule created
                </span>
              )}

              <button onClick={onClose}
                className="ml-auto text-xs text-muted-foreground hover:text-foreground transition-colors">
                Dismiss
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
