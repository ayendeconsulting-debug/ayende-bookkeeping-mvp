import { IsNotEmpty, IsString, IsDate, IsArray, ValidateNested, IsNumber, Min, IsOptional, IsEnum } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateJournalLineDto {
  @IsNumber()
  @Min(1)
  line_number: number;

  @IsString()
  @IsNotEmpty()
  account_id: string;

  @IsNumber()
  @Min(0)
  debit_amount: number;

  @IsNumber()
  @Min(0)
  credit_amount: number;

  @IsOptional()
  @IsString()
  description?: string;
}

export class CreateJournalEntryDto {
  @IsString()
  @IsNotEmpty()
  business_id: string;

  @IsNotEmpty()
  @Type(() => Date)
  @IsDate()
  entry_date: Date;

  @IsNotEmpty()
  @IsString()
  description: string;

  @IsOptional()
  @IsString()
  reference_type?: string;

  @IsOptional()
  @IsString()
  reference_id?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsString()
  reference_number?: string;

  @IsOptional()
  @IsString()
  je_type?: string;

  @IsOptional()
  manual_entry?: boolean;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateJournalLineDto)
  lines: CreateJournalLineDto[];
}

export class PostJournalEntryDto {
  @IsString()
  @IsNotEmpty()
  journal_entry_id: string;

  @IsString()
  @IsNotEmpty()
  posted_by: string;
}
