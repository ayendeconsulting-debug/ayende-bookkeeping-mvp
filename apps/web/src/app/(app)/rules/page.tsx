import { apiGet } from '@/lib/api';
import { ClassificationRule, Account } from '@/types';
import { RulesManager } from '@/components/rules-manager';

async function getRules(): Promise<ClassificationRule[]> {
  try {
    return await apiGet('/classification/rules');
  } catch {
    return [];
  }
}

async function getAccounts(): Promise<Account[]> {
  try {
    return await apiGet('/accounts?activeOnly=true');
  } catch {
    return [];
  }
}

export default async function RulesPage() {
  const [rules, accounts] = await Promise.all([getRules(), getAccounts()]);
  return <RulesManager initialRules={rules} accounts={accounts} />;
}
