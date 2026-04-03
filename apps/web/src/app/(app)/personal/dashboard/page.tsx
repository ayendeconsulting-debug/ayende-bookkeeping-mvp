import { apiGet } from '@/lib/api';
import {
  BudgetCategoryWithSpending,
  SavingsGoalWithProgress,
  NetWorthResult,
  IncomeStatement,
  Business,
  ConfirmedRecurring,
  UpcomingRemindersResult,
} from '@/types';
import { PersonalDashboard } from '@/components/personal-dashboard';

async function getBudgetCategories(): Promise<BudgetCategoryWithSpending[]> {
  try { return await apiGet<BudgetCategoryWithSpending[]>('/personal/budget-categories'); }
  catch { return []; }
}
async function getSavingsGoals(): Promise<SavingsGoalWithProgress[]> {
  try { return await apiGet<SavingsGoalWithProgress[]>('/personal/savings-goals'); }
  catch { return []; }
}
async function getNetWorth(): Promise<NetWorthResult | null> {
  try { return await apiGet<NetWorthResult>('/personal/net-worth'); }
  catch { return null; }
}
async function getMonthlyStatement(): Promise<IncomeStatement | null> {
  try {
    const today = new Date();
    const startDate = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-01`;
    const endDate = today.toISOString().split('T')[0];
    return await apiGet<IncomeStatement>(`/reports/income-statement?startDate=${startDate}&endDate=${endDate}`);
  } catch { return null; }
}
async function getMyBusiness(): Promise<Business | null> {
  try { return await apiGet<Business>('/businesses/me'); }
  catch { return null; }
}
async function getConfirmedRecurring(): Promise<ConfirmedRecurring[]> {
  try { return await apiGet<ConfirmedRecurring[]>('/personal/recurring-confirmed'); }
  catch { return []; }
}
async function getUpcomingReminders(): Promise<UpcomingRemindersResult | null> {
  try { return await apiGet<UpcomingRemindersResult>('/personal/upcoming-reminders'); }
  catch { return null; }
}

export default async function PersonalDashboardPage() {
  const [
    budgetCategories, savingsGoals, netWorth,
    monthlyStatement, business, confirmedRecurring, upcomingReminders,
  ] = await Promise.all([
    getBudgetCategories(), getSavingsGoals(), getNetWorth(),
    getMonthlyStatement(), getMyBusiness(), getConfirmedRecurring(), getUpcomingReminders(),
  ]);

  return (
    <PersonalDashboard
      budgetCategories={budgetCategories}
      savingsGoals={savingsGoals}
      netWorth={netWorth}
      monthlyStatement={monthlyStatement}
      business={business}
      confirmedRecurring={confirmedRecurring}
      upcomingReminders={upcomingReminders}
    />
  );
}
