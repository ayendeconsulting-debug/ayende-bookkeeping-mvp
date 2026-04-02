import {
  IsString,
  IsOptional,
  IsNumber,
  IsDateString,
  IsEmail,
  IsPositive,
  IsIn,
} from 'class-validator';

export class CreateArApDto {
  @IsString()
  @IsIn(['receivable', 'payable'])
  type: 'receivable' | 'payable';

  @IsString()
  party_name: string;

  @IsEmail()
  @IsOptional()
  party_email?: string;

  @IsNumber()
  @IsPositive()
  amount: number;

  @IsDateString()
  due_date: string;

  @IsString()
  @IsOptional()
  description?: string;
}

export class UpdateArApDto {
  @IsString()
  @IsOptional()
  party_name?: string;

  @IsEmail()
  @IsOptional()
  party_email?: string;

  @IsDateString()
  @IsOptional()
  due_date?: string;

  @IsString()
  @IsOptional()
  description?: string;
}

export class RecordArApPaymentDto {
  @IsNumber()
  @IsPositive()
  amount: number;

  @IsDateString()
  payment_date: string;

  // For AR: bank account that received payment (debit)
  // For AP: bank account that made payment (credit)
  @IsString()
  bank_account_id: string;

  // For AR: revenue/receivable account to credit
  // For AP: expense/payable account to debit
  @IsString()
  contra_account_id: string;

  @IsString()
  @IsOptional()
  notes?: string;
}
