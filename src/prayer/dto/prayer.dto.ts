/* eslint-disable @typescript-eslint/no-unsafe-call -- class-validator decorators */
import {
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateIf,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { TRACKABLE_PRAYER_KEYS } from '../prayer.constants';

function nullableNumber({ value }: { value: unknown }) {
  if (value === null || value === undefined || value === '') return value;
  return Number(value);
}

export class PrayerTimingsQueryDto {
  @Type(() => Number)
  @IsNumber()
  @Min(-90)
  @Max(90)
  latitude!: number;

  @Type(() => Number)
  @IsNumber()
  @Min(-180)
  @Max(180)
  longitude!: number;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(23)
  method!: number;

  @IsOptional()
  @IsString()
  @MaxLength(32)
  date?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  label?: string;
}

export class PrayerTimingsByCityQueryDto {
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  city!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(100)
  country!: string;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(23)
  method!: number;

  @IsOptional()
  @IsString()
  @MaxLength(32)
  date?: string;
}

export class UpdatePrayerPreferencesDto {
  @IsOptional()
  @Transform(nullableNumber)
  @ValidateIf((_, value) => value !== null && value !== undefined)
  @IsInt()
  @Min(0)
  @Max(23)
  method?: number | null;

  @IsOptional()
  @Transform(nullableNumber)
  @ValidateIf((_, value) => value !== null && value !== undefined)
  @IsNumber()
  @Min(-90)
  @Max(90)
  latitude?: number | null;

  @IsOptional()
  @Transform(nullableNumber)
  @ValidateIf((_, value) => value !== null && value !== undefined)
  @IsNumber()
  @Min(-180)
  @Max(180)
  longitude?: number | null;

  @IsOptional()
  @ValidateIf((_, value) => value !== null && value !== undefined)
  @IsString()
  @MaxLength(200)
  location_label?: string | null;

  @IsOptional()
  @IsBoolean()
  adhan_enabled?: boolean;

  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsIn([...TRACKABLE_PRAYER_KEYS], { each: true })
  adhan_keys?: string[];
}

export class PrayerDayQueryDto {
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  date!: string;
}

export class PrayerLogsQueryDto {
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  from!: string;

  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  to!: string;
}

export class UpdatePrayerDayDto {
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  date!: string;

  @IsString()
  @IsIn([...TRACKABLE_PRAYER_KEYS])
  prayer_key!: string;

  @IsBoolean()
  completed!: boolean;

  @IsOptional()
  @IsIn(['on_time', 'qaza'])
  status?: 'on_time' | 'qaza';
}
