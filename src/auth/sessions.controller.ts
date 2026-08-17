import {
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Req,
} from '@nestjs/common';
import type { AuthenticatedRequest } from './types/authenticated-request';
import { AuthService } from './auth.service';

@Controller('auth/sessions')
export class SessionsController {
  constructor(private readonly authService: AuthService) {}

  @Get(['', '/'])
  listSessions(@Req() req: AuthenticatedRequest) {
    return this.authService.listSessions(req.user!.sub, req.user!.sid);
  }

  @Delete([':id', ':id/'])
  revokeSession(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.authService.revokeSession(req.user!.sub, id);
  }

  @Post(['logout-all', 'logout-all/'])
  logoutAll(@Req() req: AuthenticatedRequest) {
    return this.authService.revokeAllSessions(req.user!.sub);
  }
}
