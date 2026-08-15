import { Type } from 'class-transformer';
import {
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
} from 'class-validator';

export class HealthFilterDto {
  @IsDateString()
  start_date: string;

  @IsDateString()
  end_date: string;

  @IsOptional()
  @IsDateString()
  today_date?: string;
}

export class UpdateHealthProfileDto {
  @IsOptional()
  @IsNumber()
  @Min(100)
  @Max(250)
  height_cm?: number | null;
}

export class UpdateHealthTargetsDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(30)
  water_glasses?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(16)
  sleep_hours?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(600)
  exercise_minutes?: number;
}

export class UpdateTodayMetricsDto {
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(30)
  water_glasses?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(600)
  exercise_minutes?: number;
}

export class ToggleSleepDto {
  /** Client tap time (ISO). Falls back to server now. */
  @IsOptional()
  @IsDateString()
  timestamp?: string;

  /** Client local calendar date for the tap (YYYY-MM-DD). */
  @IsOptional()
  @IsDateString()
  local_date?: string;
}

export class CreateSleepSessionDto {
  @IsString()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/)
  start_time: string;

  @IsString()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/)
  end_time: string;

  /** Calendar day this sleep counts toward (usually wake day). */
  @IsOptional()
  @IsDateString()
  date?: string;
}

export class UpdateSleepSessionDto {
  @IsOptional()
  @IsString()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/)
  start_time?: string;

  @IsOptional()
  @IsString()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/)
  end_time?: string;

  @IsOptional()
  @IsDateString()
  date?: string;
}

export class LogWeightDto {
  @IsNumber()
  @Min(30)
  @Max(300)
  weight_kg: number;

  @IsOptional()
  @IsDateString()
  date?: string;
}

export class CreateWorkoutDto {
  @IsString()
  @MaxLength(64)
  type: string;

  @IsInt()
  @Min(1)
  @Max(600)
  duration: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  calories?: number;

  @IsOptional()
  @IsDateString()
  date?: string;
}

export class SaveMoodDto {
  @IsString()
  @IsIn(['great', 'good', 'okay', 'bad', 'terrible'])
  mood: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;

  @IsOptional()
  @IsDateString()
  date?: string;
}

export class AdjustMetricDto {
  @IsString()
  @IsIn(['water', 'exercise'])
  metric: 'water' | 'exercise';

  @IsInt()
  @IsIn([-1, 1])
  direction: -1 | 1;

  @IsOptional()
  @IsDateString()
  date?: string;
}
