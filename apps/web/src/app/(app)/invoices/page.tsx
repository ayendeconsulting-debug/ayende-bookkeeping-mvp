import { api } from '@/lib/api';
import { Invoice, Account, TaxCode } from '@/types';
import { InvoiceManager } from '@/components/invoice-manager';

interface InvoicesPageProps {
  searchParams: { status?: string; search?: string; page?: string };
}

export default async function InvoicesPage({ searchParams }: InvoicesPageProps) {
  const { status = 'all', search = '', page = '1' } = searchParams;
  const offset = (parseInt(page, 10) - 1) * 20;

  const params = new URLSearchParams({ status, limit: '20', offset: String(offset) });
  if (search) params.set('search', search);

  const [invoicesRes, accountsRes, taxCodesRes] = await Promise.allSettled([
    api<{ data: Invoice[]; total: number }>(`/invoices?${params}`),
    api<Account[]>('/accounts?activeOnly=true'),
    api<TaxCode[]>('/tax/codes'),
  ]);

  const invoices = invoicesRes.status === 'fulfilled' ? invoicesRes.value : { data: [], total: 0 };
  const accounts = accountsRes.status === 'fulfilled' ? accountsRes.value : [];
  const taxCodes = taxCodesRes.status === 'fulfilled' ? taxCodesRes.value : [];

  return (
    <InvoiceManager
      initialInvoices={invoices.data}
      totalCount={invoices.total}
      accounts={accounts}
      taxCodes={taxCodes}
      currentStatus={status}
      currentSearch={search}
      currentPage={parseInt(page, 10)}
    />
  );
}
