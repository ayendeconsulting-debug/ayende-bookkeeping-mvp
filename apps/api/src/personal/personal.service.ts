import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { BudgetCategory } from '../entities/budget-category.entity';
import { PersonalRule } from '../entities/personal-rule.entity';
import { SavingsGoal } from '../entities/savings-goal.entity';
import {
  CreateBudgetCategoryDto,
  UpdateBudgetCategoryDto,
  CreateSavingsGoalDto,
  UpdateSavingsGoalDto,
  ConfirmDetectionDto,
  CreatePersonalRuleDto,
  UpdatePersonalRuleDto,
} from './dto/personal.dto';

const DEFAULT_EXPENSE_CATEGORIES = [
  { name: 'Housing',          color: '#6366f1' },
  { name: 'Food & Groceries', color: '#22c55e' },
  { name: 'Transportation',   color: '#f59e0b' },
  { name: 'Utilities',        color: '#3b82f6' },
  { name: 'Healthcare',       color: '#ef4444' },
  { name: 'Entertainment',    color: '#a855f7' },
  { name: 'Shopping',         color: '#ec4899' },
  { name: 'Dining Out',       color: '#f97316' },
  { name: 'Subscriptions',    color: '#0ea5e9' },
  { name: 'Personal Care',    color: '#14b8a6' },
  { name: 'Education',        color: '#84cc16' },
  { name: 'Savings',          color: '#0F6E56' },
  { name: 'Other',            color: '#9ca3af' },
];

const DEFAULT_INCOME_CATEGORIES = [
  { name: 'Employment Income',   color: '#0F6E56' },
  { name: 'Government Benefits', color: '#3b82f6' },
  { name: 'Investment Income',   color: '#a855f7' },
  { name: 'Other Income',        color: '#9ca3af' },
];

export interface RecurringCandidate {
  key: string;
  merchant: string;
  amount: number;
  frequency: string;
  last_date: string;
  next_date: string;
  occurrence_count: number;
  type: string;
}

export interface ConfirmedRecurring extends RecurringCandidate {
  is_due_soon: boolean;
}

export interface UpcomingReminder {
  key: string;
  merchant: string;
  amount: number;
  frequency: string;
  due_date: string;
  type: string;
  days_until: number;
  is_due_soon: boolean;
}

export interface UpcomingRemindersResult {
  reminders: UpcomingReminder[];
  total_due_7_days: number;
  total_due_30_days: number;
  current_balance: number;
  balance_warning: boolean;
  balance_shortfall: number;
}

export interface PersonalCashflow {
  money_in: number;
  money_out: number;
  net: number;
  start_date: string;
  end_date: string;
}

@Injectable()
export class PersonalService {
  constructor(
    @InjectRepository(BudgetCategory)
    private readonly budgetCategoryRepo: Repository<BudgetCategory>,
    @InjectRepository(SavingsGoal)
    private readonly savingsGoalRepo: Repository<SavingsGoal>,
    @InjectRepository(PersonalRule)
    private readonly personalRuleRepo: Repository<PersonalRule>,
    private readonly dataSource: DataSource,
  ) {}

  // â”€â”€ Budget Categories â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  async getBudgetCategories(businessId: string) {
    const count = await this.budgetCategoryRepo.count({ where: { business_id: businessId } });
    const incomeCount = await this.budgetCategoryRepo.count({ where: { business_id: businessId, category_type: 'income' } });
    if (count === 0) await this.seedDefaultCategories(businessId);
    else if (incomeCount === 0) await this.seedIncomeCategories(businessId);

    const categories = await this.budgetCategoryRepo.find({
      where: { business_id: businessId, is_active: true },
      order: { sort_order: 'ASC' },
    });

