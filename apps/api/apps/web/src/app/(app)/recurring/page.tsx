import { api } from '@/lib/api';
import { RecurringTransaction, Account } from '@/types';
import { RecurringManager } from '@/components/recurring-manager';

export default async function RecurringPage() {
  const [templatesRes, accountsRes] = await Promise.allSettled([
    api<RecurringTransaction[]>('/recurring'),
    api<Account[]>('/accounts?activeOnly=true'),
  ]);

  const templates = templatesRes.status === 'fulfilled' ? templatesRes.value : [];
  const accounts = accountsRes.status === 'fulfilled' ? accountsRes.value : [];

  return (
    <RecurringManager
      initialTemplates={templates}
      accounts={accounts}
    />
  );
}
