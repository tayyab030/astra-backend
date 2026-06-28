import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { AuthService } from './auth.service';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';

@Controller('auth/password')
export class PasswordController {
  constructor(private readonly authService: AuthService) {}

  @Post(['forgot', 'forgot/'])
  forgot(@Body() dto: ForgotPasswordDto) {
    return this.authService.requestPasswordReset(dto);
  }

  @Get([':token/status', ':token/status/'])
  status(@Param('token') token: string) {
    return this.authService.getPasswordResetStatus(token);
  }

  @Post(['reset', 'reset/'])
  reset(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto);
  }
}
