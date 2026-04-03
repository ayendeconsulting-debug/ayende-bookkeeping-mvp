import { IsString, IsNumber, IsOptional, IsDateString, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateMileageLogDto {
  @IsDateString()
  trip_date: string;

  @IsString()
  start_location: string;

  @IsString()
  end_location: string;

  @IsString()
  purpose: string;

  @IsNumber()
  @Min(0.01)
  @Type(() => Number)
  distance_km: number;
}

export class TaxEstimateQueryDto {
  @IsOptional()
  @IsString()
  year?: string;
}
