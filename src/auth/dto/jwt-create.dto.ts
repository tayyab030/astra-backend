import { IsIn, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class JwtCreateDto {
  @IsString()
  @MinLength(1, { message: 'Login is required' })
  login!: string;

  @IsString()
  @MinLength(1, { message: 'Password is required' })
  password!: string;

  /** web | mobile | desktop */
  @IsOptional()
  @IsIn(['web', 'mobile', 'desktop'])
  client_type?: 'web' | 'mobile' | 'desktop';

  /** e.g. windows, macos, ios, android, linux */
  @IsOptional()
  @IsString()
  @MaxLength(32)
  platform?: string;

  /** Human label e.g. "Windows · Chrome" or "iOS · Astra" */
  @IsOptional()
  @IsString()
  @MaxLength(128)
  device_label?: string;

  @IsOptional()
  @IsString()
  @MaxLength(512)
  user_agent?: string;
}
