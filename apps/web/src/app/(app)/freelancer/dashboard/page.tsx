import { apiGet } from '@/lib/api';
import { IncomeStatement, TaxEstimateResult, Invoice, Business } from '@/types';
import { FreelancerDashboard } from '@/components/freelancer-dashboard';

async function getYtdStatement(): Promise<IncomeStatement | null> {
  try {
    const today = new Date();
    const startDate = `${today.getFullYear()}-01-01`;
    const endDate = today.toISOString().split('T')[0];
    return await apiGet<IncomeStatement>(
      `/reports/income-statement?startDate=${startDate}&endDate=${endDate}`,
    );
  } catch {
    return null;
  }
}

async function getMonthlyStatement(): Promise<IncomeStatement | null> {
  try {
    const today = new Date();
    const startDate = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-01`;
    const endDate = today.toISOString().split('T')[0];
    return await apiGet<IncomeStatement>(
      `/reports/income-statement?startDate=${startDate}&endDate=${endDate}`,
    );
  } catch {
    return null;
  }
}

async function getTaxEstimate(): Promise<TaxEstimateResult | null> {
  try {
    return await apiGet<TaxEstimateResult>('/freelancer/tax-estimate');
  } catch {
    return null;
  }
}

async function getInvoices(): Promise<Invoice[]> {
  try {
    const res = await apiGet<{ data: Invoice[]; total: number }>('/invoices');
    return res?.data ?? [];
  } catch {
    return [];
  }
}

async function getMyBusiness(): Promise<Business | null> {
  try {
    return await apiGet<Business>('/businesses/me');
  } catch {
    return null;
  }
}

export default async function FreelancerDashboardPage() {
  const [ytdStatement, monthlyStatement, taxEstimate, invoices, business] = await Promise.all([
    getYtdStatement(),
    getMonthlyStatement(),
    getTaxEstimate(),
    getInvoices(),
    getMyBusiness(),
  ]);

  return (
    <FreelancerDashboard
      ytdStatement={ytdStatement}
      monthlyStatement={monthlyStatement}
      taxEstimate={taxEstimate}
      invoices={invoices}
      business={business}
    />
  );
}
