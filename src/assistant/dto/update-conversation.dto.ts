/* eslint-disable @typescript-eslint/no-unsafe-call -- class-validator decorators */
import { IsString, MaxLength, MinLength } from 'class-validator';

export class UpdateConversationDto {
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  title!: string;
}
