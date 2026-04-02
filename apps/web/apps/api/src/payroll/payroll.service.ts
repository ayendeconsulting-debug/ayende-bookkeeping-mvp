import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { JournalEntry, JournalEntryStatus } from '../entities/journal-entry.entity';
import { JournalLine } from '../entities/journal-line.entity';
import { Business } from '../entities/business.entity';
import { PostPayrollDto } from './dto/payroll.dto';

export interface PayrollDeductionTemplate {
  key: string;
  label: string;
  description: string;
  typical_rate?: string;
}

export interface PayrollTemplate {
  country: string;
  deductions: PayrollDeductionTemplate[];
}

@Injectable()
export class PayrollService {
  constructor(
    @InjectRepository(JournalEntry)
    private readonly journalEntryRepo: Repository<JournalEntry>,
    @InjectRepository(JournalLine)
    private readonly journalLineRepo: Repository<JournalLine>,
    @InjectRepository(Business)
    private readonly businessRepo: Repository<Business>,
    private readonly dataSource: DataSource,
  ) {}

  // ── Get country-specific deduction template ───────────────────────────────

  async getTemplate(businessId: string): Promise<PayrollTemplate> {
    const business = await this.businessRepo.findOne({ where: { id: businessId } });
    const country = business?.country ?? 'CA';

    if (country === 'US') {
      return {
        country: 'US',
        deductions: [
          {
            key: 'fica_ss',
            label: 'FICA – Social Security',
            description: 'Employee Social Security withholding',
            typical_rate: '6.2%',
          },
          {
            key: 'fica_medicare',
            label: 'FICA – Medicare',
            description: 'Employee Medicare withholding',
            typical_rate: '1.45%',
          },
          {
            key: 'federal_tax',
            label: 'Federal Income Tax',
            description: 'Federal income tax withheld',
          },
          {
            key: 'state_tax',
            label: 'State Income Tax',
            description: 'State income tax withheld (if applicable)',
          },
        ],
      };
    }

    // Default: Canada
    return {
      country: 'CA',
      deductions: [
        {
          key: 'cpp',
          label: 'CPP Payable',
          description: 'Canada Pension Plan – employee deduction',
          typical_rate: '5.95%',
        },
        {
          key: 'ei',
          label: 'EI Payable',
          description: 'Employment Insurance – employee premium',
          typical_rate: '1.66%',
        },
        {
          key: 'income_tax',
          label: 'Income Tax Payable',
          description: 'Federal + provincial income tax withheld',
        },
      ],
    };
  }

  // ── Post payroll journal entry ────────────────────────────────────────────

  async postPayroll(
    businessId: string,
    userId: string,
    dto: PostPayrollDto,
  ): Promise<JournalEntry> {
    // Validate: gross wages = net pay + sum of deductions
    const totalDeductions = dto.deductions.reduce((s, d) => s + Number(d.amount), 0);
    const netPay = parseFloat((Number(dto.gross_wages) - totalDeductions).toFixed(2));

    if (netPay < 0) {
      throw new BadRequestException(
        `Deductions ($${totalDeductions.toFixed(2)}) exceed gross wages ($${Number(dto.gross_wages).toFixed(2)}).`,
      );
    }

    return this.dataSource.transaction(async (manager) => {
      const entry = manager.create(JournalEntry, {
        business_id: businessId,
        entry_date: new Date(dto.pay_date),
        description: `Payroll – ${dto.payroll_period}`,
        reference_type: 'payroll',
        status: JournalEntryStatus.POSTED,
        created_by: userId,
        posted_by: userId,
        posted_at: new Date(),
        notes: dto.notes,
      });
      const savedEntry = await manager.save(JournalEntry, entry) as JournalEntry;

      const lines: Partial<JournalLine>[] = [];

      // Line 1: Debit wages expense for gross wages
      lines.push({
        business_id: businessId,
        journal_entry_id: savedEntry.id,
        line_number: 1,
        account_id: dto.wages_account_id,
        debit_amount: Number(dto.gross_wages),
        credit_amount: 0,
        description: `Gross wages – ${dto.payroll_period}`,
        is_tax_line: false,
      });

      // Lines 2+: Credit each deduction liability account
      dto.deductions.forEach((deduction, idx) => {
        if (Number(deduction.amount) <= 0) return; // skip zero deductions
        lines.push({
          business_id: businessId,
          journal_entry_id: savedEntry.id,
          line_number: idx + 2,
          account_id: deduction.account_id,
          debit_amount: 0,
          credit_amount: Number(deduction.amount),
          description: `${deduction.label} – ${dto.payroll_period}`,
          is_tax_line: false,
        });
      });

      // Final line: Credit bank account for net pay
      lines.push({
        business_id: businessId,
        journal_entry_id: savedEntry.id,
        line_number: lines.length + 1,
        account_id: dto.bank_account_id,
        debit_amount: 0,
        credit_amount: netPay,
        description: `Net pay – ${dto.payroll_period}`,
        is_tax_line: false,
      });

      await manager.save(
        JournalLine,
        lines.map((l) => manager.create(JournalLine, l)),
      );

      return savedEntry;
    });
  }

  // ── List payroll journal entries ──────────────────────────────────────────

  async listPayroll(businessId: string): Promise<JournalEntry[]> {
    return this.journalEntryRepo.find({
      where: { business_id: businessId, reference_type: 'payroll' },
      relations: ['lines'],
      order: { entry_date: 'DESC' },
    });
  }
}
