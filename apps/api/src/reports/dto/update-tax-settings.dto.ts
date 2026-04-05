import { IsEnum, IsOptional, IsString, Matches, MaxLength } from 'class-validator';
import { HstReportingFrequency } from '../../entities/business.entity';

const VALID_PROVINCE_CODES = [
  'AB', 'BC', 'MB', 'NB', 'NL', 'NS', 'NT', 'NU', 'ON', 'PE', 'QC', 'SK', 'YT',
];

export class UpdateTaxSettingsDto {
  @IsString()
  @IsOptional()
  @Matches(/^[A-Z]{2}$/, { message: 'province_code must be a 2-letter uppercase province code' })
  province_code?: string;

  // CRA Business Number format: 9 digits + RT + 4 digits (e.g. 123456789RT0001)
  // Also accept 9-digit BN alone for flexibility
  @IsString()
  @IsOptional()
  @MaxLength(20)
  hst_registration_number?: string;

  @IsEnum(HstReportingFrequency)
  @IsOptional()
  hst_reporting_frequency?: HstReportingFrequency;
}
