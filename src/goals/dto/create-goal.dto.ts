/* eslint-disable @typescript-eslint/no-unsafe-call -- class-validator decorators */
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsDateString,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import {
  GOAL_CATEGORY_VALUES,
  GOAL_PRIORITIES,
} from '../constants/goal-categories';

export class CreateGoalMilestoneDto {
  @IsString()
  @MinLength(1, { message: 'Milestone title is required' })
  @MaxLength(255)
  title: string;

  @IsDateString({}, { message: 'Due date must be in YYYY-MM-DD format' })
  due_date: string;
}

export class CreateGoalDto {
  @IsString()
  @MinLength(1, { message: 'Title is required' })
  @MaxLength(255)
  title: string;

  @IsIn(GOAL_CATEGORY_VALUES, { message: 'Invalid category' })
  category: string;

  @IsIn(GOAL_PRIORITIES, { message: 'Invalid priority' })
  priority: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  motivation?: string;

  @IsDateString({}, { message: 'Start date must be in YYYY-MM-DD format' })
  start_date: string;

  @IsDateString({}, { message: 'Target date must be in YYYY-MM-DD format' })
  target_date: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(100)
  progress?: number;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @ValidateNested({ each: true })
  @Type(() => CreateGoalMilestoneDto)
  milestones?: CreateGoalMilestoneDto[];
}
