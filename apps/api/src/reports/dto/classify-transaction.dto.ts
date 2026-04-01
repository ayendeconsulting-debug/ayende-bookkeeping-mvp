import { IsEnum, IsNotEmpty, IsNumber, IsOptional, IsUUID } from 'class-validator';
import { ClassificationMethod } from '../../entities/classified-transaction.entity';

export class ClassifyTransactionDto {
  @IsUUID('all')
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

  // Temporary placeholder until auth is implemented
  @IsUUID('all')
  classifiedBy: string;
}

export class OwnerContributionDto {
  @IsUUID('all')
  businessId: string;

  @IsUUID('all')
  rawTransactionId: string;

  // Debit: expense or asset account
  @IsUUID('all')
  debitAccountId: string;

  @IsUUID('all')
  classifiedBy: string;
}

export class OwnerDrawDto {
  @IsUUID('all')
  businessId: string;

  @IsUUID('all')
  rawTransactionId: string;

  // Credit: bank account to draw from
  @IsUUID('all')
  creditAccountId: string;

  @IsUUID('all')
  classifiedBy: string;
}
