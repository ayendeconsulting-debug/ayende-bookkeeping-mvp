import {
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';
import { ClassificationMethod } from '../../entities/classified-transaction.entity';

export class ClassifyTransactionDto {
  // Set from JWT in controller — not sent by client
  @IsString()
  @IsOptional()
  businessId: string;

  @IsUUID('all')
  rawTransactionId: string;

  // Debit account (expense, asset, etc.)
  @IsUUID('all')
  accountId: string;

  // Credit account (source bank/credit card account)
  @IsUUID('all')
  sourceAccountId: string;

  @IsEnum(ClassificationMethod)
  classificationMethod: ClassificationMethod;

  @IsUUID('all')
  @IsOptional()
  taxCodeId?: string;

  // Override amount — if null, raw transaction amount is used
  @IsNumber()
  @IsOptional()
  overrideAmount?: number;

  // Set from JWT in controller — Clerk userId (string, not UUID)
  @IsString()
  @IsOptional()
  classifiedBy?: string;
}

export class OwnerContributionDto {
  @IsString()
  @IsOptional()
  businessId: string;

  @IsUUID('all')
  rawTransactionId: string;

  // Debit: expense or asset account
  @IsUUID('all')
  debitAccountId: string;

  @IsString()
  @IsOptional()
  classifiedBy?: string;
}

export class OwnerDrawDto {
  @IsString()
  @IsOptional()
  businessId: string;

  @IsUUID('all')
  rawTransactionId: string;

  // Credit: bank account to draw from
  @IsUUID('all')
  creditAccountId: string;

  @IsString()
  @IsOptional()
  classifiedBy?: string;
}

export class RawTransactionFilterDto {
  @IsString()
  @IsOptional()
  status?: string;

  @IsString()
  @IsOptional()
  search?: string;

  @IsString()
  @IsOptional()
  startDate?: string;

  @IsString()
  @IsOptional()
  endDate?: string;

  @IsNumber()
  @IsOptional()
  limit?: number;

  @IsNumber()
  @IsOptional()
  offset?: number;
}
