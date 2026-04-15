'use client';

import { useState, useTransition } from 'react';
import { SavingsGoalWithProgress } from '@/types';
import { formatCurrency, cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import {
  createSavingsGoal,
  updateSavingsGoal,
  deleteSavingsGoal,
} from '@/app/(app)/personal/goals/actions';
import { toastSuccess, toastError } from '@/lib/toast';
import { Plus, Target, CheckCircle, Pause, Trash2 } from 'lucide-react';

interface SavingsGoalsManagerProps {
  initialGoals: SavingsGoalWithProgress[];
}

const EMPTY_FORM = { name: '', target_amount: '', current_amount: '', target_date: '' };

export function SavingsGoalsManager({ initialGoals }: SavingsGoalsManagerProps) {
  const [goals, setGoals] = useState(initialGoals);
  const [showForm, setShowForm] = useState(false);
  const [depositGoalId, setDepositGoalId] = useState<string | null>(null);
  const [depositAmount, setDepositAmount] = useState('');
  const [form, setForm] = useState(EMPTY_FORM);
  const [isPending, startTransition] = useTransition();

  function handleAdd() {
    if (!form.name.trim()) { toastError('Goal name is required.'); return; }
    const target = parseFloat(form.target_amount);
    if (isNaN(target) || target <= 0) { toastError('Enter a valid target amount.'); return; }
    const current = form.current_amount ? parseFloat(form.current_amount) : 0;

    startTransition(async () => {
      const result = await createSavingsGoal({
        name: form.name.trim(),
        target_amount: target,
        current_amount: current,
        target_date: form.target_date || undefined,
      });
      if (result.success && result.data) {
        const newGoal: SavingsGoalWithProgress = {
          ...result.data!,
          percentage_complete: target > 0 ? (current / target) * 100 : 0,
          projected_completion_date: null,
          required_monthly_contribution: null,
        };
        setGoals((prev) => [newGoal, ...prev]);
        setForm(EMPTY_FORM);
        setShowForm(false);
        toastSuccess(`Goal "${form.name}" created.`);
      } else {
        toastError(result.error ?? 'Failed to create goal.');
      }
    });
  }

  function handleDeposit(goal: SavingsGoalWithProgress) {
    const amount = parseFloat(depositAmount);
    if (isNaN(amount) || amount <= 0) { toastError('Enter a valid deposit amount.'); return; }
    const newCurrent = Number(goal.current_amount) + amount;

    startTransition(async () => {
      const result = await updateSavingsGoal(goal.id, { current_amount: newCurrent });
      if (result.success) {
        setGoals((prev) =>
          prev.map((g) =>
            g.id === goal.id
              ? {
                  ...g,
                  current_amount: newCurrent,
                  percentage_complete: parseFloat(
                    Math.min(100, (newCurrent / Number(g.target_amount)) * 100).toFixed(1),
                  ),
                }
              : g,
          ),
        );
        setDepositGoalId(null);
        setDepositAmount('');
        toastSuccess(`${formatCurrency(amount)} added to "${goal.name}".`);
      } else {
        toastError(result.error ?? 'Failed to update goal.');
      }
    });
  }

  function handleStatusToggle(goal: SavingsGoalWithProgress, status: string) {
    startTransition(async () => {
      const result = await updateSavingsGoal(goal.id, { status });
      if (result.success) {
        setGoals((prev) => prev.map((g) => (g.id === goal.id ? { ...g, status: status as any } : g)));
        toastSuccess(`Goal "${goal.name}" ${status}.`);
      } else {
        toastError(result.error ?? 'Failed to update goal.');
      }
    });
  }

  function handleDelete(id: string, name: string) {
    startTransition(async () => {
      const result = await deleteSavingsGoal(id);
      if (result.success) {
        setGoals((prev) => prev.filter((g) => g.id !== id));
        toastSuccess(`"${name}" deleted.`);
      } else {
        toastError(result.error ?? 'Failed to delete goal.');
      }
    });
  }

  const active    = goals.filter((g) => g.status === 'active');
  const completed = goals.filter((g) => g.status === 'completed');
  const paused    = goals.filter((g) => g.status === 'paused');

  return (
    <div className="flex flex-col gap-4">
      {/* Summary */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-5">
            <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">Active Goals</div>
            <div className="text-2xl font-semibold text-foreground">{active.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">Total Saved</div>
            <div className="text-2xl font-semibold text-primary">
              {formatCurrency(active.reduce((s, g) => s + Number(g.current_amount), 0))}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">Completed</div>
            <div className="text-2xl font-semibold text-foreground">{completed.length}</div>
          </CardContent>
        </Card>
      </div>

      {/* Add form */}
      {showForm && (
        <Card>
          <CardHeader className="pb-3"><CardTitle>New Savings Goal</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <Label>Goal Name</Label>
                <Input placeholder="e.g. Emergency Fund" value={form.name}
                  onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} className="mt-1" />
              </div>
              <div>
                <Label>Target Amount ($)</Label>
                <Input type="number" min="1" placeholder="10000" value={form.target_amount}
                  onChange={(e) => setForm((p) => ({ ...p, target_amount: e.target.value }))} className="mt-1" />
              </div>
              <div>
                <Label>Already Saved ($)</Label>
                <Input type="number" min="0" placeholder="0" value={form.current_amount}
                  onChange={(e) => setForm((p) => ({ ...p, current_amount: e.target.value }))} className="mt-1" />
              </div>
              <div>
                <Label>Target Date (optional)</Label>
                <Input type="date" value={form.target_date}
                  onChange={(e) => setForm((p) => ({ ...p, target_date: e.target.value }))} className="mt-1" />
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              <Button onClick={handleAdd} disabled={isPending}>
                {isPending ? 'Creating…' : 'Create Goal'}
              </Button>
              <Button variant="outline" onClick={() => { setShowForm(false); setForm(EMPTY_FORM); }}>Cancel</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Goal cards */}
      {active.length === 0 && !showForm ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Target className="w-10 h-10 text-muted-foreground/20 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground mb-4">No savings goals yet. Create your first goal to get started.</p>
            <Button onClick={() => setShowForm(true)}>
              <Plus className="w-4 h-4 mr-2" />Create Goal
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          {!showForm && (
            <div className="flex justify-end">
              <Button onClick={() => setShowForm(true)}>
                <Plus className="w-4 h-4 mr-2" />New Goal
              </Button>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            {active.map((goal) => (
              <GoalCard
                key={goal.id}
                goal={goal}
                depositGoalId={depositGoalId}
                depositAmount={depositAmount}
                isPending={isPending}
                onDepositOpen={() => { setDepositGoalId(goal.id); setDepositAmount(''); }}
                onDepositChange={setDepositAmount}
                onDepositSubmit={() => handleDeposit(goal)}
                onDepositCancel={() => setDepositGoalId(null)}
                onPause={() => handleStatusToggle(goal, 'paused')}
                onComplete={() => handleStatusToggle(goal, 'completed')}
                onDelete={() => handleDelete(goal.id, goal.name)}
              />
            ))}
          </div>

          {paused.length > 0 && (
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2 px-1">Paused</p>
              <div className="grid grid-cols-2 gap-4">
                {paused.map((goal) => (
                  <Card key={goal.id} className="opacity-60">
                    <CardContent className="pt-4">
                      <div className="flex justify-between items-start mb-2">
                        <span className="text-sm font-medium text-foreground">{goal.name}</span>
                        <div className="flex gap-1">
                          <button onClick={() => handleStatusToggle(goal, 'active')} className="text-xs text-primary underline">Resume</button>
                          <span className="text-border mx-1">·</span>
                          <button onClick={() => handleDelete(goal.id, goal.name)} className="text-xs text-muted-foreground hover:text-destructive">Delete</button>
                        </div>
                      </div>
                      <div className="h-2 bg-muted rounded-full overflow-hidden mb-1">
                        <div className="h-full bg-muted-foreground/40 rounded-full" style={{ width: `${goal.percentage_complete}%` }} />
                      </div>
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>{formatCurrency(Number(goal.current_amount))}</span>
                        <span>{formatCurrency(Number(goal.target_amount))}</span>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {completed.length > 0 && (
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2 px-1">Completed 🎉</p>
              <div className="grid grid-cols-2 gap-4">
                {completed.map((goal) => (
                  <Card key={goal.id} className="border-primary/20 bg-primary-light/20">
                    <CardContent className="pt-4">
                      <div className="flex items-center gap-2 mb-1">
                        <CheckCircle className="w-4 h-4 text-primary" />
                        <span className="text-sm font-medium text-foreground">{goal.name}</span>
                      </div>
                      <p className="text-xs text-muted-foreground">{formatCurrency(Number(goal.target_amount))} saved</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function GoalCard({
  goal, depositGoalId, depositAmount, isPending,
  onDepositOpen, onDepositChange, onDepositSubmit, onDepositCancel,
  onPause, onComplete, onDelete,
}: {
  goal: SavingsGoalWithProgress;
  depositGoalId: string | null;
  depositAmount: string;
  isPending: boolean;
  onDepositOpen: () => void;
  onDepositChange: (v: string) => void;
  onDepositSubmit: () => void;
  onDepositCancel: () => void;
  onPause: () => void;
  onComplete: () => void;
  onDelete: () => void;
}) {
  const isDepositing = depositGoalId === goal.id;

  return (
    <Card>
      <CardContent className="pt-5">
        <div className="flex items-start justify-between mb-3">
          <div>
            <p className="text-sm font-semibold text-foreground">{goal.name}</p>
            {goal.target_date && (
              <p className="text-xs text-muted-foreground mt-0.5">
                Target:{' '}
                {new Date(goal.target_date).toLocaleDateString('en-CA', { month: 'short', year: 'numeric' })}
              </p>
            )}
          </div>
          <span className={cn('text-sm font-bold', goal.percentage_complete >= 100 ? 'text-primary' : 'text-foreground')}>
            {goal.percentage_complete.toFixed(0)}%
          </span>
        </div>

        <div className="h-2.5 bg-muted rounded-full overflow-hidden mb-2">
          <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${goal.percentage_complete}%` }} />
        </div>

        <div className="flex justify-between text-xs text-muted-foreground mb-3">
          <span>{formatCurrency(Number(goal.current_amount))} saved</span>
          <span>{formatCurrency(Number(goal.target_amount))} goal</span>
        </div>

        {goal.required_monthly_contribution && (
          <p className="text-xs text-amber-600 bg-amber-50 dark:bg-amber-900/20 rounded px-2 py-1 mb-3">
            Save {formatCurrency(goal.required_monthly_contribution)}/mo to hit target date
          </p>
        )}

        {goal.projected_completion_date && !goal.required_monthly_contribution && (
          <p className="text-xs text-muted-foreground mb-3">
            Projected:{' '}
            {new Date(goal.projected_completion_date).toLocaleDateString('en-CA', { month: 'long', year: 'numeric' })}
          </p>
        )}

        {isDepositing ? (
          <div className="flex gap-2 mt-1">
            <Input type="number" min="0.01" step="0.01" placeholder="Amount $"
              value={depositAmount} onChange={(e) => onDepositChange(e.target.value)}
              className="h-8 text-sm" autoFocus />
            <Button size="sm" onClick={onDepositSubmit} disabled={isPending} className="h-8">Add</Button>
            <Button size="sm" variant="outline" onClick={onDepositCancel} className="h-8">Cancel</Button>
          </div>
        ) : (
          <div className="flex gap-2">
            <Button size="sm" onClick={onDepositOpen} className="flex-1 h-8 text-xs">+ Add Funds</Button>
            <button onClick={onPause} className="p-1.5 text-muted-foreground hover:text-amber-500 transition-colors" title="Pause">
              <Pause className="w-3.5 h-3.5" />
            </button>
            <button onClick={onComplete} className="p-1.5 text-muted-foreground hover:text-primary transition-colors" title="Mark complete">
              <CheckCircle className="w-3.5 h-3.5" />
            </button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <button className="p-1.5 text-muted-foreground hover:text-destructive transition-colors" title="Delete">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete "{goal.name}"?</AlertDialogTitle>
                  <AlertDialogDescription>This cannot be undone.</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={onDelete} className="bg-destructive hover:bg-destructive/90 text-destructive-foreground">Delete</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
