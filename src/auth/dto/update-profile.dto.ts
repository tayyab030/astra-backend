/* eslint-disable @typescript-eslint/no-unsafe-call -- class-validator decorators */
import {
  IsIn,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';
import { TIMEZONE_VALUES } from '../constants/country-currency';

export class UpdateProfileDto {
  @IsOptional()
  @IsString()
  @MinLength(1, { message: 'First name is required' })
  @MaxLength(100)
  first_name?: string;

  @IsOptional()
  @IsString()
  @MinLength(1, { message: 'Last name is required' })
  @MaxLength(100)
  last_name?: string;

  @IsOptional()
  @IsString()
  @Matches(/^[A-Z]{3}$/, {
    message: 'Currency must be a 3-letter ISO code (e.g. USD)',
  })
  currency?: string;

  @IsOptional()
  @IsString()
  @IsIn(TIMEZONE_VALUES, { message: 'Please select a valid timezone' })
  timezone?: string;
}
