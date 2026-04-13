import {
  IsString,
  IsOptional,
  IsNumber,
  IsArray,
  IsDateString,
  IsEmail,
  IsPositive,
  ValidateNested,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateInvoiceLineItemDto {
  @IsString()
  description: string;

  @IsNumber()
  @IsPositive()
  quantity: number;

  @IsNumber()
  @IsPositive()
  unit_price: number;

  @IsString()
  @IsOptional()
  tax_code_id?: string;

  @IsNumber()
  @IsOptional()
  sort_order?: number;
}

export class CreateInvoiceDto {
  @IsString()
  client_name: string;

  @IsEmail()
  @IsOptional()
  client_email?: string;

  @IsDateString()
  issue_date: string;

  @IsDateString()
  due_date: string;

  @IsString()
  @IsOptional()
  invoice_number?: string; // auto-generated if omitted

  @IsString()
  @IsOptional()
  notes?: string;

  @IsOptional()
  is_recurring?: boolean;

  @IsString()
  @IsOptional()
  recurring_frequency?: string;

  @IsOptional()
  auto_send?: boolean;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateInvoiceLineItemDto)
  line_items: CreateInvoiceLineItemDto[];
}

export class UpdateInvoiceDto {
  @IsString()
  @IsOptional()
  client_name?: string;

  @IsEmail()
  @IsOptional()
  client_email?: string;

  @IsDateString()
  @IsOptional()
  issue_date?: string;

  @IsDateString()
  @IsOptional()
  due_date?: string;

  @IsString()
  @IsOptional()
  notes?: string;

  @IsOptional()
  is_recurring?: boolean;

  @IsString()
  @IsOptional()
  recurring_frequency?: string;

  @IsOptional()
  auto_send?: boolean;

  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => CreateInvoiceLineItemDto)
  line_items?: CreateInvoiceLineItemDto[];
}

export class RecordPaymentDto {
  @IsNumber()
  @IsPositive()
  amount: number;

  @IsDateString()
  payment_date: string;

  // Bank/cash account that received the payment (debit)
  @IsString()
  bank_account_id: string;

  // Revenue or AR account to credit
  @IsString()
  revenue_account_id: string;

  @IsString()
  @IsOptional()
  notes?: string;

  @IsOptional()
  is_recurring?: boolean;

  @IsString()
  @IsOptional()
  recurring_frequency?: string;

  @IsOptional()
  auto_send?: boolean;
}

export class InvoiceFilterDto {
  @IsString()
  @IsOptional()
  status?: string;

  @IsString()
  @IsOptional()
  search?: string;

  @IsNumber()
  @IsOptional()
  @Min(1)
  limit?: number;

  @IsNumber()
  @IsOptional()
  @Min(0)
  offset?: number;
}
