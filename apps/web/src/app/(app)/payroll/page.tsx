import { api } from '@/lib/api';
import { Account, JournalEntry } from '@/types';
import { PayrollWizard } from '@/components/payroll-wizard';

interface PayrollTemplate {
  country: string;
  deductions: Array<{
    key: string;
    label: string;
    description: string;
    typical_rate?: string;
  }>;
}

export default async function PayrollPage() {
  const [entriesRes, accountsRes, templateRes] = await Promise.allSettled([
    api<JournalEntry[]>('/payroll'),
    api<Account[]>('/accounts?activeOnly=true'),
    api<PayrollTemplate>('/payroll/template'),
  ]);

  const entries = entriesRes.status === 'fulfilled' ? entriesRes.value : [];
  const accounts = accountsRes.status === 'fulfilled' ? accountsRes.value : [];
  const template = templateRes.status === 'fulfilled'
    ? templateRes.value
    : { country: 'CA', deductions: [] };

  return (
    <PayrollWizard
      pastEntries={entries}
      accounts={accounts}
      template={template}
    />
  );
}
