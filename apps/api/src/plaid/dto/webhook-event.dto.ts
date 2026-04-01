import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class WebhookEventDto {
  @IsString()
  @IsNotEmpty()
  webhook_type: string;

  @IsString()
  @IsNotEmpty()
  webhook_code: string;

  @IsString()
  @IsOptional()
  item_id: string;

  @IsOptional()
  error: any;
}
