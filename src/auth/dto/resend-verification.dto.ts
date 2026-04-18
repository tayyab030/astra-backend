import { IsString, MinLength } from 'class-validator';

export class ResendVerificationDto {
  @IsString()
  @MinLength(3)
  identifier: string; // email or username
}
