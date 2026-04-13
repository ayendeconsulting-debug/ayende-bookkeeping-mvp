import { apiGet } from '@/lib/api';
import { PersonalRule, BudgetCategoryWithSpending } from '@/types';
import { PersonalRulesManager } from '@/components/personal-rules-manager';

async function getPersonalRules(): Promise<PersonalRule[]> {
  try {
    return await apiGet('/personal/rules');
  } catch {
    return [];
  }
}

async function getBudgetCategories(): Promise<BudgetCategoryWithSpending[]> {
  try {
    return await apiGet('/personal/budget-categories');
  } catch {
    return [];
  }
}

export default async function PersonalRulesPage() {
  const [rules, categories] = await Promise.all([getPersonalRules(), getBudgetCategories()]);
  return <PersonalRulesManager initialRules={rules} categories={categories} />;
}
