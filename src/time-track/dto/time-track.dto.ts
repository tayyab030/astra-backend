/* eslint-disable @typescript-eslint/no-unsafe-call -- class-validator decorators */
import {
  IsBoolean,
  IsDateString,
  IsInt,
  IsISO8601,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  ValidateIf,
} from 'class-validator';

export class TimeTrackFilterDto {
  @IsDateString()
  start_date: string;

  @IsDateString()
  end_date: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  search?: string;
}

export class CreateTimeEntryDto {
  @IsUUID()
  task_id: string;

  @IsInt()
  @Min(1)
  duration_seconds: number;

  @IsISO8601()
  start_time: string;

  @IsOptional()
  @IsISO8601()
  end_time?: string;

  /** Local calendar date (yyyy-MM-dd) — must match tracked task date */
  @IsOptional()
  @IsDateString()
  entry_date?: string;
}

export class AddTrackedTaskDto {
  @IsUUID()
  task_id: string;

  @IsOptional()
  @IsDateString()
  track_date?: string;
}

export class UpdateTimeTrackSettingsDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(168)
  hours_per_week?: number;

  @IsOptional()
  @IsBoolean()
  activity_bar_visible?: boolean;

  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsUUID()
  last_selected_task_id?: string | null;
}

export class RemoveTrackedTaskQueryDto {
  @IsOptional()
  @IsDateString()
  track_date?: string;
}
