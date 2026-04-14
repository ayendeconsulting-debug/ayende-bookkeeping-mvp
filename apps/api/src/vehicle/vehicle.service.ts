import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { FinancedVehicle } from './entities/financed-vehicle.entity';
import { VehiclePayment } from './entities/vehicle-payment.entity';
import {
  CreateVehicleDto,
  UpdateVehicleDto,
  RecordPaymentDto,
  AllocateUsageDto,
} from './dto/vehicle.dto';

@Injectable()
export class VehicleService {
  constructor(
    @InjectRepository(FinancedVehicle)
    private readonly vehicleRepo: Repository<FinancedVehicle>,
    @InjectRepository(VehiclePayment)
    private readonly paymentRepo: Repository<VehiclePayment>,
    private readonly dataSource: DataSource,
  ) {}

  // ── List ──────────────────────────────────────────────────────────────

  async getVehicles(businessId: string) {
    const vehicles = await this.vehicleRepo.find({
      where: { business_id: businessId },
      order: { created_at: 'DESC' },
    });
    return vehicles.map((v) => ({
      ...v,
      loan_amount:       Number(v.loan_amount),
      purchase_price:    Number(v.purchase_price),
      down_payment:      Number(v.down_payment),
      monthly_payment:   Number(v.monthly_payment),
      remaining_balance: Number(v.remaining_balance),
      business_use_pct:  Number(v.business_use_pct),
      interest_rate:     Number(v.interest_rate),
    }));
  }

  // ── Create + Opening Journal Entry ───────────────────────────────────

  async createVehicle(businessId: string, dto: CreateVehicleDto) {
    const downPayment  = dto.down_payment ?? 0;
    const loanAmount   = parseFloat((dto.purchase_price - downPayment).toFixed(2));

    if (loanAmount <= 0) {
      throw new BadRequestException('Loan amount must be greater than zero');
    }

    return this.dataSource.transaction(async (em) => {
      // 1. Create Vehicle asset account
      const assetResult = await em.query(
        `INSERT INTO accounts
           (business_id, name, account_code, account_type, account_subtype, currency_code, is_active, created_at, updated_at)
         VALUES ($1, $2, $3, 'asset', 'other_asset', 'CAD', true, NOW(), NOW())
         RETURNING id`,
        [businessId, `Vehicle – ${dto.name}`, `VEH-${Date.now()}`],
      );
      const assetAccountId: string = assetResult[0].id;

      // 2. Create Vehicle Loan Payable liability account
      const liabResult = await em.query(
        `INSERT INTO accounts
           (business_id, name, account_code, account_type, account_subtype, currency_code, is_active, created_at, updated_at)
         VALUES ($1, $2, $3, 'liability', 'other_liability', 'CAD', true, NOW(), NOW())
         RETURNING id`,
        [businessId, `Vehicle Loan – ${dto.name}`, `VLOAN-${Date.now()}`],
      );
      const loanAccountId: string = liabResult[0].id;

      // 3. Find or create Owner Contribution equity account
      let ownerContribRows = await em.query(
        `SELECT id FROM accounts
         WHERE business_id = $1 AND account_subtype = 'owner_contribution' AND is_active = true
         LIMIT 1`,
        [businessId],
      );
      let ownerContribId: string;
      if (ownerContribRows.length === 0) {
        const oc = await em.query(
          `INSERT INTO accounts
             (business_id, name, account_code, account_type, account_subtype, currency_code, is_active, created_at, updated_at)
           VALUES ($1, 'Owner Contribution', 'OWN-CONTRIB', 'equity', 'owner_contribution', 'CAD', true, NOW(), NOW())
           RETURNING id`,
          [businessId],
        );
        ownerContribId = oc[0].id;
      } else {
        ownerContribId = ownerContribRows[0].id;
      }

      // 4. Save vehicle record
      const vehicle = this.vehicleRepo.create({
        business_id:       businessId,
        name:              dto.name,
        purchase_price:    dto.purchase_price,
        down_payment:      downPayment,
        loan_amount:       loanAmount,
        interest_rate:     dto.interest_rate,
        monthly_payment:   dto.monthly_payment,
        loan_start_date:   new Date(dto.loan_start_date),
        remaining_balance: loanAmount,
        business_use_pct:  dto.business_use_pct,
        asset_account_id:  assetAccountId,
        loan_account_id:   loanAccountId,
        status:            'active',
      });
      const savedVehicle = await em.save(FinancedVehicle, vehicle);

      // 5. Post opening journal entry
      // DR Vehicle Asset  = purchase_price
      // CR Vehicle Loan   = loan_amount
      // CR Owner Contrib  = down_payment (if > 0)
      const jeResult = await em.query(
        `INSERT INTO journal_entries
           (business_id, entry_date, description, status, reference_type, reference_id, created_at, updated_at)
         VALUES ($1, $2, $3, 'posted', 'vehicle_opening', $4, NOW(), NOW())
         RETURNING id`,
        [
          businessId,
          dto.loan_start_date,
          `Vehicle setup – ${dto.name}`,
          savedVehicle.id,
        ],
      );
      const jeId: string = jeResult[0].id;

      // Debit: Vehicle asset
      await em.query(
        `INSERT INTO journal_lines (journal_entry_id, account_id, debit_amount, credit_amount, description, created_at, updated_at)
         VALUES ($1, $2, $3, 0, $4, NOW(), NOW())`,
        [jeId, assetAccountId, dto.purchase_price, `Vehicle asset – ${dto.name}`],
      );

      // Credit: Loan payable
      await em.query(
        `INSERT INTO journal_lines (journal_entry_id, account_id, debit_amount, credit_amount, description, created_at, updated_at)
         VALUES ($1, $2, 0, $3, $4, NOW(), NOW())`,
        [jeId, loanAccountId, loanAmount, `Vehicle loan – ${dto.name}`],
      );

      // Credit: Owner contribution (down payment)
      if (downPayment > 0) {
        await em.query(
          `INSERT INTO journal_lines (journal_entry_id, account_id, debit_amount, credit_amount, description, created_at, updated_at)
           VALUES ($1, $2, 0, $3, $4, NOW(), NOW())`,
          [jeId, ownerContribId, downPayment, `Down payment – ${dto.name}`],
        );
      }

      return {
        ...savedVehicle,
        opening_journal_entry_id: jeId,
      };
    });
  }

