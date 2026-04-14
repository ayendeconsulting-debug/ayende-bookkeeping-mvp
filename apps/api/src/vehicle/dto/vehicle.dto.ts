import {
  IsString, IsNumber, IsOptional, IsDateString,
  Min, Max, IsUUID,
} from 'class-validator';

export class CreateVehicleDto {
  @IsString()
  name: string;

  @IsNumber()
  @Min(0)
  purchase_price: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  down_payment?: number;

  @IsNumber()
  @Min(0)
  interest_rate: number;

  @IsNumber()
  @Min(0)
  monthly_payment: number;

  @IsDateString()
  loan_start_date: string;

  @IsNumber()
  @Min(0)
  @Max(100)
  business_use_pct: number;
}

export class UpdateVehicleDto {
  @IsNumber()
  @Min(0)
  @Max(100)
  @IsOptional()
  business_use_pct?: number;

  @IsString()
  @IsOptional()
  status?: string;

  @IsNumber()
  @Min(0)
  @IsOptional()
  monthly_payment?: number;
}

export class RecordPaymentDto {
  @IsDateString()
  payment_date: string;

  @IsNumber()
  @Min(0)
  total_payment: number;

  @IsNumber()
  @Min(0)
  principal_amount: number;

  @IsNumber()
  @Min(0)
  interest_amount: number;
}

export class AllocateUsageDto {
  @IsDateString()
  period_start: string;

  @IsDateString()
  period_end: string;
}
