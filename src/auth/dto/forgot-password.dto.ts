/* eslint-disable @typescript-eslint/no-unsafe-call -- class-validator decorators */
import { IsEmail, IsString, Matches } from 'class-validator';

const EMAIL_REGEX = /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i;

export class ForgotPasswordDto {
  @IsString()
  @IsEmail({}, { message: 'Invalid email address' })
  @Matches(EMAIL_REGEX, { message: 'Invalid email address' })
  email: string;
}
