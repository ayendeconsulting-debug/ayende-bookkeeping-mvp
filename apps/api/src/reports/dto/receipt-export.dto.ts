import { IsDateString, IsBoolean, IsOptional } from 'class-validator';

/**
 * Phase 31b.2 - DTOs for the receipt export endpoints.
 * Used by the controller (31b.6) and consumed by ReceiptExportService.
 */

export class ReceiptExportPreflightQueryDto {
  @IsDateString()
  startDate: string;

  @IsDateString()
  endDate: string;
}

export class ReceiptExportSubmitDto {
  @IsDateString()
  startDate: string;

  @IsDateString()
  endDate: string;

  @IsOptional()
  @IsBoolean()
  acknowledge_partial?: boolean;
}