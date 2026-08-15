/* eslint-disable @typescript-eslint/no-unsafe-call -- class-validator decorators */
import {
  IsBoolean,
  IsIn,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { TIMEZONE_VALUES } from '../constants/country-currency';
import { AI_VOICES } from '../constants/ai-voice';
import {
  AI_DATA_SCOPES,
  AI_PERSONALITIES,
} from '../constants/ai-settings';
import { AI_LANGUAGES } from '../constants/ai-language';
import { USER_GENDERS } from '../constants/user-gender';

export const USER_THEMES = [
  'light',
  'mist',
  'dark',
  'neon',
  'ocean',
  'forest',
  'ember',
  'aurora',
] as const;
export type UserTheme = (typeof USER_THEMES)[number];

class ModuleWeightsDto {
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(50)
  productivity?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(50)
  health?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(50)
  wealth?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(50)
  knowledge?: number;
}

class ModuleEnabledDto {
  @IsOptional()
  @IsBoolean()
  tasks?: boolean;

  @IsOptional()
  @IsBoolean()
  wealth?: boolean;

  @IsOptional()
  @IsBoolean()
  health?: boolean;

  @IsOptional()
  @IsBoolean()
  notes?: boolean;

  @IsOptional()
  @IsBoolean()
  analytics?: boolean;
}

export class ModuleSettingsDto {
  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => ModuleWeightsDto)
  weights?: ModuleWeightsDto;

  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => ModuleEnabledDto)
  enabled?: ModuleEnabledDto;
}

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
  @IsIn([...USER_GENDERS], {
    message: 'Please select a valid gender',
  })
  gender?: string;

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

  @IsOptional()
  @IsString()
  @IsIn(USER_THEMES, {
    message: `Theme must be one of: ${USER_THEMES.join(', ')}`,
  })
  theme?: string;

  @IsOptional()
  @IsString()
  @IsIn([...AI_VOICES], {
    message: `AI voice must be one of: ${AI_VOICES.join(', ')}`,
  })
  ai_voice?: string;

  @IsOptional()
  @IsBoolean()
  ai_voice_mode?: boolean;

  @IsOptional()
  @IsString()
  @IsIn([...AI_PERSONALITIES], {
    message: `AI personality must be one of: ${AI_PERSONALITIES.join(', ')}`,
  })
  ai_personality?: string;

  @IsOptional()
  @IsBoolean()
  ai_insights?: boolean;

  @IsOptional()
  @IsString()
  @IsIn([...AI_DATA_SCOPES], {
    message: `AI data scope must be one of: ${AI_DATA_SCOPES.join(', ')}`,
  })
  ai_data_scope?: string;

  @IsOptional()
  @IsString()
  @IsIn([...AI_LANGUAGES], {
    message: 'Please select a valid AI language',
  })
  ai_language?: string;

  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => ModuleSettingsDto)
  module_settings?: ModuleSettingsDto;
}
