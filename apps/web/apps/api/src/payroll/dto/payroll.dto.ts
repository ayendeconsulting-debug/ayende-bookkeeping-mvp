import {
  IsString,
  IsNumber,
  IsPositive,
  IsOptional,
  IsArray,
  ValidateNested,
  IsDateString,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

export class DeductionLineDto {
  /** Human-readable label e.g. "CPP Payable" */
  @IsString()
  label: string;

  @IsNumber()
  @Min(0)
  amount: number;

  /** Liability account that receives the credit */
  @IsString()
  account_id: string;
}

export class PostPayrollDto {
  /** Period label for reporting e.g. "2026-Q1 Payroll" */
  @IsString()
  payroll_period: string;

  @IsDateString()
  pay_date: string;

  @IsNumber()
  @IsPositive()
  gross_wages: number;

  /** Expense account to debit for gross wages */
  @IsString()
  wages_account_id: string;

  /** Bank/cash account to credit for net pay */
  @IsString()
  bank_account_id: string;

  /** Each deduction line: CPP, EI, income tax, FICA, etc. */
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DeductionLineDto)
  deductions: DeductionLineDto[];

  @IsString()
  @IsOptional()
  notes?: string;
}
