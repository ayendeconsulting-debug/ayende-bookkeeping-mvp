import { IsBoolean, IsEnum, IsOptional, IsString } from 'class-validator';

export class CreateCheckoutSessionDto {
  @IsEnum(['starter', 'pro', 'accountant'])
  plan: 'starter' | 'pro' | 'accountant';

  @IsEnum(['monthly', 'annual'])
  billing_cycle: 'monthly' | 'annual';

  @IsOptional()
  @IsBoolean()
  ai_addon?: boolean;
}

export class CreatePortalSessionDto {
  @IsString()
  return_url: string;
}
