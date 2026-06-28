import { IsString, MinLength } from 'class-validator';

export class JwtRefreshDto {
  @IsString()
  @MinLength(1, { message: 'Refresh token is required' })
  refresh: string;
}
