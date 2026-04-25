import { IsString, IsNumber, IsIn, Min, Max } from 'class-validator';

export class GetImportUploadUrlDto {
  @IsString()
  file_name: string;

  @IsIn(['csv', 'pdf'])
  file_type: string;

  @IsNumber()
  @Min(1)
  @Max(10 * 1024 * 1024)
  file_size_bytes: number;
}

export class CreateImportBatchDto {
  @IsString()
  file_name: string;

  @IsIn(['csv', 'pdf'])
  file_type: string;

  @IsNumber()
  file_size: number;

  @IsString()
  s3_key: string;

  @IsString()
  s3_bucket: string;

  @IsString()
  source_account_id: string;
}
