import { IsUUID, IsNumber, IsOptional, IsString, IsArray, ValidateNested, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class SplitLineDto {
  @IsString()
  account_id: string;

  @IsNumber()
  @Min(0.01)
  amount: number;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  tax_code_id?: string;
}

export class SplitTransactionDto {
  @IsString()
  source_account_id: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SplitLineDto)
  splits: SplitLineDto[];
}
