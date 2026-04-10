import {
  IsString,
  IsNumber,
  IsOptional,
  IsDateString,
  IsUUID,
  Min,
  ValidateIf,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateBudgetCategoryDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  monthly_target?: number;

  @IsOptional()
  @IsString()
  color?: string;
}

export class UpdateBudgetCategoryDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  monthly_target?: number;

  @IsOptional()
  @IsString()
  color?: string;
}

export class CreateSavingsGoalDto {
  @IsString()
  name: string;

  @IsNumber()
  @Min(0.01)
  @Type(() => Number)
  target_amount: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  current_amount?: number;

  @IsOptional()
  @IsDateString()
  target_date?: string;

  @IsOptional()
  @IsString()
  linked_account_id?: string;
}

export class UpdateSavingsGoalDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  target_amount?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  current_amount?: number;

  @IsOptional()
  @IsDateString()
  target_date?: string;

  @IsOptional()
  @IsString()
  status?: string;
}

export class ConfirmDetectionDto {
  @IsString()
  key: string;

  @IsString()
  merchant: string;

  @IsNumber()
  @Type(() => Number)
  amount: number;

  @IsString()
  frequency: string;

  @IsString()
  last_date: string;

  @IsString()
  next_date: string;

  @IsString()
  type: string;

  @IsNumber()
  @Type(() => Number)
  occurrence_count: number;
}

export class DismissDetectionDto {
  @IsString()
  key: string;
}

export class SnoozeReminderDto {
  @IsString()
  key: string;

  @IsString()
  due_date: string;

  @IsString()
  snoozed_until: string;
}

export class DismissReminderDto {
  @IsString()
  key: string;

  @IsString()
  due_date: string;
}

// â”€â”€â”€ Phase 17: Personal Category Assignment â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export class AssignPersonalCategoryDto {
  // category_id can be a UUID string to assign, or null to clear
  @ValidateIf((o) => o.category_id !== null)
  @IsUUID()
  category_id: string | null;
}



