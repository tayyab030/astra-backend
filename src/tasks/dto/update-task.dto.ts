/* eslint-disable @typescript-eslint/no-unsafe-call -- class-validator decorators */
import {
  IsBoolean,
  IsDateString,
  IsIn,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
  ValidateIf,
} from 'class-validator';
import {
  TASK_PRIORITIES,
  TASK_STATUSES,
} from '../constants/task-meta';

export class UpdateTaskDto {
  @IsOptional()
  @IsString()
  @MinLength(1, { message: 'Title is required' })
  @MaxLength(255)
  title?: string;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  description?: string;

  @IsOptional()
  @ValidateIf((_, value) => value !== null && value !== undefined && value !== '')
  @IsDateString({}, { message: 'Due date must be in YYYY-MM-DD format' })
  due_date?: string | null;

  @IsOptional()
  @IsIn(TASK_PRIORITIES, { message: 'Invalid priority' })
  priority?: string;

  @IsOptional()
  @IsIn(TASK_STATUSES, { message: 'Invalid status' })
  status?: string;

  @IsOptional()
  @IsBoolean()
  completed?: boolean;

  @IsOptional()
  @ValidateIf((_, value) => value !== null && value !== undefined && value !== '')
  @IsUUID('4', { message: 'Invalid project id' })
  project_id?: string | null;

  @IsOptional()
  @ValidateIf((_, value) => value !== null && value !== undefined && value !== '')
  @IsUUID('4', { message: 'Invalid goal id' })
  goal_id?: string | null;
}
