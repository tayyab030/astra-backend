import { IsString, MinLength } from 'class-validator';

export class ResendOtpDto {
  @IsString()
  @MinLength(1, { message: 'User id is required' })
  user_id: string;
}
