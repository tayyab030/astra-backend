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

export class GoalsFilterDto {
  @IsOptional()
  @IsIn(['month', 'year'])
  mode?: 'month' | 'year';

  @ValidateIf((dto: GoalsFilterDto) => dto.mode === 'month' || !dto.mode)
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(2000)
  @Max(2100)
  year?: number;

  @ValidateIf((dto: GoalsFilterDto) => dto.mode === 'month' || !dto.mode)
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(12)
  month?: number;

  @ValidateIf((dto: GoalsFilterDto) => dto.mode === 'year')
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(2000)
  @Max(2100)
  start_year?: number;

  @ValidateIf((dto: GoalsFilterDto) => dto.mode === 'year')
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(2000)
  @Max(2100)
  end_year?: number;
}
