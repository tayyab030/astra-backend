/* eslint-disable @typescript-eslint/no-unsafe-call -- class-validator decorators */
import { Type } from 'class-transformer';
import {
  IsDateString,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import {
  GOAL_CATEGORY_VALUES,
  GOAL_PRIORITIES,
} from '../constants/goal-categories';

export class UpdateGoalDto {
  @IsOptional()
  @IsString()
  @MinLength(1, { message: 'Title is required' })
  @MaxLength(255)
  title?: string;

  @IsOptional()
  @IsIn(GOAL_CATEGORY_VALUES, { message: 'Invalid category' })
  category?: string;

  @IsOptional()
  @IsIn(GOAL_PRIORITIES, { message: 'Invalid priority' })
  priority?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  motivation?: string | null;

  @IsOptional()
  @IsDateString({}, { message: 'Start date must be in YYYY-MM-DD format' })
  start_date?: string;

  @IsOptional()
  @IsDateString({}, { message: 'Target date must be in YYYY-MM-DD format' })
  target_date?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(100)
  progress?: number;
}
