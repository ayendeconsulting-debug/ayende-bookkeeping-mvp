import { IsBoolean, IsIn, IsNotEmpty, IsNumber, IsOptional, IsString, IsUUID, Min } from 'class-validator';

export class CreateClassificationRuleDto {
  @IsOptional()
  @IsUUID('all')
  businessId: string;

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsIn(['keyword', 'vendor', 'account'])
  match_type: string;

  @IsString()
  @IsNotEmpty()
  match_value: string;

  @IsString()
  @IsOptional()
  match_pattern?: string;

  @IsUUID('all')
  target_account_id: string;

  @IsUUID('all')
  @IsOptional()
  tax_code_id?: string;

  @IsNumber()
  @Min(1)
  @IsOptional()
  priority?: number;
}

export class UpdateClassificationRuleDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsIn(['keyword', 'vendor', 'account'])
  @IsOptional()
  match_type?: string;

  @IsString()
  @IsOptional()
  match_value?: string;

  @IsString()
  @IsOptional()
  match_pattern?: string;

  @IsUUID('all')
  @IsOptional()
  target_account_id?: string;

  @IsUUID('all')
  @IsOptional()
  tax_code_id?: string;

  @IsNumber()
  @Min(1)
  @IsOptional()
  priority?: number;

  @IsBoolean()
  @IsOptional()
  is_active?: boolean;
}
