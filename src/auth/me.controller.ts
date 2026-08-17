import { Body, Controller, Get, Patch, Post, Req } from '@nestjs/common';
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

  @Post(['delete-account', 'delete-account/'])
  requestDeleteAccount(@Req() req: AuthenticatedRequest) {
    return this.authService.requestAccountDeletion(req.user!.sub);
  }

  /** Settings → Change Password. Same TEMPORARY_EMAIL_FLOW as public forgot. */
  @Post(['forgot-password', 'forgot-password/'])
  requestForgotPassword(@Req() req: AuthenticatedRequest) {
    return this.authService.requestPasswordResetForAuthenticatedUser(
      req.user!.sub,
    );
  }
}
