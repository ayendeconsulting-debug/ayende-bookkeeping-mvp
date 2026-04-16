import { apiGet } from '@/lib/api';
import { BudgetCategoryWithSpending } from '@/types';
import { BudgetCategoriesManager } from '@/components/budget-categories-manager';

async function getBudgetCategories(): Promise<BudgetCategoryWithSpending[]> {
  try { return await apiGet<BudgetCategoryWithSpending[]>('/personal/budget-categories'); } catch { return []; }
}

export default async function FreelancerCategoriesPage() {
  const categories = await getBudgetCategories();
  return (
    <div className="p-6 max-w-screen-lg mx-auto">
      <div className="mb-6 pl-4" style={{ borderLeft: '3px solid #2563eb' }}>
        <h1 className="text-xl font-semibold text-foreground">Categories</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Manage expense and income categories for tracking your personal transactions.</p>
      </div>
      <BudgetCategoriesManager initialCategories={categories} />
    </div>
  );
}
