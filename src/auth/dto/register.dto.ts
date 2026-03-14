/* eslint-disable @typescript-eslint/no-unsafe-call -- class-validator decorators */
import {
  IsBoolean,
  IsEmail,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

const PASSWORD_REGEX = {
  uppercase: /[A-Z]/,
  lowercase: /[a-z]/,
  number: /\d/,
  special: /[!@#$%^&*(),.?":{}|<>]/,
};
const USERNAME_REGEX = /^[a-zA-Z0-9@.+_-]+$/;
const EMAIL_REGEX = /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i;

export class RegisterDto {
  @IsString()
  @MinLength(1, { message: 'First name is required' })
  first_name: string;

  @IsString()
  @MinLength(1, { message: 'Last name is required' })
  last_name: string;

  @IsString()
  @MinLength(3, { message: 'Username must be at least 3 characters' })
  @MaxLength(20, { message: 'Username must be no more than 20 characters' })
  @Matches(USERNAME_REGEX, {
    message:
      'Username can only contain letters, numbers, and @ . + - _ characters',
  })
  username: string;

  @IsEmail({}, { message: 'Invalid email address' })
  @Matches(EMAIL_REGEX, { message: 'Invalid email address' })
  email: string;

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

  @IsBoolean()
  terms: boolean;
}
