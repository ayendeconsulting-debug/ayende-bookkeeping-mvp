import { IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString, IsUUID, Max, Min } from 'class-validator';
import { TaxType } from '../../entities/tax-code.entity';

export class CreateTaxCodeDto {
  @IsString()
  @IsNotEmpty()
  code: string;

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsEnum(TaxType)
  tax_type: TaxType;

  // Decimal rate, e.g. 0.13 for 13%
  @IsNumber()
  @Min(0)
  @Max(1)
  rate: number;

  // Must be a TAX_PAYABLE account
  @IsUUID('all')
  tax_account_id: string;
}
