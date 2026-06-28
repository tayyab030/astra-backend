/* eslint-disable @typescript-eslint/no-unsafe-call -- class-validator decorators */
import { Type } from 'class-transformer';
import {
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  Min,
  MinLength,
} from 'class-validator';

export class UpdateSavingDto {
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01, { message: 'Amount must be greater than 0' })
  amount?: number;

  @IsOptional()
  @Matches(/^\d{4}-(0[1-9]|1[0-2])$/, {
    message: 'Month must be in YYYY-MM format',
  })
  month?: string;

  @IsOptional()
  @IsString()
  @MinLength(1, { message: 'Reason is required' })
  reason?: string;
}
