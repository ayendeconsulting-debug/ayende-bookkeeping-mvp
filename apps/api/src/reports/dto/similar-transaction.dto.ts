import { IsUUID, IsString } from 'class-validator';

export class FindSimilarTransactionsDto {
  @IsUUID()
  rawTransactionId: string;

  @IsUUID()
  accountId: string;

  @IsUUID()
  sourceAccountId: string;
}
