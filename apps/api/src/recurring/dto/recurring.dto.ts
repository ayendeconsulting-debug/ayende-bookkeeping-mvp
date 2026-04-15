import {
  IsString,
  IsOptional,
  IsNumber,
  IsDateString,
  IsPositive,
  IsIn,
  IsBoolean,
  Min,
  Max,
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

  /**
   * Fraction of the amount that is business expense (0.0–1.0).
   * Defaults to 1.0 (100% business) if not provided.
   * 0.0 = fully personal (no journal entry).
   * 0 < ratio < 1 = split — business portion to debit account, remainder to Owner Draw.
   */
  @IsNumber()
  @Min(0)
  @Max(1)
  @IsOptional()
  business_ratio?: number;

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

  @IsNumber()
  @Min(0)
  @Max(1)
  @IsOptional()
  business_ratio?: number;

  @IsString()
  @IsOptional()
  notes?: string;
}
