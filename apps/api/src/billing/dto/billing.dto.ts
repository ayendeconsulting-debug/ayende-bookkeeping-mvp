import { IsEnum, IsString } from 'class-validator';

export class CreateCheckoutSessionDto {
  @IsEnum(['starter', 'pro', 'accountant'])
  plan: 'starter' | 'pro' | 'accountant';

  @IsEnum(['monthly', 'annual'])
  billing_cycle: 'monthly' | 'annual';
}

export class CreatePortalSessionDto {
  @IsString()
  return_url: string;
}