    const today = new Date();
    const monthStart = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-01`;
    const monthEnd = today.toISOString().split('T')[0];

    // â”€â”€ Primary: explicit personal_category_id assignments â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    const assignedRows = await this.dataSource.query(
      `SELECT rt.personal_category_id AS category_id,
              SUM(ABS(rt.amount)) AS total_spent
       FROM raw_transactions rt
       WHERE rt.business_id = $1
         AND rt.transaction_date BETWEEN $2 AND $3
         AND rt.amount < 0
         AND rt.status != 'ignored'
         AND rt.personal_category_id IS NOT NULL
       GROUP BY rt.personal_category_id`,
      [businessId, monthStart, monthEnd],
    );

    const assignedMap: Record<string, number> = {};
    for (const row of assignedRows) {
      assignedMap[row.category_id] = Number(row.total_spent);
    }

    // Income aggregation for income categories
    const incomeRows = await this.dataSource.query(
      `SELECT rt.personal_category_id AS category_id,
              SUM(rt.amount) AS total_income
       FROM raw_transactions rt
       WHERE rt.business_id = $1
         AND rt.transaction_date BETWEEN $2 AND $3
         AND rt.amount > 0
         AND rt.status != 'ignored'
         AND rt.personal_category_id IS NOT NULL
       GROUP BY rt.personal_category_id`,
      [businessId, monthStart, monthEnd],
    );
    const incomeMap: Record<string, number> = {};
    for (const row of incomeRows) {
      incomeMap[row.category_id] = Number(row.total_income);
    }

    // â”€â”€ Secondary: plaid_category fuzzy match for unassigned transactions â”€
    const spendingRows = await this.dataSource.query(
      `SELECT LOWER(COALESCE(plaid_category, 'other')) AS cat,
              SUM(ABS(amount)) AS total_spent
       FROM raw_transactions
       WHERE business_id = $1
         AND transaction_date BETWEEN $2 AND $3
         AND amount < 0
         AND status != 'ignored'
         AND personal_category_id IS NULL
       GROUP BY LOWER(COALESCE(plaid_category, 'other'))`,
      [businessId, monthStart, monthEnd],
    );

    const spendingMap: Record<string, number> = {};
    for (const row of spendingRows) spendingMap[row.cat] = Number(row.total_spent);

    return categories.map((cat) => {
      const isIncomeCat = cat.category_type === 'income';
            const assignedSpend = isIncomeCat ? (incomeMap[cat.id] ?? 0) : (assignedMap[cat.id] ?? 0);
      const catLower = cat.name.toLowerCase();
      let fuzzySpend = 0;
      for (const [plaidCat, amount] of Object.entries(spendingMap)) {
        if (plaidCat.includes(catLower) || catLower.includes(plaidCat)) fuzzySpend += amount;
      }
      const spent = assignedSpend + fuzzySpend;
      const target = cat.monthly_target ? Number(cat.monthly_target) : null;
      const remaining = target !== null ? Math.max(0, target - spent) : null;
      const over_budget = target !== null && spent > target;
      const percentage_spent = target !== null && target > 0
        ? parseFloat(Math.min(100, (spent / target) * 100).toFixed(1)) : null;
      return { ...cat, spent_this_month: parseFloat(spent.toFixed(2)), remaining, over_budget, percentage_spent };
    });
  }

  async createBudgetCategory(businessId: string, dto: CreateBudgetCategoryDto) {
    const maxOrder = await this.budgetCategoryRepo
      .createQueryBuilder('bc').where('bc.business_id = :businessId', { businessId })
      .select('MAX(bc.sort_order)', 'max').getRawOne();
    const cat = this.budgetCategoryRepo.create({
      business_id: businessId, name: dto.name,
      category_type: dto.category_type ?? 'expense',
      monthly_target: dto.monthly_target ?? null, color: dto.color ?? '#9ca3af',
      is_system: false, is_active: true, sort_order: (Number(maxOrder?.max) || 0) + 1,
    });
    return this.budgetCategoryRepo.save(cat);
  }

  async updateBudgetCategory(businessId: string, id: string, dto: UpdateBudgetCategoryDto) {
    const cat = await this.budgetCategoryRepo.findOne({ where: { id, business_id: businessId } });
    if (!cat) throw new NotFoundException(`Budget category ${id} not found`);
    if (dto.name !== undefined) cat.name = dto.name;
    if (dto.monthly_target !== undefined) cat.monthly_target = dto.monthly_target ?? null;
    if (dto.color !== undefined) cat.color = dto.color;
    if (dto.sort_order !== undefined) cat.sort_order = dto.sort_order;
    return this.budgetCategoryRepo.save(cat);
  }

  async deleteBudgetCategory(businessId: string, id: string) {
    const cat = await this.budgetCategoryRepo.findOne({ where: { id, business_id: businessId } });
    if (!cat) throw new NotFoundException(`Budget category ${id} not found`);
    if (cat.is_system) throw new BadRequestException('System categories cannot be deleted');
    cat.is_active = false;
    await this.budgetCategoryRepo.save(cat);
    return { deleted: true };
  }

  // â”€â”€ Phase 17: Personal Cashflow â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  // Reads raw_transactions directly â€” no journal entries required.

  async getCashflow(businessId: string, startDate: string, endDate: string): Promise<PersonalCashflow> {
    const rows = await this.dataSource.query(
      `SELECT
         COALESCE(SUM(CASE WHEN amount > 0 THEN amount ELSE 0 END), 0)  AS money_in,
         COALESCE(SUM(CASE WHEN amount < 0 THEN ABS(amount) ELSE 0 END), 0) AS money_out
       FROM raw_transactions
       WHERE business_id = $1
         AND transaction_date BETWEEN $2 AND $3
         AND status != 'ignored'`,
      [businessId, startDate, endDate],
    );
    const money_in  = parseFloat(Number(rows[0]?.money_in  ?? 0).toFixed(2));
    const money_out = parseFloat(Number(rows[0]?.money_out ?? 0).toFixed(2));
    return {
      money_in,
      money_out,
      net: parseFloat((money_in - money_out).toFixed(2)),
      start_date: startDate,
      end_date: endDate,
    };
  }

  // â”€â”€ Phase 17: Assign Personal Category â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  async assignPersonalCategory(
    businessId: string,
    transactionId: string,
    categoryId: string | null,
  ) {
    const rows = await this.dataSource.query(
      `SELECT id FROM raw_transactions WHERE id = $1 AND business_id = $2 LIMIT 1`,
      [transactionId, businessId],
    );
    if (!rows.length) {
      throw new NotFoundException(`Transaction ${transactionId} not found`);
    }
    if (categoryId !== null) {
      const catRows = await this.dataSource.query(
        `SELECT id FROM budget_categories WHERE id = $1 AND business_id = $2 AND is_active = true LIMIT 1`,
        [categoryId, businessId],
      );
      if (!catRows.length) {
        throw new BadRequestException(`Budget category ${categoryId} not found for this business`);
      }
    }
    await this.dataSource.query(
      `UPDATE raw_transactions SET personal_category_id = $1, updated_at = NOW() WHERE id = $2`,
      [categoryId, transactionId],
    );
    const updated = await this.dataSource.query(
      `SELECT * FROM raw_transactions WHERE id = $1 LIMIT 1`,
      [transactionId],
    );
    return updated[0];
  }

  // â”€â”€ Savings Goals â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  async getSavingsGoals(businessId: string) {
    const goals = await this.savingsGoalRepo.find({
      where: { business_id: businessId }, order: { created_at: 'DESC' },
    });
    return goals.map((goal) => {
      const current = Number(goal.current_amount);
      const target = Number(goal.target_amount);
      const percentage_complete = target > 0
        ? parseFloat(Math.min(100, (current / target) * 100).toFixed(1)) : 0;
      const createdAt = new Date(goal.created_at);
      const now = new Date();
      const monthsElapsed = Math.max(1,
        (now.getFullYear() - createdAt.getFullYear()) * 12 + (now.getMonth() - createdAt.getMonth()));
      const monthlyRate = current / monthsElapsed;
      let projected_completion_date: string | null = null;
      if (current >= target) {
        projected_completion_date = now.toISOString().split('T')[0];
      } else if (monthlyRate > 0) {
        const projDate = new Date();
        projDate.setMonth(projDate.getMonth() + Math.ceil((target - current) / monthlyRate));
        projected_completion_date = projDate.toISOString().split('T')[0];
      }
      let required_monthly_contribution: number | null = null;
      if (goal.target_date && current < target) {
        const targetDate = new Date(goal.target_date as any);
        const monthsRemaining = Math.max(1,
          (targetDate.getFullYear() - now.getFullYear()) * 12 + (targetDate.getMonth() - now.getMonth()));
        required_monthly_contribution = parseFloat(((target - current) / monthsRemaining).toFixed(2));
      }
      return { ...goal, percentage_complete, projected_completion_date, required_monthly_contribution };
    });
  }

  async createSavingsGoal(businessId: string, dto: CreateSavingsGoalDto) {
    const goal = this.savingsGoalRepo.create({
      business_id: businessId, name: dto.name, target_amount: dto.target_amount,
      current_amount: dto.current_amount ?? 0, target_date: dto.target_date as any ?? null,
      linked_account_id: dto.linked_account_id ?? null, status: 'active' as any,
    });
    return this.savingsGoalRepo.save(goal);
  }

  async updateSavingsGoal(businessId: string, id: string, dto: UpdateSavingsGoalDto) {
    const goal = await this.savingsGoalRepo.findOne({ where: { id, business_id: businessId } });
    if (!goal) throw new NotFoundException(`Savings goal ${id} not found`);
    if (dto.name !== undefined) goal.name = dto.name;
    if (dto.target_amount !== undefined) goal.target_amount = dto.target_amount;
    if (dto.current_amount !== undefined) goal.current_amount = dto.current_amount;
    if (dto.target_date !== undefined) goal.target_date = dto.target_date as any;
    if (dto.status !== undefined) goal.status = dto.status as any;
    return this.savingsGoalRepo.save(goal);
  }

  async deleteSavingsGoal(businessId: string, id: string) {
    const goal = await this.savingsGoalRepo.findOne({ where: { id, business_id: businessId } });
    if (!goal) throw new NotFoundException(`Savings goal ${id} not found`);
    await this.savingsGoalRepo.remove(goal);
    return { deleted: true };
  }

  // â”€â”€ Net Worth â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  async getNetWorth(businessId: string) {
    const plaidAccounts = await this.dataSource.query(
      `SELECT pa.name, pa.type, pa.subtype,
              COALESCE(pa.current_balance, 0) AS current_balance, pa.iso_currency_code AS currency_code
       FROM plaid_accounts pa
       INNER JOIN plaid_items pi ON pi.id = pa.plaid_item_id
       WHERE pi.business_id = $1 AND pi.is_deleted = false
       ORDER BY pa.type, pa.name`,
      [businessId],
    );
    const coaBalances = await this.dataSource.query(
      `SELECT a.name AS account_name, a.account_type, a.account_subtype,
              COALESCE(SUM(jl.debit_amount - jl.credit_amount), 0) AS balance
       FROM accounts a
       LEFT JOIN journal_lines jl ON jl.account_id = a.id
       LEFT JOIN journal_entries je ON je.id = jl.journal_entry_id AND je.status = 'posted'
       WHERE a.business_id = $1 AND a.account_type IN ('asset','liability') AND a.is_active = true
       GROUP BY a.id, a.name, a.account_type, a.account_subtype
       ORDER BY a.account_type, a.name`,
      [businessId],
    );
    const ASSET_TYPES = ['depository', 'investment', 'other'];
    const LIABILITY_TYPES = ['credit', 'loan'];
    const plaidAssets = plaidAccounts.filter((a: any) => ASSET_TYPES.includes(a.type));
    const plaidLiabilities = plaidAccounts.filter((a: any) => LIABILITY_TYPES.includes(a.type));
    const plaidAssetTotal = plaidAssets.reduce((s: number, a: any) => s + Math.max(0, Number(a.current_balance)), 0);
    const plaidLiabilityTotal = plaidLiabilities.reduce((s: number, a: any) => s + Math.abs(Number(a.current_balance)), 0);
    const coaAssets = coaBalances.filter((a: any) => a.account_type === 'asset');
    const coaLiabilities = coaBalances.filter((a: any) => a.account_type === 'liability');
    const coaAssetTotal = coaAssets.reduce((s: number, a: any) => s + Math.max(0, Number(a.balance)), 0);
    const coaLiabilityTotal = coaLiabilities.reduce((s: number, a: any) => s + Math.abs(Number(a.balance)), 0);
    const totalAssets = plaidAssetTotal + coaAssetTotal;
    const totalLiabilities = plaidLiabilityTotal + coaLiabilityTotal;
    return {
      net_worth: parseFloat((totalAssets - totalLiabilities).toFixed(2)),
      total_assets: parseFloat(totalAssets.toFixed(2)),
      total_liabilities: parseFloat(totalLiabilities.toFixed(2)),
      plaid_assets: plaidAssets, plaid_liabilities: plaidLiabilities,
      coa_assets: coaAssets, coa_liabilities: coaLiabilities,
    };
  }

  // â”€â”€ Recurring Detection â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  async detectRecurringPayments(businessId: string): Promise<RecurringCandidate[]> {
    const settings = await this.getSettings(businessId);
    const confirmedKeys = new Set((settings.confirmed_detections ?? []).map((c: any) => c.key));
    const dismissedKeys = new Set(settings.dismissed_detections ?? []);
    const twelveMonthsAgo = new Date();
    twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);
    const rows = await this.dataSource.query(
      `SELECT LOWER(TRIM(description)) AS norm_desc, description,
              transaction_date::text AS transaction_date, ABS(amount) AS amount
       FROM raw_transactions
       WHERE business_id = $1 AND source = 'plaid' AND amount < 0
         AND status != 'ignored' AND transaction_date >= $2
       ORDER BY LOWER(TRIM(description)), transaction_date ASC LIMIT 1000`,
      [businessId, twelveMonthsAgo.toISOString().split('T')[0]],
    );
    const groups: Record<string, { desc: string; dates: string[]; amounts: number[] }> = {};
    for (const row of rows) {
      const key = row.norm_desc.substring(0, 80);
      if (!groups[key]) groups[key] = { desc: row.description, dates: [], amounts: [] };
      groups[key].dates.push(row.transaction_date);
      groups[key].amounts.push(Number(row.amount));
    }
    const candidates: RecurringCandidate[] = [];
    for (const [key, group] of Object.entries(groups)) {
      if (group.dates.length < 3) continue;
      if (confirmedKeys.has(key) || dismissedKeys.has(key)) continue;
      const intervals: number[] = [];
      for (let i = 1; i < group.dates.length; i++) {
        const days = Math.round((new Date(group.dates[i]).getTime() - new Date(group.dates[i - 1]).getTime()) / 86400000);
        if (days > 0) intervals.push(days);
      }
      if (intervals.length === 0) continue;
      const avgInterval = intervals.reduce((s, v) => s + v, 0) / intervals.length;
      const intervalStdDev = Math.sqrt(intervals.reduce((s, v) => s + Math.pow(v - avgInterval, 2), 0) / intervals.length);
      const intervalVariance = avgInterval > 0 ? intervalStdDev / avgInterval : 1;
      const avgAmount = group.amounts.reduce((s, v) => s + v, 0) / group.amounts.length;
      const amountVariance = avgAmount > 0 ? (Math.max(...group.amounts) - Math.min(...group.amounts)) / avgAmount : 1;
      if (intervalVariance > 0.3 || amountVariance > 0.15) continue;
      let frequency: string | null = null;
      if (avgInterval >= 5 && avgInterval <= 9) frequency = 'weekly';
      else if (avgInterval >= 25 && avgInterval <= 35) frequency = 'monthly';
      else if (avgInterval >= 80 && avgInterval <= 100) frequency = 'quarterly';
      else if (avgInterval >= 345 && avgInterval <= 385) frequency = 'annually';
      if (!frequency) continue;
      const lastDate = group.dates[group.dates.length - 1].split('T')[0];
      candidates.push({
        key, merchant: group.desc, amount: parseFloat(avgAmount.toFixed(2)),
        frequency, last_date: lastDate, next_date: this.calculateNextDate(lastDate, frequency),
        occurrence_count: group.dates.length, type: this.classifyMerchantType(group.desc),
      });
    }
    return candidates.sort((a, b) => b.amount - a.amount);
  }

  async confirmDetection(businessId: string, dto: ConfirmDetectionDto): Promise<void> {
    const settings = await this.getSettings(businessId);
    const confirmed: any[] = settings.confirmed_detections ?? [];
    const filtered = confirmed.filter((c: any) => c.key !== dto.key);
    filtered.push({ key: dto.key, merchant: dto.merchant, amount: dto.amount,
      frequency: dto.frequency, last_date: dto.last_date, next_date: dto.next_date,
      type: dto.type, occurrence_count: dto.occurrence_count });
    await this.mergeSettings(businessId, { confirmed_detections: filtered });
  }

  async dismissDetection(businessId: string, key: string): Promise<void> {
    const settings = await this.getSettings(businessId);
    const dismissed: string[] = settings.dismissed_detections ?? [];
    if (!dismissed.includes(key)) dismissed.push(key);
    await this.mergeSettings(businessId, { dismissed_detections: dismissed });
  }

  async getConfirmedRecurring(businessId: string): Promise<ConfirmedRecurring[]> {
    const settings = await this.getSettings(businessId);
    const confirmed: any[] = settings.confirmed_detections ?? [];
    return confirmed.map((c) => ({
      ...c,
      next_date: this.calculateNextDate(c.last_date, c.frequency),
      is_due_soon: this.isDueSoon(c.last_date, c.frequency),
    }));
  }

  // â”€â”€ Upcoming Reminders â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  async getUpcomingReminders(businessId: string): Promise<UpcomingRemindersResult> {
    const settings = await this.getSettings(businessId);
    const confirmed: any[] = settings.confirmed_detections ?? [];
    const snoozed: any[] = settings.snoozed_reminders ?? [];
    const dismissed: any[] = settings.dismissed_reminders_personal ?? [];

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const snoozedSet = new Set(
      snoozed
        .filter((s: any) => new Date(s.snoozed_until) > today)
        .map((s: any) => `${s.key}::${s.due_date}`),
    );
    const dismissedSet = new Set(dismissed.map((d: any) => `${d.key}::${d.due_date}`));

    const reminders: UpcomingReminder[] = [];
    for (const payment of confirmed) {
      const dueDates = this.projectDueDates(payment.last_date, payment.frequency, 30);
      for (const dueDate of dueDates) {
        const compositeKey = `${payment.key}::${dueDate}`;
        if (snoozedSet.has(compositeKey) || dismissedSet.has(compositeKey)) continue;
        const daysUntil = Math.round((new Date(dueDate).getTime() - today.getTime()) / 86400000);
        reminders.push({
          key: payment.key, merchant: payment.merchant, amount: payment.amount,
          frequency: payment.frequency, due_date: dueDate, type: payment.type,
          days_until: daysUntil, is_due_soon: daysUntil <= 3,
        });
      }
    }
    reminders.sort((a, b) => a.days_until - b.days_until);

    const total_due_7_days = reminders.filter((r) => r.days_until <= 7).reduce((s, r) => s + r.amount, 0);
    const total_due_30_days = reminders.reduce((s, r) => s + r.amount, 0);

    const balanceRows = await this.dataSource.query(
      `SELECT COALESCE(SUM(COALESCE(pa.current_balance, 0)), 0) AS total
       FROM plaid_accounts pa
       INNER JOIN plaid_items pi ON pi.id = pa.plaid_item_id
       WHERE pi.business_id = $1 AND pi.is_deleted = false AND pa.type = 'depository'`,
      [businessId],
    );
    const current_balance = Number(balanceRows[0]?.total ?? 0);
    const balance_warning = current_balance > 0 && total_due_7_days > current_balance;
    const balance_shortfall = balance_warning ? parseFloat((total_due_7_days - current_balance).toFixed(2)) : 0;

    return {
      reminders,
      total_due_7_days: parseFloat(total_due_7_days.toFixed(2)),
      total_due_30_days: parseFloat(total_due_30_days.toFixed(2)),
      current_balance: parseFloat(current_balance.toFixed(2)),
      balance_warning, balance_shortfall,
    };
  }

  async snoozeReminder(businessId: string, key: string, due_date: string, snoozed_until: string): Promise<void> {
    const settings = await this.getSettings(businessId);
    const snoozed: any[] = settings.snoozed_reminders ?? [];
    const filtered = snoozed.filter((s: any) => !(s.key === key && s.due_date === due_date));
    filtered.push({ key, due_date, snoozed_until });
    await this.mergeSettings(businessId, { snoozed_reminders: filtered });
  }

  async dismissReminder(businessId: string, key: string, due_date: string): Promise<void> {
    const settings = await this.getSettings(businessId);
    const dismissed: any[] = settings.dismissed_reminders_personal ?? [];
    const exists = dismissed.some((d: any) => d.key === key && d.due_date === due_date);
    if (!exists) dismissed.push({ key, due_date });
    await this.mergeSettings(businessId, { dismissed_reminders_personal: dismissed });
  }

  // â”€â”€ Private helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  private projectDueDates(lastDate: string, frequency: string, daysAhead: number): string[] {
    const dates: string[] = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() + daysAhead);
    const current = new Date(lastDate);
    let safety = 0;
    while (current < today && safety < 500) { this.advanceDate(current, frequency); safety++; }
    let collected = 0;
    while (current <= cutoff && collected < 10) {
      dates.push(current.toISOString().split('T')[0]);
      this.advanceDate(current, frequency);
      collected++;
    }
    return dates;
  }

  private advanceDate(date: Date, frequency: string): void {
    switch (frequency) {
      case 'weekly':    date.setDate(date.getDate() + 7); break;
      case 'monthly':   date.setMonth(date.getMonth() + 1); break;
      case 'quarterly': date.setMonth(date.getMonth() + 3); break;
      case 'annually':  date.setFullYear(date.getFullYear() + 1); break;
    }
  }

  private async getSettings(businessId: string): Promise<Record<string, any>> {
    const rows = await this.dataSource.query(
      'SELECT settings FROM businesses WHERE id = $1 LIMIT 1',
      [businessId],
    );
    return rows[0]?.settings ?? {};
  }

  private async mergeSettings(businessId: string, patch: Record<string, any>): Promise<void> {
    await this.dataSource.query(
      `UPDATE businesses SET settings = settings || $2::jsonb WHERE id = $1`,
      [businessId, JSON.stringify(patch)],
    );
  }

  private calculateNextDate(lastDate: string, frequency: string): string {
    const date = new Date(lastDate);
    this.advanceDate(date, frequency);
    return date.toISOString().split('T')[0];
  }

  private isDueSoon(lastDate: string, frequency: string): boolean {
    const nextDate = new Date(this.calculateNextDate(lastDate, frequency));
    const daysUntil = Math.round((nextDate.getTime() - Date.now()) / 86400000);
    return daysUntil >= 0 && daysUntil <= 7;
  }

  private classifyMerchantType(description: string): string {
    const d = description.toLowerCase();
    if (d.includes('netflix') || d.includes('spotify') || d.includes('disney') ||
        d.includes('apple') || d.includes('youtube') || d.includes('hulu') ||
        d.includes('amazon prime') || d.includes('subscription')) return 'subscription';
    if (d.includes('rent') || d.includes('mortgage')) return 'housing';
    if (d.includes('insurance')) return 'insurance';
    if (d.includes('gym') || d.includes('fitness')) return 'fitness';
    if (d.includes('phone') || d.includes('internet') || d.includes('cable') ||
        d.includes('hydro') || d.includes('utility') || d.includes('bell') ||
        d.includes('rogers') || d.includes('telus')) return 'utilities';
    return 'recurring';
  }

  private async seedIncomeCategories(businessId: string): Promise<void> {
    const maxOrder = await this.budgetCategoryRepo
      .createQueryBuilder('bc').where('bc.business_id = :businessId', { businessId })
      .select('MAX(bc.sort_order)', 'max').getRawOne();
    const incomeCats = DEFAULT_INCOME_CATEGORIES.map((c, i) =>
      this.budgetCategoryRepo.create({
        business_id: businessId, name: c.name, color: c.color,
        category_type: 'income',
        monthly_target: null, is_system: true, is_active: true,
        sort_order: (Number(maxOrder?.max) || 0) + i + 1,
      }),
    );
    await this.budgetCategoryRepo.save(incomeCats);
  }

  // â”€â”€ Personal Classification Rules â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  async getPersonalRules(businessId: string) {
    return this.personalRuleRepo.find({
      where: { business_id: businessId, is_active: true },
      order: { priority: 'ASC' },
    });
  }

  async createPersonalRule(businessId: string, dto: CreatePersonalRuleDto) {
    const rule = this.personalRuleRepo.create({
      business_id: businessId,
      match_type: dto.match_type,
      match_value: dto.match_value,
      budget_category_id: dto.budget_category_id,
      priority: dto.priority ?? 10,
      is_active: true,
    });
    return this.personalRuleRepo.save(rule);
  }

  async updatePersonalRule(businessId: string, id: string, dto: UpdatePersonalRuleDto) {
    const rule = await this.personalRuleRepo.findOne({ where: { id, business_id: businessId } });
    if (!rule) throw new NotFoundException(`Personal rule ${id} not found`);
    if (dto.match_value !== undefined) rule.match_value = dto.match_value;
    if (dto.budget_category_id !== undefined) rule.budget_category_id = dto.budget_category_id;
    if (dto.priority !== undefined) rule.priority = dto.priority;
    if (dto.is_active !== undefined) rule.is_active = dto.is_active;
    return this.personalRuleRepo.save(rule);
  }

  async deletePersonalRule(businessId: string, id: string) {
    const rule = await this.personalRuleRepo.findOne({ where: { id, business_id: businessId } });
    if (!rule) throw new NotFoundException(`Personal rule ${id} not found`);
    rule.is_active = false;
    await this.personalRuleRepo.save(rule);
    return { deleted: true };
  }

  async runPersonalRules(businessId: string): Promise<{ matched: number; skipped: number }> {
    const rules = await this.personalRuleRepo.find({
      where: { business_id: businessId, is_active: true },
      order: { priority: 'ASC' },
    });
    if (rules.length === 0) return { matched: 0, skipped: 0 };

    // Fetch pending personal-tagged transactions with no category assigned
    const txs = await this.dataSource.query(
      `SELECT id, description FROM raw_transactions
       WHERE business_id = $1
         AND status = 'pending'
         AND personal_category_id IS NULL
         AND status != 'ignored'`,
      [businessId],
    );

    let matched = 0;
    let skipped = 0;

    for (const tx of txs) {
      const desc: string = (tx.description ?? '').toLowerCase();
      let assigned = false;

      for (const rule of rules) {
        const val = rule.match_value.toLowerCase();
        const hits =
          rule.match_type === 'keyword' ? desc.includes(val) :
          rule.match_type === 'vendor'  ? desc === val :
          false;

        if (hits) {
          await this.dataSource.query(
            `UPDATE raw_transactions SET personal_category_id = $1, updated_at = NOW() WHERE id = $2`,
            [rule.budget_category_id, tx.id],
          );
          matched++;
          assigned = true;
          break;
        }
      }

      if (!assigned) skipped++;
    }

    return { matched, skipped };
  }

  private async seedDefaultCategories(businessId: string): Promise<void> {
    const expenseCats = DEFAULT_EXPENSE_CATEGORIES.map((c, i) =>
      this.budgetCategoryRepo.create({
        business_id: businessId, name: c.name, color: c.color,
        category_type: 'expense',
        monthly_target: null, is_system: true, is_active: true, sort_order: i + 1,
      }),
    );
    const incomeCats = DEFAULT_INCOME_CATEGORIES.map((c, i) =>
      this.budgetCategoryRepo.create({
        business_id: businessId, name: c.name, color: c.color,
        category_type: 'income',
        monthly_target: null, is_system: true, is_active: true,
        sort_order: DEFAULT_EXPENSE_CATEGORIES.length + i + 1,
      }),
    );
    await this.budgetCategoryRepo.save([...expenseCats, ...incomeCats]);
  }
  async findSimilarPersonalTransactions(businessId: string, rawTransactionId: string): Promise<{ similar: any[]; category_id: string | null; category_name: string | null; category_color: string | null; keyword: string }> {
    const catRows = await this.dataSource.query(
      'SELECT rt.personal_category_id, bc.name AS category_name, bc.color AS category_color FROM raw_transactions rt LEFT JOIN budget_categories bc ON bc.id = rt.personal_category_id WHERE rt.id = $1 AND rt.business_id = $2 LIMIT 1',
      [rawTransactionId, businessId],
    );
    const categoryId = catRows[0]?.personal_category_id ?? null;
    const categoryName = catRows[0]?.category_name ?? null;
    const categoryColor = catRows[0]?.category_color ?? null;
    if (!categoryId) return { similar: [], category_id: null, category_name: null, category_color: null, keyword: '' };
    const srcRows = await this.dataSource.query('SELECT description FROM raw_transactions WHERE id = $1 LIMIT 1', [rawTransactionId]);
    if (!srcRows.length) return { similar: [], category_id: categoryId, category_name: categoryName, category_color: categoryColor, keyword: '' };
    const STOP_WORDS = new Set(['the', 'and', 'for', 'from', 'with', 'via', 'inc', 'ltd', 'llc', 'pos', 'purchase']);
    const words = (srcRows[0].description || '').toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter((w: string) => w.length >= 3 && !STOP_WORDS.has(w));
    if (!words.length) return { similar: [], category_id: categoryId, category_name: categoryName, category_color: categoryColor, keyword: '' };
    const keyword = words[0];
    const similar = await this.dataSource.query(
      'SELECT id, transaction_date, description, amount FROM raw_transactions WHERE business_id = $1 AND id != $2 AND status = ' + "'" + 'pending' + "'" + ' AND personal_category_id IS NULL AND LOWER(description) LIKE $3 ORDER BY transaction_date DESC LIMIT 10',
      [businessId, rawTransactionId, '%' + keyword + '%'],
    );
    return { similar: similar.map((tx: any) => ({ ...tx, amount: Number(tx.amount) })), category_id: categoryId, category_name: categoryName, category_color: categoryColor, keyword };
  }

  async reorderBudgetCategories(businessId: string, items: { id: string; sort_order: number }[]): Promise<void> {
    for (const item of items) {
      await this.budgetCategoryRepo.update(
        { id: item.id, business_id: businessId },
        { sort_order: item.sort_order },
      );
    }
  }
}