/* eslint-disable @typescript-eslint/no-unsafe-call -- class-validator decorators */
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateConversationDto {
  @IsOptional()
  @IsString()
  @MaxLength(200)
  title?: string;
}
