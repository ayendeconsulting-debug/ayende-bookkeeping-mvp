import { apiGet } from '@/lib/api';
import { SavingsGoalWithProgress } from '@/types';
import { SavingsGoalsManager } from '@/components/savings-goals-manager';

async function getSavingsGoals(): Promise<SavingsGoalWithProgress[]> {
  try { return await apiGet<SavingsGoalWithProgress[]>('/personal/savings-goals'); } catch { return []; }
}

export default async function GoalsPage() {
  const goals = await getSavingsGoals();
  return (
    <div className="p-6 max-w-screen-lg mx-auto">
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-foreground">Savings Goals</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Track your progress toward financial goals.</p>
      </div>
      <SavingsGoalsManager initialGoals={goals} />
    </div>
  );
}
