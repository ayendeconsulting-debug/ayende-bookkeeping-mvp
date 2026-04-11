import { IsDateString, IsEnum, IsOptional, IsString, IsUUID } from 'class-validator';

export enum ExportFormat {
  PDF = 'pdf',
  CSV = 'csv',
}

export class ReportFilterDto {
  @IsString()
  @IsOptional()
  businessId: string;

  @IsDateString()
  @IsOptional()
  startDate?: string;

  @IsDateString()
  @IsOptional()
  endDate?: string;

  // For balance sheet: point-in-time date
  @IsDateString()
  @IsOptional()
  asOfDate?: string;

  // For general ledger: filter by specific account
  @IsUUID('all')
  @IsOptional()
  accountId?: string;

  @IsEnum(ExportFormat)
  @IsOptional()
  format?: ExportFormat;
}
