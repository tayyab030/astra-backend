/* eslint-disable @typescript-eslint/no-unsafe-call -- class-validator decorators */
import { IsString, Matches, MinLength } from 'class-validator';

const PASSWORD_REGEX = {
  uppercase: /[A-Z]/,
  lowercase: /[a-z]/,
  number: /\d/,
  special: /[!@#$%^&*(),.?":{}|<>]/,
};

export class ResetPasswordDto {
  @IsString()
  @MinLength(1, { message: 'Reset token is required' })
  token: string;

  @IsString()
  @MinLength(8, { message: 'Password must be at least 8 characters' })
  @Matches(PASSWORD_REGEX.uppercase, {
    message: 'Password must contain at least 1 uppercase letter',
  })
  @Matches(PASSWORD_REGEX.lowercase, {
    message: 'Password must contain at least 1 lowercase letter',
  })
  @Matches(PASSWORD_REGEX.number, {
    message: 'Password must contain at least 1 number',
  })
  @Matches(PASSWORD_REGEX.special, {
    message: 'Password must contain at least 1 special character',
  })
  password: string;

  @IsString()
  @MinLength(8, { message: 'Confirm password must be at least 8 characters' })
  @Matches(PASSWORD_REGEX.uppercase, {
    message: 'Confirm password must contain at least 1 uppercase letter',
  })
  @Matches(PASSWORD_REGEX.lowercase, {
    message: 'Confirm password must contain at least 1 lowercase letter',
  })
  @Matches(PASSWORD_REGEX.number, {
    message: 'Confirm password must contain at least 1 number',
  })
  @Matches(PASSWORD_REGEX.special, {
    message: 'Confirm password must contain at least 1 special character',
  })
  confirmPassword: string;
}
