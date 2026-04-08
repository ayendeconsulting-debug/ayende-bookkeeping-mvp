import { IsString } from 'class-validator';

export class MarkTransferDto {
  @IsString()
  source_account_id: string;

  @IsString()
  destination_account_id: string;
}
