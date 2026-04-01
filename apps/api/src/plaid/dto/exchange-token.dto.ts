import { IsString, IsNotEmpty } from 'class-validator';

export class ExchangeTokenDto {
  @IsString()
  @IsNotEmpty()
  public_token: string;

  // institution name from Plaid Link metadata
  @IsString()
  @IsNotEmpty()
  institution_name: string;

  @IsString()
  @IsNotEmpty()
  institution_id: string;
}
