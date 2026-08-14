import { Body, Controller, Get, Patch, Req } from '@nestjs/common';
import type { AuthenticatedRequest } from './types/authenticated-request';
import { AuthService } from './auth.service';
import { UpdateProfileDto } from './dto/update-profile.dto';

@Controller('auth/me')
export class MeController {
  constructor(private readonly authService: AuthService) {}

  @Get(['', '/'])
  getMe(@Req() req: AuthenticatedRequest) {
    return this.authService.getMe(req.user!.sub);
  }

  @Patch(['', '/'])
  updateMe(@Req() req: AuthenticatedRequest, @Body() dto: UpdateProfileDto) {
    return this.authService.updateMe(req.user!.sub, dto);
  }
}
