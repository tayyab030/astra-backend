/* eslint-disable @typescript-eslint/no-unsafe-call -- class-validator decorators */
import { IsOptional, IsString, IsUUID, MaxLength, MinLength } from 'class-validator';

export class SendMessageDto {
  @IsOptional()
  @IsUUID()
  conversation_id?: string;

  @IsString()
  @MinLength(1)
  @MaxLength(8000)
  message!: string;
}
