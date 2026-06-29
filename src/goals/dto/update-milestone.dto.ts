/* eslint-disable @typescript-eslint/no-unsafe-call -- class-validator decorators */
import { IsBoolean, IsDateString, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class UpdateMilestoneDto {
  @IsOptional()
  @IsString()
  @MinLength(1, { message: 'Milestone title is required' })
  @MaxLength(255)
  title?: string;

  @IsOptional()
  @IsDateString({}, { message: 'Due date must be in YYYY-MM-DD format' })
  due_date?: string;

  @IsOptional()
  @IsBoolean()
  completed?: boolean;
}
