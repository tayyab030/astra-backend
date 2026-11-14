import { Type } from 'class-transformer';
import {
  IsDateString,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
} from 'class-validator';
import {
  PRODUCTION_GRADES,
  PRODUCTION_PRODUCTIVITY,
  PRODUCTION_SESSIONS,
  PRODUCTION_TYPES,
} from '../constants/production-constants';

export class CreateProductionDto {
  @IsString()
  @IsIn([...PRODUCTION_TYPES])
  type: string;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  quantity: number;

  @IsOptional()
  @IsString()
  @MaxLength(16)
  unit?: string | null;

  @IsDateString()
  date: string;

  @IsOptional()
  @IsString()
  @MaxLength(32)
  time?: string | null;

  @IsOptional()
  @IsUUID()
  animal_id?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  animal_tag?: string | null;

  @IsOptional()
  @IsUUID()
  group_id?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  group_name?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(128)
  breed?: string | null;

  @IsOptional()
  @IsString()
  @IsIn([...PRODUCTION_SESSIONS])
  session?: string | null;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  fat_percentage?: number | null;

  @IsOptional()
  @IsString()
  @IsIn([...PRODUCTION_GRADES])
  quality_grade?: string | null;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  broken_count?: number | null;

  @IsOptional()
  @IsString()
  @IsIn([...PRODUCTION_PRODUCTIVITY])
  productivity?: string | null;

  @IsOptional()
  @IsString()
  notes?: string | null;
}

export class UpdateProductionDto {
  @IsOptional()
  @IsString()
  @IsIn([...PRODUCTION_TYPES])
  type?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  quantity?: number;

  @IsOptional()
  @IsString()
  @MaxLength(16)
  unit?: string | null;

  @IsOptional()
  @IsDateString()
  date?: string;

  @IsOptional()
  @IsString()
  @MaxLength(32)
  time?: string | null;

  @IsOptional()
  @IsUUID()
  animal_id?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  animal_tag?: string | null;

  @IsOptional()
  @IsUUID()
  group_id?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  group_name?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(128)
  breed?: string | null;

  @IsOptional()
  @IsString()
  @IsIn([...PRODUCTION_SESSIONS])
  session?: string | null;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  fat_percentage?: number | null;

  @IsOptional()
  @IsString()
  @IsIn([...PRODUCTION_GRADES])
  quality_grade?: string | null;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  broken_count?: number | null;

  @IsOptional()
  @IsString()
  @IsIn([...PRODUCTION_PRODUCTIVITY])
  productivity?: string | null;

  @IsOptional()
  @IsString()
  notes?: string | null;
}
