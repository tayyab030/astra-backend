/* eslint-disable @typescript-eslint/no-unsafe-call -- class-validator decorators */
import { IsIn, IsOptional, IsString, IsUUID, ValidateIf } from 'class-validator';
import { TASK_FILTER_VALUES } from '../constants/task-meta';

export class TasksFilterDto {
  @IsOptional()
  @IsIn(TASK_FILTER_VALUES, { message: 'Invalid filter' })
  filter?: string;

  @IsOptional()
  @IsIn(['week', 'month', 'year'], { message: 'Invalid period' })
  period?: 'week' | 'month' | 'year';

  @IsOptional()
  @IsString()
  @ValidateIf((_, value) => value !== 'none')
  @IsUUID('4', { message: 'Invalid goal id' })
  goal_id?: string;
}
