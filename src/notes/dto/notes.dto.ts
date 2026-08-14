/* eslint-disable @typescript-eslint/no-unsafe-call */
import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import {
  NOTE_PRIORITIES,
  NOTE_SORT_FIELDS,
  NOTE_STATUSES,
  NOTE_TYPES,
  NOTE_VISIBILITIES,
} from '../constants/note-meta';

export class NotesFilterDto {
  @IsOptional()
  @IsString()
  active_tab?: string;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsString()
  tag?: string;

  @IsOptional()
  @IsIn([...NOTE_PRIORITIES, 'all'])
  priority?: string;

  @IsOptional()
  @IsIn([...NOTE_STATUSES, 'all'])
  status?: string;

  @IsOptional()
  @IsString()
  sidebar_filter?: string;

  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  favorite?: boolean;

  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  has_reminder?: boolean;

  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  has_attachment?: boolean;

  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  ai_generated?: boolean;

  @IsOptional()
  @IsIn(NOTE_SORT_FIELDS)
  sort_field?: string;

  @IsOptional()
  @IsIn(['asc', 'desc'])
  sort_order?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  page_size?: number;
}

export class CreateNoteDto {
  @IsString()
  @MinLength(1, { message: 'Title is required' })
  @MaxLength(500)
  title: string;

  @IsOptional()
  @IsString()
  content?: string;

  @IsIn(NOTE_TYPES, { message: 'Invalid note type' })
  note_type: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  category?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @IsOptional()
  @IsIn(NOTE_PRIORITIES)
  priority?: string;

  @IsOptional()
  @IsBoolean()
  is_favorite?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(32)
  color?: string;

  @IsOptional()
  @IsIn(NOTE_STATUSES)
  status?: string;

  @IsOptional()
  @IsString()
  reminder?: string;

  @IsOptional()
  @IsArray()
  linked_items?: Record<string, unknown>[];

  @IsOptional()
  @IsIn(NOTE_VISIBILITIES)
  visibility?: string;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}

export class UpdateNoteDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(500)
  title?: string;

  @IsOptional()
  @IsString()
  content?: string;

  @IsOptional()
  @IsIn(NOTE_TYPES)
  note_type?: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  category?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @IsOptional()
  @IsIn(NOTE_PRIORITIES)
  priority?: string;

  @IsOptional()
  @IsBoolean()
  is_favorite?: boolean;

  @IsOptional()
  @IsBoolean()
  is_pinned?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(32)
  color?: string;

  @IsOptional()
  @IsIn(NOTE_STATUSES)
  status?: string;

  @IsOptional()
  @IsString()
  reminder?: string | null;

  @IsOptional()
  @IsArray()
  linked_items?: Record<string, unknown>[];

  @IsOptional()
  @IsArray()
  attachments?: Record<string, unknown>[];

  @IsOptional()
  @IsIn(NOTE_VISIBILITIES)
  visibility?: string;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}

export class BulkNotesDto {
  @IsArray()
  @IsUUID('4', { each: true })
  ids: string[];

  @IsIn(['archive', 'delete', 'favorite', 'tag'])
  action: string;

  @IsOptional()
  @IsString()
  tag?: string;

  @IsOptional()
  @IsBoolean()
  permanent?: boolean;
}

export class RestoreVersionDto {
  @IsUUID('4')
  version_id: string;
}
