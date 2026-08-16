import { IsIn, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class JwtRefreshDto {
  @IsString()
  @MinLength(1, { message: 'Refresh token is required' })
  refresh!: string;

  @IsOptional()
  @IsIn(['web', 'mobile', 'desktop'])
  client_type?: 'web' | 'mobile' | 'desktop';

  @IsOptional()
  @IsString()
  @MaxLength(32)
  platform?: string;

  @IsOptional()
  @IsString()
  @MaxLength(128)
  device_label?: string;

  @IsOptional()
  @IsString()
  @MaxLength(512)
  user_agent?: string;
}
