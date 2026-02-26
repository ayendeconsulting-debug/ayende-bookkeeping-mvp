import { IsNotEmpty, IsString, IsUUID, IsDate, IsArray, ValidateNested, IsNumber, Min, IsOptional, IsEnum } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateJournalLineDto {
  @IsNumber()
  @Min(1)
  line_number: number;

  @IsUUID()
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
  @IsUUID()
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
  @IsUUID()
  reference_id?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateJournalLineDto)
  lines: CreateJournalLineDto[];
}

export class PostJournalEntryDto {
  @IsUUID()
  journal_entry_id: string;

  @IsUUID()
  posted_by: string;
}
