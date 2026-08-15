/* eslint-disable @typescript-eslint/no-unsafe-call -- class-validator decorators */
import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class SpeechDto {
  @IsString()
  @MinLength(1)
  @MaxLength(2000)
  text!: string;
}

export class TranscribeJsonDto {
  /** data:audio/...;base64,... or raw base64 */
  @IsString()
  @MinLength(1)
  audio!: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  mime_type?: string;
}
