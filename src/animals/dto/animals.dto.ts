import { Type } from 'class-transformer';
import {
  IsDateString,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import {
  ANIMAL_HEALTH_STATUSES,
  ANIMAL_SEX,
  ANIMAL_SPECIES,
  ANIMAL_VACCINATION_STATUSES,
  GROUP_PURPOSES,
  GROUP_SPECIES,
} from '../constants/animal-constants';

export class CreateAnimalDto {
  @IsString()
  @MinLength(1)
  @MaxLength(64)
  tag: string;

  @IsString()
  @IsIn([...ANIMAL_SPECIES])
  species: string;

  @IsOptional()
  @IsString()
  @MaxLength(128)
  breed?: string | null;

  @IsOptional()
  @IsDateString()
  date_of_birth?: string | null;

  @IsOptional()
  @IsString()
  @IsIn([...ANIMAL_SEX])
  sex?: string | null;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  weight?: number | null;

  @IsOptional()
  @IsString()
  @IsIn([...ANIMAL_HEALTH_STATUSES])
  status?: string;

  @IsOptional()
  @IsString()
  @IsIn([...ANIMAL_VACCINATION_STATUSES])
  vaccination_status?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  price?: number;

  @IsOptional()
  @IsString()
  @MaxLength(8)
  currency?: string;

  @IsOptional()
  @IsUUID()
  group_id?: string | null;

  @IsOptional()
  @IsString()
  notes?: string | null;
}

export class UpdateAnimalDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(64)
  tag?: string;

  @IsOptional()
  @IsString()
  @IsIn([...ANIMAL_SPECIES])
  species?: string;

  @IsOptional()
  @IsString()
  @MaxLength(128)
  breed?: string | null;

  @IsOptional()
  @IsDateString()
  date_of_birth?: string | null;

  @IsOptional()
  @IsString()
  @IsIn([...ANIMAL_SEX])
  sex?: string | null;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  weight?: number | null;

  @IsOptional()
  @IsString()
  @IsIn([...ANIMAL_HEALTH_STATUSES])
  status?: string;

  @IsOptional()
  @IsString()
  @IsIn([...ANIMAL_VACCINATION_STATUSES])
  vaccination_status?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  price?: number;

  @IsOptional()
  @IsString()
  @MaxLength(8)
  currency?: string;

  @IsOptional()
  @IsUUID()
  group_id?: string | null;

  @IsOptional()
  @IsString()
  notes?: string | null;
}

export class CreateAnimalGroupDto {
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  name: string;

  @IsString()
  @IsIn([...GROUP_SPECIES])
  species: string;

  @IsOptional()
  @IsString()
  @MaxLength(128)
  breed?: string | null;

  @Type(() => Number)
  @IsNumber()
  @Min(1)
  count: number;

  @IsOptional()
  @IsDateString()
  date_created?: string | null;

  @IsOptional()
  @IsString()
  @IsIn([...GROUP_PURPOSES])
  production_type?: string | null;

  @IsOptional()
  @IsString()
  @IsIn([...ANIMAL_HEALTH_STATUSES])
  health_status?: string;

  @IsOptional()
  @IsString()
  @IsIn([...ANIMAL_VACCINATION_STATUSES])
  vaccination_status?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  unit_price?: number;

  @IsOptional()
  @IsString()
  @MaxLength(8)
  currency?: string;

  @IsOptional()
  @IsString()
  notes?: string | null;
}

export class UpdateAnimalGroupDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  name?: string;

  @IsOptional()
  @IsString()
  @IsIn([...GROUP_SPECIES])
  species?: string;

  @IsOptional()
  @IsString()
  @MaxLength(128)
  breed?: string | null;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  count?: number;

  @IsOptional()
  @IsDateString()
  date_created?: string | null;

  @IsOptional()
  @IsString()
  @IsIn([...GROUP_PURPOSES])
  production_type?: string | null;

  @IsOptional()
  @IsString()
  @IsIn([...ANIMAL_HEALTH_STATUSES])
  health_status?: string;

  @IsOptional()
  @IsString()
  @IsIn([...ANIMAL_VACCINATION_STATUSES])
  vaccination_status?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  unit_price?: number;

  @IsOptional()
  @IsString()
  @MaxLength(8)
  currency?: string;

  @IsOptional()
  @IsString()
  notes?: string | null;
}
