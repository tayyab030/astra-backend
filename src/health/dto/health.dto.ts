import { Type } from 'class-transformer';
import {
  IsDateString,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
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
  @IsNumber()
  @Min(0)
  @Max(16)
  sleep_hours?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(600)
  exercise_minutes?: number;
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

export class CreateHabitDto {
  @IsString()
  @MaxLength(255)
  name: string;

  @IsOptional()
  @IsString()
  @IsIn(['daily', 'weekly', 'custom'])
  frequency?: string;

  @IsOptional()
  @IsNumber()
  @Min(1)
  target?: number;
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
  @IsIn(['water', 'sleep', 'exercise'])
  metric: 'water' | 'sleep' | 'exercise';

  @IsInt()
  @IsIn([-1, 1])
  direction: -1 | 1;

  @IsOptional()
  @IsDateString()
  date?: string;
}