  // ── Get single vehicle with payments ─────────────────────────────────

  async getVehicle(businessId: string, vehicleId: string) {
    const vehicle = await this.vehicleRepo.findOne({
      where: { id: vehicleId, business_id: businessId },
    });
    if (!vehicle) throw new NotFoundException(`Vehicle ${vehicleId} not found`);

    const payments = await this.paymentRepo.find({
      where: { vehicle_id: vehicleId, business_id: businessId },
      order: { payment_date: 'DESC' },
    });

    return {
      ...vehicle,
      loan_amount:       Number(vehicle.loan_amount),
      purchase_price:    Number(vehicle.purchase_price),
      down_payment:      Number(vehicle.down_payment),
      monthly_payment:   Number(vehicle.monthly_payment),
      remaining_balance: Number(vehicle.remaining_balance),
      business_use_pct:  Number(vehicle.business_use_pct),
      interest_rate:     Number(vehicle.interest_rate),
      payments: payments.map((p) => ({
        ...p,
        total_payment:   Number(p.total_payment),
        principal_amount: Number(p.principal_amount),
        interest_amount: Number(p.interest_amount),
        balance_after:   Number(p.balance_after),
      })),
    };
  }

  // ── Update ────────────────────────────────────────────────────────────

  async updateVehicle(businessId: string, vehicleId: string, dto: UpdateVehicleDto) {
    const vehicle = await this.vehicleRepo.findOne({
      where: { id: vehicleId, business_id: businessId },
    });
    if (!vehicle) throw new NotFoundException(`Vehicle ${vehicleId} not found`);

    if (dto.business_use_pct !== undefined) vehicle.business_use_pct = dto.business_use_pct;
    if (dto.status           !== undefined) vehicle.status           = dto.status;
    if (dto.monthly_payment  !== undefined) vehicle.monthly_payment  = dto.monthly_payment;

    return this.vehicleRepo.save(vehicle);
  }

