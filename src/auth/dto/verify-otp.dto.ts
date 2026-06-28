import { IsString, Length, Matches, MinLength } from 'class-validator';

export class VerifyOtpDto {
  @IsString()
  @MinLength(1, { message: 'User id is required' })
  user_id: string;

  @IsString()
  @Length(6, 6, { message: 'OTP must be exactly 6 digits' })
  @Matches(/^\d{6}$/, { message: 'OTP must contain only digits' })
  otp_code: string;
}
