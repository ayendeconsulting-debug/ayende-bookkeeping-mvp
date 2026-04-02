import { IsArray, IsNotEmpty, IsOptional, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class ChatMessageDto {
  @IsString()
  @IsNotEmpty()
  role: 'user' | 'assistant';

  @IsString()
  @IsNotEmpty()
  content: string;
}

export class AiChatDto {
  // Set from JWT in controller — not validated from request body
  @IsString()
  @IsOptional()
  businessId?: string;

  // Full conversation history — client manages state
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ChatMessageDto)
  messages: ChatMessageDto[];

  // Optional date range for financial context
  @IsString()
  @IsOptional()
  startDate?: string;

  @IsString()
  @IsOptional()
  endDate?: string;
}

export class AiClassifyDto {
  // Set from JWT in controller — not validated from request body
  @IsString()
  @IsOptional()
  businessId?: string;

  @IsString()
  @IsNotEmpty()
  rawTransactionId: string;
}

export class AiAnomalyDto {
  // Set from JWT in controller — not validated from request body
  @IsString()
  @IsOptional()
  businessId?: string;

  @IsString()
  @IsOptional()
  startDate?: string;

  @IsString()
  @IsOptional()
  endDate?: string;
}