  // ── Record Monthly Payment ────────────────────────────────────────────

  async recordPayment(businessId: string, vehicleId: string, dto: RecordPaymentDto) {
    const vehicle = await this.vehicleRepo.findOne({
      where: { id: vehicleId, business_id: businessId },
    });
    if (!vehicle) throw new NotFoundException(`Vehicle ${vehicleId} not found`);
    if (vehicle.status === 'paid_off') {
      throw new BadRequestException('Vehicle loan is already paid off');
    }

    const total     = parseFloat(dto.total_payment.toFixed(2));
    const principal = parseFloat(dto.principal_amount.toFixed(2));
    const interest  = parseFloat(dto.interest_amount.toFixed(2));

    if (Math.abs(total - (principal + interest)) > 0.02) {
      throw new BadRequestException('Principal + interest must equal total payment');
    }

    const balanceAfter = parseFloat(
      (Number(vehicle.remaining_balance) - principal).toFixed(2),
    );

    return this.dataSource.transaction(async (em) => {
      // Find Owner Contribution account
      const ocRows = await em.query(
        `SELECT id FROM accounts
         WHERE business_id = $1 AND account_subtype = 'owner_contribution' AND is_active = true
         LIMIT 1`,
        [businessId],
      );
      if (!ocRows.length) {
        throw new BadRequestException('Owner Contribution account not found. Please set up your chart of accounts.');
      }
      const ownerContribId: string = ocRows[0].id;

      // Find Interest Expense account (create if needed)
      let interestRows = await em.query(
        `SELECT id FROM accounts
         WHERE business_id = $1 AND LOWER(name) LIKE '%interest%' AND account_type = 'expense' AND is_active = true
         LIMIT 1`,
        [businessId],
      );
      let interestAccountId: string;
      if (interestRows.length === 0) {
        const ia = await em.query(
          `INSERT INTO accounts
             (business_id, name, account_code, account_type, account_subtype, currency_code, is_active, created_at, updated_at)
           VALUES ($1, 'Interest Expense', 'INT-EXP', 'expense', 'other_expense', 'CAD', true, NOW(), NOW())
           RETURNING id`,
          [businessId],
        );
        interestAccountId = ia[0].id;
      } else {
        interestAccountId = interestRows[0].id;
      }

      // Post journal entry:
      // DR Vehicle Loan Payable  = principal
      // DR Interest Expense      = interest
      // CR Owner Contribution    = total
      const jeResult = await em.query(
        `INSERT INTO journal_entries
           (business_id, entry_date, description, status, reference_type, reference_id, created_at, updated_at)
         VALUES ($1, $2, $3, 'posted', 'vehicle_payment', $4, NOW(), NOW())
         RETURNING id`,
        [
          businessId,
          dto.payment_date,
          `Vehicle payment – ${vehicle.name}`,
          vehicleId,
        ],
      );
      const jeId: string = jeResult[0].id;

      await em.query(
        `INSERT INTO journal_lines (journal_entry_id, account_id, debit_amount, credit_amount, description, created_at, updated_at)
         VALUES ($1, $2, $3, 0, $4, NOW(), NOW())`,
        [jeId, vehicle.loan_account_id, principal, `Principal – ${vehicle.name}`],
      );

      if (interest > 0) {
        await em.query(
          `INSERT INTO journal_lines (journal_entry_id, account_id, debit_amount, credit_amount, description, created_at, updated_at)
           VALUES ($1, $2, $3, 0, $4, NOW(), NOW())`,
          [jeId, interestAccountId, interest, `Interest – ${vehicle.name}`],
        );
      }

      await em.query(
        `INSERT INTO journal_lines (journal_entry_id, account_id, debit_amount, credit_amount, description, created_at, updated_at)
         VALUES ($1, $2, 0, $3, $4, NOW(), NOW())`,
        [jeId, ownerContribId, total, `Vehicle payment contribution – ${vehicle.name}`],
      );

      // Save payment record
      const payment = this.paymentRepo.create({
        vehicle_id:       vehicleId,
        business_id:      businessId,
        payment_date:     new Date(dto.payment_date),
        total_payment:    total,
        principal_amount: principal,
        interest_amount:  interest,
        balance_after:    balanceAfter,
        journal_entry_id: jeId,
      });
      await em.save(VehiclePayment, payment);

      // Update vehicle remaining balance
      vehicle.remaining_balance = balanceAfter;
      if (balanceAfter <= 0) vehicle.status = 'paid_off';
      await em.save(FinancedVehicle, vehicle);

      return { ...payment, journal_entry_id: jeId, balance_after: balanceAfter };
    });
  }

