/* eslint-disable @typescript-eslint/no-unsafe-call -- class-validator decorators */
import { Type } from 'class-transformer';
import {
  IsNumber,
  IsString,
  Matches,
  Min,
  MinLength,
} from 'class-validator';

export class WithdrawSavingDto {
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01, { message: 'Amount must be greater than 0' })
  amount: number;

  @Matches(/^\d{4}-(0[1-9]|1[0-2])$/, {
    message: 'Month must be in YYYY-MM format',
  })
  month: string;

  @IsString()
  @MinLength(1, { message: 'Reason is required' })
  reason: string;
}
