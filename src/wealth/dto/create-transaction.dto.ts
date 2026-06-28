/* eslint-disable @typescript-eslint/no-unsafe-call -- class-validator decorators */
import { Type } from 'class-transformer';
import {
  IsDateString,
  IsIn,
  IsNumber,
  IsString,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { WEALTH_CATEGORY_VALUES } from '../constants/wealth-categories';

export class CreateTransactionDto {
  @IsString()
  @MinLength(1, { message: 'Description is required' })
  @MaxLength(255)
  description: string;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01, { message: 'Amount must be greater than 0' })
  amount: number;

  @IsIn(WEALTH_CATEGORY_VALUES, { message: 'Invalid category' })
  category: string;

  @IsDateString({}, { message: 'Date must be in YYYY-MM-DD format' })
  date: string;
}
