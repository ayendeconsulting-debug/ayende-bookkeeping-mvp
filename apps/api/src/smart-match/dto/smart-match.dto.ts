import {
  IsString,
  IsUUID,
  IsOptional,
  IsInt,
  Min,
  Max,
  IsArray,
} from 'class-validator';
import { Type } from 'class-transformer';

export class SmartMatchConfirmDto {
  /**
   * Optional: caller may supply a source (bank/credit card) account ID.
   * If omitted, SmartMatchService resolves it from raw_tx.source_account_name.
   */
  @IsString()
  @IsOptional()
  sourceAccountId?: string;
}

export class SmartMatchOverrideDto {
  /** The account the user actually wants to use instead of the suggestion. */
  @IsString()
  accountId: string;

  @IsString()
  @IsOptional()
  taxCodeId?: string;

  @IsString()
  @IsOptional()
  sourceAccountId?: string;
}

export class SmartMatchBulkConfirmDto {
  /** Confirm only these IDs. If omitted, confirms ALL pending suggestions. */
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  rawTransactionIds?: string[];
}

export class SmartMatchListQueryDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  page?: number = 1;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  @IsOptional()
  limit?: number = 20;
}