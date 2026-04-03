import { apiGet } from '@/lib/api';
import { BudgetCategoryWithSpending } from '@/types';
import { BudgetCategoriesManager } from '@/components/budget-categories-manager';

async function getBudgetCategories(): Promise<BudgetCategoryWithSpending[]> {
  try {
    return await apiGet<BudgetCategoryWithSpending[]>('/personal/budget-categories');
  } catch {
    return [];
  }
}

export default async function BudgetPage() {
  const categories = await getBudgetCategories();

  return (
    <div className="p-6 max-w-screen-lg mx-auto">
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-gray-900">Budget</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Track your spending against monthly targets.
        </p>
      </div>
      <BudgetCategoriesManager initialCategories={categories} />
    </div>
  );
}
