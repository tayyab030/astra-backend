/* eslint-disable @typescript-eslint/no-unsafe-call -- class-validator decorators */
import {
  IsBoolean,
  IsDateString,
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
  ValidateIf,
} from 'class-validator';
import { PROJECT_STATUS_VALUES } from '../constants/project-status';

export class PatchProjectDto {
  @IsOptional()
  @IsString()
  @MinLength(1, { message: 'Title is required' })
  @MaxLength(255)
  title?: string;

  @IsOptional()
  @IsBoolean()
  starred?: boolean;

  @IsOptional()
  @IsIn(PROJECT_STATUS_VALUES, { message: 'Invalid status' })
  status?: string;

  @IsOptional()
  @IsString()
  @MaxLength(32)
  color?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @IsOptional()
  @ValidateIf((_, value) => value !== null && value !== undefined && value !== '')
  @IsDateString({}, { message: 'Due date must be in YYYY-MM-DD format' })
  due_date?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  icon?: string;
}
