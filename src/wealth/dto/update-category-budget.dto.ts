/* eslint-disable @typescript-eslint/no-unsafe-call -- class-validator decorators */
import { Type } from 'class-transformer';
import { IsNumber, Min } from 'class-validator';

export class UpdateCategoryBudgetDto {
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01, { message: 'Limit must be greater than 0' })
  amount: number;
}
