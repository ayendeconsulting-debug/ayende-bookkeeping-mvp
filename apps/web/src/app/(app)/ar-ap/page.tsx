import { api } from '@/lib/api';
import { ArApRecord, Account } from '@/types';
import { ArApManager } from '@/components/ar-ap-manager';

interface ArApPageProps {
  searchParams: { type?: string; status?: string; page?: string };
}

export default async function ArApPage({ searchParams }: ArApPageProps) {
  const { type = 'all', status = 'all', page = '1' } = searchParams;
  const offset = (parseInt(page, 10) - 1) * 20;

  const params = new URLSearchParams({ type, status, limit: '20', offset: String(offset) });

  const [recordsRes, accountsRes] = await Promise.allSettled([
    api<{ data: ArApRecord[]; total: number }>(`/ar-ap?${params}`),
    api<Account[]>('/accounts?activeOnly=true'),
  ]);

  const records = recordsRes.status === 'fulfilled' ? recordsRes.value : { data: [], total: 0 };
  const accounts = accountsRes.status === 'fulfilled' ? accountsRes.value : [];

  return (
    <ArApManager
      initialRecords={records.data}
      totalCount={records.total}
      accounts={accounts}
      currentType={type}
      currentStatus={status}
      currentPage={parseInt(page, 10)}
    />
  );
}
