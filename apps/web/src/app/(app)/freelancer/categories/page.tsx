import { apiGet } from '@/lib/api';
import { Account } from '@/types';
import { FreelancerCategoriesManager } from '@/components/freelancer-categories-manager';

async function getAccounts(): Promise<Account[]> {
  try {
    return await apiGet<Account[]>('/accounts');
  } catch {
    return [];
  }
}

export default async function FreelancerCategoriesPage() {
  const accounts = await getAccounts();
  // Show only expense accounts — these are the "categories" for freelancers
  const expenseAccounts = accounts.filter((a) => a.account_type === 'expense' && a.is_active);

  return (
    <div className="p-6 max-w-screen-lg mx-auto">
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-gray-900">Expense Categories</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Manage the categories used when tagging your business expenses.
        </p>
      </div>
      <FreelancerCategoriesManager accounts={expenseAccounts} />
    </div>
  );
}
