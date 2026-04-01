import { IsBoolean, IsEnum, IsNumber, IsOptional, IsString, IsUUID, Max, Min } from 'class-validator';
import { TaxType } from '../../entities/tax-code.entity';

export class UpdateTaxCodeDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsEnum(TaxType)
  @IsOptional()
  tax_type?: TaxType;

  @IsNumber()
  @Min(0)
  @Max(1)
  @IsOptional()
  rate?: number;

  @IsUUID('all')
  @IsOptional()
  tax_account_id?: string;

  @IsBoolean()
  @IsOptional()
  is_active?: boolean;
}
