import { Body, Controller, Get, Post, Query, Res } from '@nestjs/common';
import type { Response } from 'express';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { ResendVerificationDto } from './dto/resend-verification.dto';
import {
  verificationErrorPage,
  verificationSuccessPage,
} from './verification-pages';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('users')
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Post('resend-verification')
  resendVerification(@Body() dto: ResendVerificationDto) {
    return this.authService.resendVerification(dto.identifier);
  }

  @Get('verify')
  async verify(@Query('token') token: string, @Res() res: Response) {
    try {
      await this.authService.verifyEmail(token);
      const loginUrl =
        process.env.FRONTEND_LOGIN_URL ??
        process.env.APP_URL ??
        'http://localhost:3000/login';
      return res
        .status(200)
        .type('html')
        .send(verificationSuccessPage(loginUrl.replace(/\/$/, '')));
    } catch {
      return res.status(400).type('html').send(verificationErrorPage());
    }
  }
}
