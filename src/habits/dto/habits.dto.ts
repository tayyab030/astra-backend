import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsDateString,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateIf,
  ValidateNested,
} from 'class-validator';

const FREQUENCIES = ['daily', 'weekly', 'monthly', 'interval', 'custom'] as const;
const TIME_OF_DAY = ['morning', 'afternoon', 'evening', 'anytime'] as const;
const PRIORITIES = ['high', 'medium', 'low'] as const;
const MISS_BEHAVIORS = ['carry', 'reset'] as const;

export class CreateHabitDto {
  @IsString()
  @MaxLength(255)
  name: string;

  @IsOptional()
  @IsString()
  @IsIn([...FREQUENCIES])
  frequency?: string;

  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsInt({ each: true })
  @Min(0, { each: true })
  @Max(6, { each: true })
  repeat_days?: number[];

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(31)
  period_target?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(365)
  interval_days?: number;

  @IsOptional()
  @IsString()
  @IsIn([...TIME_OF_DAY])
  time_of_day?: string;

  @IsOptional()
  @IsString()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/, {
    message: 'reminder_time must be HH:mm',
  })
  reminder_time?: string | null;

  @IsOptional()
  @IsDateString()
  start_date?: string;

  /** Optional stop date; omit or null to continue indefinitely. */
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsDateString()
  end_date?: string | null;

  @IsOptional()
  @IsNumber()
  @Min(1)
  target?: number;

  @IsOptional()
  @IsString()
  @MaxLength(32)
  domain?: string;

  @IsOptional()
  @IsString()
  @IsIn(['boolean', 'count', 'duration'])
  metric_type?: string;

  @IsOptional()
  @IsString()
  @MaxLength(32)
  unit?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  group_key?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  group_name?: string | null;

  @IsOptional()
  @IsString()
  @IsIn([...PRIORITIES])
  priority?: string;

  /** carry = stay due after miss; reset = miss breaks streak, no carry. */
  @IsOptional()
  @IsString()
  @IsIn([...MISS_BEHAVIORS])
  miss_behavior?: string;

  /** @deprecated Use priority. Mapped: false → low, true → high. */
  @IsOptional()
  @IsBoolean()
  is_required?: boolean;
}

export class UpdateHabitDto {
  @IsOptional()
  @IsString()
  @MaxLength(255)
  name?: string;

  @IsOptional()
  @IsString()
  @IsIn([...FREQUENCIES])
  frequency?: string;

  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsInt({ each: true })
  @Min(0, { each: true })
  @Max(6, { each: true })
  repeat_days?: number[];

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(31)
  period_target?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(365)
  interval_days?: number;

  @IsOptional()
  @IsString()
  @IsIn([...TIME_OF_DAY])
  time_of_day?: string;

  @IsOptional()
  @IsString()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/, {
    message: 'reminder_time must be HH:mm',
  })
  reminder_time?: string | null;

  @IsOptional()
  @IsDateString()
  start_date?: string;

  /** Set to stop the habit after this date; null clears and lets it continue. */
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsDateString()
  end_date?: string | null;

  @IsOptional()
  @IsNumber()
  @Min(1)
  target?: number;

  @IsOptional()
  @IsString()
  @MaxLength(32)
  domain?: string;

  @IsOptional()
  @IsString()
  @IsIn(['boolean', 'count', 'duration'])
  metric_type?: string;

  @IsOptional()
  @IsString()
  @MaxLength(32)
  unit?: string | null;

  @IsOptional()
  @IsString()
  @IsIn([...PRIORITIES])
  priority?: string;

  @IsOptional()
  @IsString()
  @IsIn([...MISS_BEHAVIORS])
  miss_behavior?: string;

  /** @deprecated Use priority. Mapped: false → low, true → high. */
  @IsOptional()
  @IsBoolean()
  is_required?: boolean;
}

export class HabitPackItemDto {
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  name: string;

  @IsOptional()
  @IsString()
  @IsIn([...PRIORITIES])
  priority?: string;

  @IsOptional()
  @IsString()
  @IsIn([...MISS_BEHAVIORS])
  miss_behavior?: string;

  /** @deprecated Use priority. */
  @IsOptional()
  @IsBoolean()
  is_required?: boolean;
}

export class CreateHabitPackDto {
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  name: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => HabitPackItemDto)
  items: HabitPackItemDto[];

  @IsOptional()
  @IsString()
  @IsIn([...FREQUENCIES])
  frequency?: string;

  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsInt({ each: true })
  @Min(0, { each: true })
  @Max(6, { each: true })
  repeat_days?: number[];

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(31)
  period_target?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(365)
  interval_days?: number;

  @IsOptional()
  @IsString()
  @IsIn([...TIME_OF_DAY])
  time_of_day?: string;

  @IsOptional()
  @IsString()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/)
  reminder_time?: string | null;

  @IsOptional()
  @IsDateString()
  start_date?: string;

  @IsOptional()
  @IsString()
  @IsIn([...MISS_BEHAVIORS])
  miss_behavior?: string;
}

export class HabitDayQueryDto {
  @IsDateString()
  date: string;
}

export class UpsertHabitLogDto {
  @IsDateString()
  date: string;

  @IsOptional()
  @IsBoolean()
  completed?: boolean;

  /** User marks this day as cannot / will not do. */
  @IsOptional()
  @IsBoolean()
  cannot_do?: boolean;

  /** Mark completion as late (allowed even on the due day). */
  @IsOptional()
  @IsBoolean()
  is_late?: boolean;

  @IsOptional()
  @IsInt()
  @IsIn([-1, 1])
  direction?: -1 | 1;

  @IsOptional()
  @IsNumber()
  @Min(0)
  value?: number;

  @IsOptional()
  @IsNumber()
  @Min(0.5)
  step?: number;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  delay_reason?: string;
}

export class AdjustHabitDto {
  @IsOptional()
  @IsDateString()
  date?: string;

  @IsOptional()
  @IsInt()
  @IsIn([-1, 1])
  direction?: -1 | 1;

  @IsOptional()
  @IsNumber()
  @Min(0)
  value?: number;

  @IsOptional()
  @IsNumber()
  @Min(0.5)
  step?: number;

  @IsOptional()
  @IsBoolean()
  cannot_do?: boolean;

  @IsOptional()
  @IsBoolean()
  is_late?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  delay_reason?: string;
}

export class ToggleHabitDto {
  @IsOptional()
  @IsDateString()
  date?: string;

  @IsOptional()
  @IsBoolean()
  cannot_do?: boolean;

  @IsOptional()
  @IsBoolean()
  is_late?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  delay_reason?: string;
}
