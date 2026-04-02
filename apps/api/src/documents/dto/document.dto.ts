import {
  IsString,
  IsOptional,
  IsNumber,
  IsPositive,
  IsIn,
} from 'class-validator';

export class GetUploadUrlDto {
  @IsString()
  file_name: string;

  @IsString()
  @IsIn(['pdf', 'jpg', 'jpeg', 'png'])
  file_type: string;

  @IsNumber()
  @IsPositive()
  file_size_bytes: number;

  // Link to raw_transaction or journal_entry (at least one required)
  @IsString()
  @IsOptional()
  raw_transaction_id?: string;

  @IsString()
  @IsOptional()
  journal_entry_id?: string;
}

export class SaveDocumentDto {
  @IsString()
  s3_key: string;

  @IsString()
  s3_bucket: string;

  @IsString()
  file_name: string;

  @IsString()
  file_type: string;

  @IsNumber()
  @IsPositive()
  file_size_bytes: number;

  @IsString()
  @IsOptional()
  raw_transaction_id?: string;

  @IsString()
  @IsOptional()
  journal_entry_id?: string;
}
