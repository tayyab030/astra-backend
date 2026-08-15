import { IsString, MinLength } from 'class-validator';

export class ConfirmAccountDeleteDto {
  @IsString()
  @MinLength(10, { message: 'Invalid delete token.' })
  token!: string;
}
