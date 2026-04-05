import {
  IsEnum,
  IsNotEmpty,
  IsString,
  Matches,
} from 'class-validator';
import { HstPeriodFrequency } from '../../entities/hst-period.entity';

export class CreateHSTPeriodDto {
  // Date strings in YYYY-MM-DD format
  @IsString()
  @IsNotEmpty()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'period_start must be in YYYY-MM-DD format' })
  period_start: string;

  @IsString()
  @IsNotEmpty()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'period_end must be in YYYY-MM-DD format' })
  period_end: string;

  @IsEnum(HstPeriodFrequency)
  frequency: HstPeriodFrequency;
}