  // ── Business-Use Allocation ───────────────────────────────────────────

  async allocateUsage(businessId: string, vehicleId: string, dto: AllocateUsageDto) {
    const vehicle = await this.vehicleRepo.findOne({
      where: { id: vehicleId, business_id: businessId },
    });
    if (!vehicle) throw new NotFoundException(`Vehicle ${vehicleId} not found`);

    const businessPct = Number(vehicle.business_use_pct) / 100;
    const personalPct = 1 - businessPct;

    // Sum interest expense posted for this vehicle in the period
    const rows = await this.dataSource.query(
      `SELECT COALESCE(SUM(jl.debit_amount), 0) AS total_interest
       FROM journal_lines jl
       JOIN journal_entries je ON je.id = jl.journal_entry_id
       JOIN accounts a ON a.id = jl.account_id
       WHERE je.business_id = $1
         AND je.reference_type = 'vehicle_payment'
         AND je.reference_id = $2
         AND je.entry_date BETWEEN $3 AND $4
         AND je.status = 'posted'
         AND a.account_type = 'expense'`,
      [businessId, vehicleId, dto.period_start, dto.period_end],
    );
    const totalInterest = parseFloat(Number(rows[0]?.total_interest ?? 0).toFixed(2));

    if (totalInterest === 0) {
      return {
        message: 'No vehicle expense found in this period to allocate.',
        business_amount: 0,
        personal_amount: 0,
      };
    }

    const businessAmount = parseFloat((totalInterest * businessPct).toFixed(2));
    const personalAmount = parseFloat((totalInterest * personalPct).toFixed(2));

    return this.dataSource.transaction(async (em) => {
      // Find/create Vehicle Expense account
      let veRows = await em.query(
        `SELECT id FROM accounts
         WHERE business_id = $1 AND LOWER(name) LIKE '%vehicle%' AND account_type = 'expense' AND is_active = true
         LIMIT 1`,
        [businessId],
      );
      let vehicleExpenseId: string;
      if (veRows.length === 0) {
        const ve = await em.query(
          `INSERT INTO accounts
             (business_id, name, account_code, account_type, account_subtype, currency_code, is_active, created_at, updated_at)
           VALUES ($1, 'Vehicle Expense', 'VEH-EXP', 'expense', 'other_expense', 'CAD', true, NOW(), NOW())
           RETURNING id`,
          [businessId],
        );
        vehicleExpenseId = ve[0].id;
      } else {
        vehicleExpenseId = veRows[0].id;
      }

      // Find Owner Draw equity account
      let odRows = await em.query(
        `SELECT id FROM accounts
         WHERE business_id = $1 AND account_subtype = 'owner_draw' AND is_active = true
         LIMIT 1`,
        [businessId],
      );
      let ownerDrawId: string;
      if (odRows.length === 0) {
        const od = await em.query(
          `INSERT INTO accounts
             (business_id, name, account_code, account_type, account_subtype, currency_code, is_active, created_at, updated_at)
           VALUES ($1, 'Owner Draw', 'OWN-DRAW', 'equity', 'owner_draw', 'CAD', true, NOW(), NOW())
           RETURNING id`,
          [businessId],
        );
        ownerDrawId = od[0].id;
      } else {
        ownerDrawId = odRows[0].id;
      }

      // Find Interest Expense account
      const ieRows = await em.query(
        `SELECT id FROM accounts
         WHERE business_id = $1 AND LOWER(name) LIKE '%interest%' AND account_type = 'expense' AND is_active = true
         LIMIT 1`,
        [businessId],
      );
      if (!ieRows.length) throw new BadRequestException('Interest Expense account not found');
      const interestExpenseId: string = ieRows[0].id;

      // Journal entry:
      // DR Vehicle Expense   = business portion
      // DR Owner Draw        = personal portion
      // CR Interest Expense  = total (clearing)
      const jeResult = await em.query(
        `INSERT INTO journal_entries
           (business_id, entry_date, description, status, reference_type, reference_id, created_at, updated_at)
         VALUES ($1, $2, $3, 'posted', 'vehicle_allocation', $4, NOW(), NOW())
         RETURNING id`,
        [
          businessId,
          dto.period_end,
          `Vehicle use allocation – ${vehicle.name} (${vehicle.business_use_pct}% business)`,
          vehicleId,
        ],
      );
      const jeId: string = jeResult[0].id;

      if (businessAmount > 0) {
        await em.query(
          `INSERT INTO journal_lines (journal_entry_id, account_id, debit_amount, credit_amount, description, created_at, updated_at)
           VALUES ($1, $2, $3, 0, $4, NOW(), NOW())`,
          [jeId, vehicleExpenseId, businessAmount, `Business use ${vehicle.business_use_pct}% – ${vehicle.name}`],
        );
      }

      if (personalAmount > 0) {
        await em.query(
          `INSERT INTO journal_lines (journal_entry_id, account_id, debit_amount, credit_amount, description, created_at, updated_at)
           VALUES ($1, $2, $3, 0, $4, NOW(), NOW())`,
          [jeId, ownerDrawId, personalAmount, `Personal use ${100 - Number(vehicle.business_use_pct)}% – ${vehicle.name}`],
        );
      }

      await em.query(
        `INSERT INTO journal_lines (journal_entry_id, account_id, debit_amount, credit_amount, description, created_at, updated_at)
         VALUES ($1, $2, 0, $3, $4, NOW(), NOW())`,
        [jeId, interestExpenseId, totalInterest, `Interest clearing – ${vehicle.name}`],
      );

      return {
        journal_entry_id: jeId,
        period_start:     dto.period_start,
        period_end:       dto.period_end,
        total_interest:   totalInterest,
        business_amount:  businessAmount,
        personal_amount:  personalAmount,
        business_pct:     Number(vehicle.business_use_pct),
      };
    });
  }

  // ── Amortization Schedule (calculated, no DB) ─────────────────────────

  getAmortizationSchedule(businessId: string, vehicleId: string) {
    return this.vehicleRepo
      .findOne({ where: { id: vehicleId, business_id: businessId } })
      .then((vehicle) => {
        if (!vehicle) throw new NotFoundException(`Vehicle ${vehicleId} not found`);

        const monthlyRate  = Number(vehicle.interest_rate) / 12;
        const payment      = Number(vehicle.monthly_payment);
        let balance        = Number(vehicle.loan_amount);
        const schedule: {
          period: number;
          payment: number;
          principal: number;
          interest: number;
          balance: number;
        }[] = [];

        let period = 1;
        while (balance > 0.01 && period <= 360) {
          const interest  = parseFloat((balance * monthlyRate).toFixed(2));
          const principal = parseFloat(Math.min(payment - interest, balance).toFixed(2));
          balance         = parseFloat(Math.max(0, balance - principal).toFixed(2));
          schedule.push({ period, payment: parseFloat(payment.toFixed(2)), principal, interest, balance });
          period++;
        }

        return schedule;
      });
  }
}
