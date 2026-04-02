import { apiGet } from '@/lib/api';
import { TaxCode, Account } from '@/types';
import { TaxCodesManager } from '@/components/tax-codes-manager';

async function getTaxCodes(): Promise<TaxCode[]> {
  try {
    return await apiGet('/tax/codes');
  } catch {
    return [];
  }
}

async function getTaxAccounts(): Promise<Account[]> {
  try {
    const accounts: Account[] = await apiGet('/accounts');
    // Only show tax_payable accounts as options
    return accounts.filter((a) => a.account_subtype === 'tax_payable' && a.is_active);
  } catch {
    return [];
  }
}

export default async function TaxPage() {
  const [taxCodes, taxAccounts] = await Promise.all([getTaxCodes(), getTaxAccounts()]);
  return <TaxCodesManager initialTaxCodes={taxCodes} taxAccounts={taxAccounts} />;
}
