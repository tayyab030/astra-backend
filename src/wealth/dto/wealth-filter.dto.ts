/* eslint-disable @typescript-eslint/no-unsafe-call -- class-validator decorators */
import { Type } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsOptional,
  Max,
  Min,
  ValidateIf,
} from 'class-validator';
import { WEALTH_SCOPES } from '../constants/wealth-scope';

export class WealthFilterDto {
  @IsOptional()
  @IsIn(['month', 'year'])
  mode?: 'month' | 'year';

  @IsOptional()
  @IsIn(WEALTH_SCOPES, { message: 'Scope must be personal or farm' })
  scope?: 'personal' | 'farm';

  @ValidateIf((dto: WealthFilterDto) => dto.mode === 'month' || !dto.mode)
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(2000)
  @Max(2100)
  year?: number;

  @ValidateIf((dto: WealthFilterDto) => dto.mode === 'month' || !dto.mode)
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(12)
  month?: number;

  @ValidateIf((dto: WealthFilterDto) => dto.mode === 'year')
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(2000)
  @Max(2100)
  start_year?: number;

  @ValidateIf((dto: WealthFilterDto) => dto.mode === 'year')
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(2000)
  @Max(2100)
  end_year?: number;
}
