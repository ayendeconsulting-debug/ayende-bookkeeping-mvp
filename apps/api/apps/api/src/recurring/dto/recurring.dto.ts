import {
  IsString,
  IsOptional,
  IsNumber,
  IsDateString,
  IsPositive,
  IsIn,
  IsBoolean,
} from 'class-validator';

export class CreateRecurringDto {
  @IsString()
  description: string;

  @IsNumber()
  @IsPositive()
  amount: number;

  @IsString()
  @IsOptional()
  currency_code?: string;

  @IsString()
  debit_account_id: string;

  @IsString()
  credit_account_id: string;

  @IsString()
  @IsIn(['daily', 'weekly', 'monthly', 'quarterly', 'annually'])
  frequency: string;

  @IsDateString()
  start_date: string;

  @IsDateString()
  @IsOptional()
  end_date?: string;

  @IsBoolean()
  @IsOptional()
  is_personal?: boolean;

  @IsString()
  @IsOptional()
  notes?: string;
}

export class UpdateRecurringDto {
  @IsString()
  @IsOptional()
  description?: string;

  @IsNumber()
  @IsPositive()
  @IsOptional()
  amount?: number;

  @IsDateString()
  @IsOptional()
  end_date?: string;

  @IsBoolean()
  @IsOptional()
  is_personal?: boolean;

  @IsString()
  @IsOptional()
  notes?: string;
}
