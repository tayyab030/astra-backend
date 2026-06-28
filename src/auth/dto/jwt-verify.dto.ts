import { IsString, MinLength } from 'class-validator';

export class JwtVerifyDto {
  @IsString()
  @MinLength(1, { message: 'Token is required' })
  token: string;
}
