/* eslint-disable @typescript-eslint/no-unsafe-call -- class-validator decorators */
import { Type } from 'class-transformer';
import {
  IsDateString,
  IsIn,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { WEALTH_SCOPES } from '../constants/wealth-scope';

export class UpdateTransactionDto {
  @IsOptional()
  @IsString()
  @MinLength(1, { message: 'Description is required' })
  @MaxLength(255)
  description?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01, { message: 'Amount must be greater than 0' })
  amount?: number;

  @IsOptional()
  @IsString()
  @MinLength(1)
  category?: string;

  @IsOptional()
  @IsDateString({}, { message: 'Date must be in YYYY-MM-DD format' })
  date?: string;

  @IsOptional()
  @IsIn(WEALTH_SCOPES, { message: 'Scope must be personal or farm' })
  scope?: 'personal' | 'farm';

  @IsOptional()
  @IsObject()
  meta?: Record<string, unknown> | null;
}
