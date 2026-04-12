import { apiGet } from '@/lib/api';
import { ClassificationRule, Account, TaxCode } from '@/types';
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

async function getTaxCodes(): Promise<TaxCode[]> {
  try {
    return await apiGet('/tax/codes');
  } catch {
    return [];
  }
}

export default async function RulesPage() {
  const [rules, accounts, taxCodes] = await Promise.all([getRules(), getAccounts(), getTaxCodes()]);
  return <RulesManager initialRules={rules} accounts={accounts} taxCodes={taxCodes} />;
}
