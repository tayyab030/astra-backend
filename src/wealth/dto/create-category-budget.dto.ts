/* eslint-disable @typescript-eslint/no-unsafe-call -- class-validator decorators */
import { Type } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsNumber,
  Max,
  Min,
  ValidateIf,
} from 'class-validator';
import { WEALTH_EXPENSE_CATEGORY_VALUES } from '../constants/wealth-categories';

export class CreateCategoryBudgetDto {
  @IsIn(WEALTH_EXPENSE_CATEGORY_VALUES, {
    message: 'Invalid expense category',
  })
  category: string;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01, { message: 'Limit must be greater than 0' })
  amount: number;

  @IsIn(['month', 'year'], { message: 'Period type must be month or year' })
  period_type: 'month' | 'year';

  @Type(() => Number)
  @IsInt()
  @Min(2000)
  @Max(2100)
  year: number;

  @ValidateIf((dto: CreateCategoryBudgetDto) => dto.period_type === 'month')
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(12)
  month?: number;
}
