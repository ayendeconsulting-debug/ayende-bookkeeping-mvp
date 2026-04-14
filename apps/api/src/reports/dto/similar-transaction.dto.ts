import { IsUUID } from 'class-validator';

export class FindSimilarTransactionsDto {
  @IsUUID()
  rawTransactionId: string;
}
