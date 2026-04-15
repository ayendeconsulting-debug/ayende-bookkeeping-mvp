import { IsUUID, IsNumber, IsOptional, IsString, IsArray, IsBoolean, IsIn, ValidateNested, Min } from 'class-validator';
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

  /**
   * Freelancer mode: marks this line as personal.
   * - source_type 'business': personal lines debit Owner Draw instead of account_id
   * - source_type 'personal': personal lines are excluded from the journal entry entirely
   */
  @IsOptional()
  @IsBoolean()
  is_personal?: boolean;
}

export class SplitTransactionDto {
  @IsString()
  source_account_id: string;

  /**
   * Freelancer mode: indicates whether the money came from a business or personal account.
   * 'business' (default): full gross credits the business source account.
   * 'personal': only business lines are posted; personal lines excluded from ledger.
   *             source_account_id is ignored (personal account not in chart of accounts).
   */
  @IsOptional()
  @IsIn(['business', 'personal'])
  source_type?: 'business' | 'personal';

  /**
   * Freelancer personal source: descriptive label for the personal account (display only).
   */
  @IsOptional()
  @IsString()
  personal_account_label?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SplitLineDto)
  splits: SplitLineDto[];
}
