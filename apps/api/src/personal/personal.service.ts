import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { BudgetCategory } from '../entities/budget-category.entity';
import { SavingsGoal } from '../entities/savings-goal.entity';
import {
  CreateBudgetCategoryDto,
  UpdateBudgetCategoryDto,
  CreateSavingsGoalDto,
  UpdateSavingsGoalDto,
} from './dto/personal.dto';

const DEFAULT_CATEGORIES = [
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

@Injectable()
export class PersonalService {
  constructor(
    @InjectRepository(BudgetCategory)
    private readonly budgetCategoryRepo: Repository<BudgetCategory>,
    @InjectRepository(SavingsGoal)
    private readonly savingsGoalRepo: Repository<SavingsGoal>,
    private readonly dataSource: DataSource,
  ) {}

  // ── Budget Categories ─────────────────────────────────────────────

  async getBudgetCategories(businessId: string) {
    // Auto-seed default categories if none exist
    const count = await this.budgetCategoryRepo.count({
      where: { business_id: businessId },
    });

    if (count === 0) {
      await this.seedDefaultCategories(businessId);
    }

    const categories = await this.budgetCategoryRepo.find({
      where: { business_id: businessId, is_active: true },
      order: { sort_order: 'ASC' },
    });

    // Current month spending from raw_transactions grouped by plaid_category
    const today = new Date();
    const monthStart = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-01`;
    const monthEnd = today.toISOString().split('T')[0];

    const spendingRows = await this.dataSource.query(
      `SELECT LOWER(COALESCE(plaid_category, 'other')) AS cat,
              SUM(ABS(amount)) AS total_spent
       FROM raw_transactions
       WHERE business_id = $1
         AND transaction_date BETWEEN $2 AND $3
         AND amount < 0
         AND status != 'ignored'
       GROUP BY LOWER(COALESCE(plaid_category, 'other'))`,
      [businessId, monthStart, monthEnd],
    );

    const spendingMap: Record<string, number> = {};
    for (const row of spendingRows) {
      spendingMap[row.cat] = Number(row.total_spent);
    }

    return categories.map((cat) => {
      const catLower = cat.name.toLowerCase();
      let spent = 0;

      for (const [plaidCat, amount] of Object.entries(spendingMap)) {
        if (plaidCat.includes(catLower) || catLower.includes(plaidCat)) {
          spent += amount;
        }
      }

      const target = cat.monthly_target ? Number(cat.monthly_target) : null;
      const remaining = target !== null ? Math.max(0, target - spent) : null;
      const over_budget = target !== null && spent > target;
      const percentage_spent =
        target !== null && target > 0
          ? parseFloat(Math.min(100, (spent / target) * 100).toFixed(1))
          : null;

      return {
        ...cat,
        spent_this_month: parseFloat(spent.toFixed(2)),
        remaining,
        over_budget,
        percentage_spent,
      };
    });
  }

  async createBudgetCategory(businessId: string, dto: CreateBudgetCategoryDto) {
    const maxOrder = await this.budgetCategoryRepo
      .createQueryBuilder('bc')
      .where('bc.business_id = :businessId', { businessId })
      .select('MAX(bc.sort_order)', 'max')
      .getRawOne();

    const cat = this.budgetCategoryRepo.create({
      business_id: businessId,
      name: dto.name,
      monthly_target: dto.monthly_target ?? null,
      color: dto.color ?? '#9ca3af',
      is_system: false,
      is_active: true,
      sort_order: (Number(maxOrder?.max) || 0) + 1,
    });
    return this.budgetCategoryRepo.save(cat);
  }

  async updateBudgetCategory(
    businessId: string,
    id: string,
    dto: UpdateBudgetCategoryDto,
  ) {
    const cat = await this.budgetCategoryRepo.findOne({
      where: { id, business_id: businessId },
    });
    if (!cat) throw new NotFoundException(`Budget category ${id} not found`);
    if (dto.name !== undefined) cat.name = dto.name;
    if (dto.monthly_target !== undefined) cat.monthly_target = dto.monthly_target ?? null;
    if (dto.color !== undefined) cat.color = dto.color;
    return this.budgetCategoryRepo.save(cat);
  }

  async deleteBudgetCategory(businessId: string, id: string) {
    const cat = await this.budgetCategoryRepo.findOne({
      where: { id, business_id: businessId },
    });
    if (!cat) throw new NotFoundException(`Budget category ${id} not found`);
    if (cat.is_system) {
      throw new BadRequestException('System categories cannot be deleted — deactivate instead');
    }
    cat.is_active = false;
    await this.budgetCategoryRepo.save(cat);
    return { deleted: true };
  }

  // ── Savings Goals ─────────────────────────────────────────────────

  async getSavingsGoals(businessId: string) {
    const goals = await this.savingsGoalRepo.find({
      where: { business_id: businessId },
      order: { created_at: 'DESC' },
    });

    return goals.map((goal) => {
      const current = Number(goal.current_amount);
      const target = Number(goal.target_amount);
      const percentage_complete =
        target > 0 ? parseFloat(Math.min(100, (current / target) * 100).toFixed(1)) : 0;

      // Monthly contribution rate from creation date
      const createdAt = new Date(goal.created_at);
      const now = new Date();
      const monthsElapsed = Math.max(
        1,
        (now.getFullYear() - createdAt.getFullYear()) * 12 +
          (now.getMonth() - createdAt.getMonth()),
      );
      const monthlyRate = current / monthsElapsed;

      let projected_completion_date: string | null = null;
      if (current >= target) {
        projected_completion_date = now.toISOString().split('T')[0];
      } else if (monthlyRate > 0) {
        const monthsToGo = Math.ceil((target - current) / monthlyRate);
        const projDate = new Date();
        projDate.setMonth(projDate.getMonth() + monthsToGo);
        projected_completion_date = projDate.toISOString().split('T')[0];
      }

      // Required monthly contribution to reach target_date
      let required_monthly_contribution: number | null = null;
      if (goal.target_date && current < target) {
        const targetDate = new Date(goal.target_date as any);
        const monthsRemaining = Math.max(
          1,
          (targetDate.getFullYear() - now.getFullYear()) * 12 +
            (targetDate.getMonth() - now.getMonth()),
        );
        required_monthly_contribution = parseFloat(
          ((target - current) / monthsRemaining).toFixed(2),
        );
      }

      return {
        ...goal,
        percentage_complete,
        projected_completion_date,
        required_monthly_contribution,
      };
    });
  }

  async createSavingsGoal(businessId: string, dto: CreateSavingsGoalDto) {
    const goal = this.savingsGoalRepo.create({
      business_id: businessId,
      name: dto.name,
      target_amount: dto.target_amount,
      current_amount: dto.current_amount ?? 0,
      target_date: dto.target_date as any ?? null,
      linked_account_id: dto.linked_account_id ?? null,
      status: 'active' as any,
    });
    return this.savingsGoalRepo.save(goal);
  }

  async updateSavingsGoal(
    businessId: string,
    id: string,
    dto: UpdateSavingsGoalDto,
  ) {
    const goal = await this.savingsGoalRepo.findOne({
      where: { id, business_id: businessId },
    });
    if (!goal) throw new NotFoundException(`Savings goal ${id} not found`);
    if (dto.name !== undefined) goal.name = dto.name;
    if (dto.target_amount !== undefined) goal.target_amount = dto.target_amount;
    if (dto.current_amount !== undefined) goal.current_amount = dto.current_amount;
    if (dto.target_date !== undefined) goal.target_date = dto.target_date as any;
    if (dto.status !== undefined) goal.status = dto.status as any;
    return this.savingsGoalRepo.save(goal);
  }

  async deleteSavingsGoal(businessId: string, id: string) {
    const goal = await this.savingsGoalRepo.findOne({
      where: { id, business_id: businessId },
    });
    if (!goal) throw new NotFoundException(`Savings goal ${id} not found`);
    await this.savingsGoalRepo.remove(goal);
    return { deleted: true };
  }

  // ── Net Worth ─────────────────────────────────────────────────────

  async getNetWorth(businessId: string) {
    // Plaid connected account balances
    const plaidAccounts = await this.dataSource.query(
      `SELECT pa.name, pa.type, pa.subtype,
              COALESCE(pa.current_balance, 0) AS current_balance,
              pa.currency_code
       FROM plaid_accounts pa
       INNER JOIN plaid_items pi ON pi.id = pa.plaid_item_id
       WHERE pi.business_id = $1
         AND pi.is_deleted = false
       ORDER BY pa.type, pa.name`,
      [businessId],
    );

    // Chart of accounts asset/liability balances
    const coaBalances = await this.dataSource.query(
      `SELECT a.account_name, a.account_type, a.account_subtype,
              COALESCE(ab.balance, 0) AS balance
       FROM accounts a
       LEFT JOIN account_balances ab
         ON ab.account_id = a.id AND ab.business_id = a.business_id
       WHERE a.business_id = $1
         AND a.account_type IN ('asset','liability')
         AND a.is_active = true
       ORDER BY a.account_type, a.account_name`,
      [businessId],
    );

    const ASSET_TYPES = ['depository', 'investment', 'other'];
    const LIABILITY_TYPES = ['credit', 'loan'];

    const plaidAssets = plaidAccounts.filter((a: any) =>
      ASSET_TYPES.includes(a.type),
    );
    const plaidLiabilities = plaidAccounts.filter((a: any) =>
      LIABILITY_TYPES.includes(a.type),
    );

    const plaidAssetTotal = plaidAssets.reduce(
      (s: number, a: any) => s + Math.max(0, Number(a.current_balance)),
      0,
    );
    const plaidLiabilityTotal = plaidLiabilities.reduce(
      (s: number, a: any) => s + Math.abs(Number(a.current_balance)),
      0,
    );

    const coaAssets = coaBalances.filter((a: any) => a.account_type === 'asset');
    const coaLiabilities = coaBalances.filter((a: any) => a.account_type === 'liability');

    const coaAssetTotal = coaAssets.reduce(
      (s: number, a: any) => s + Math.max(0, Number(a.balance)),
      0,
    );
    const coaLiabilityTotal = coaLiabilities.reduce(
      (s: number, a: any) => s + Math.abs(Number(a.balance)),
      0,
    );

    const totalAssets = plaidAssetTotal + coaAssetTotal;
    const totalLiabilities = plaidLiabilityTotal + coaLiabilityTotal;

    return {
      net_worth: parseFloat((totalAssets - totalLiabilities).toFixed(2)),
      total_assets: parseFloat(totalAssets.toFixed(2)),
      total_liabilities: parseFloat(totalLiabilities.toFixed(2)),
      plaid_assets: plaidAssets,
      plaid_liabilities: plaidLiabilities,
      coa_assets: coaAssets,
      coa_liabilities: coaLiabilities,
    };
  }

  // ── Helpers ───────────────────────────────────────────────────────

  private async seedDefaultCategories(businessId: string): Promise<void> {
    const cats = DEFAULT_CATEGORIES.map((c, i) =>
      this.budgetCategoryRepo.create({
        business_id: businessId,
        name: c.name,
        color: c.color,
        monthly_target: null,
        is_system: true,
        is_active: true,
        sort_order: i + 1,
      }),
    );
    await this.budgetCategoryRepo.save(cats);
  }
}
