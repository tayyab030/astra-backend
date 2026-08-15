import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import type { AuthenticatedRequest } from '../auth/types/authenticated-request';
import {
  BulkNotesDto,
  CreateNoteDto,
  NotesFilterDto,
  RestoreVersionDto,
  UpdateNoteDto,
} from './dto/notes.dto';
import { NotesService } from './notes.service';

@Controller('notes')
export class NotesController {
  constructor(private readonly notesService: NotesService) {}

  @Get(['', '/'])
  getDashboard(
    @Req() req: AuthenticatedRequest,
    @Query() filter: NotesFilterDto,
  ) {
    return this.notesService.getDashboard(req.user!.sub, filter);
  }

  @Post(['', '/'])
  createNote(@Req() req: AuthenticatedRequest, @Body() dto: CreateNoteDto) {
    return this.notesService.createNote(req.user!.sub, dto);
  }

  @Post(['bulk', 'bulk/'])
  bulkAction(@Req() req: AuthenticatedRequest, @Body() dto: BulkNotesDto) {
    return this.notesService.bulkAction(req.user!.sub, dto);
  }

  @Get([':id', ':id/'])
  getNote(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    return this.notesService.getNote(req.user!.sub, id);
  }

  @Patch([':id', ':id/'])
  updateNote(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() dto: UpdateNoteDto,
  ) {
    return this.notesService.updateNote(req.user!.sub, id, dto);
  }

  @Delete([':id/permanent', ':id/permanent/'])
  permanentDelete(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
  ) {
    return this.notesService.deleteNote(req.user!.sub, id, true);
  }

  @Delete([':id', ':id/'])
  deleteNote(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    return this.notesService.deleteNote(req.user!.sub, id, false);
  }

  @Post([':id/restore', ':id/restore/'])
  restoreNote(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    return this.notesService.restoreNote(req.user!.sub, id);
  }

  @Post([':id/archive', ':id/archive/'])
  archiveNote(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    return this.notesService.archiveNote(req.user!.sub, id);
  }

  @Post([':id/duplicate', ':id/duplicate/'])
  duplicateNote(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    return this.notesService.duplicateNote(req.user!.sub, id);
  }

  @Post([':id/versions/restore', ':id/versions/restore/'])
  restoreVersion(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() dto: RestoreVersionDto,
  ) {
    return this.notesService.restoreVersion(req.user!.sub, id, dto.version_id);
  }
}
